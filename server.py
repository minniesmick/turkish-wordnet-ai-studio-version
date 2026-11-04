#!/usr/bin/env python3
"""Türkçe WordNet (KeNet) + İngilizce WordNet (PWN 3.1) için yerel arama sunucusu.

Bağımlılık yok, sadece Python standart kütüphanesi:  python3 server.py

Veri setleri (data/ klasörü, StarlangSoftware/TurkishWordNet reposundan):
  kenet : src/main/resources/turkish_wordnet.xml           (güncel KeNet, ilişkiler + İngilizce bağlantılar)
  en    : src/main/resources/english_wordnet_version_31.xml (Princeton WordNet 3.1, ilişkiler)
  1998  : turkish1998_wordnet.xml                           (1998 sözlük sürümü, sadece tanım/örnek)
"""
import gzip
import json
import math
import os
import random
import re
import shutil
import socket
import subprocess
import threading
import time
import xml.etree.ElementTree as ET
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "data")
STATIC = os.path.join(ROOT, "static")

FILES = {"kenet": "turkish_wordnet.xml",
         "en": "english_wordnet_version_31.xml",
         "1998": "turkish1998_wordnet.xml"}

_FOLD = str.maketrans("çğıöşüâîû", "cgiosuaiu")


def norm(s, fold):
    """Türkçe'ye uygun küçük harf (İ→i, I→ı); fold ile aksansız hal.
    Karakter sayısı korunur, bu yüzden vurgu aralıkları orijinal metne uyar."""
    s = s.replace("İ", "i").replace("I", "ı").lower()
    return s.translate(_FOLD) if fold else s


class DS:
    def __init__(self, key):
        self.key, self.syn, self.idx = key, [], {}
        self._arr, self._lidx, self._lock = {}, {}, threading.Lock()

    def load(self):
        for _, el in ET.iterparse(os.path.join(DATA, FILES[self.key])):
            if el.tag != "SYNSET":
                continue
            lits, sr, ilr, lsr = [], [], [], []
            syn = el.find("SYNONYM")
            for l in (syn if syn is not None else []):
                if l.tag == "LITERAL":
                    sn = (l.findtext("SENSE") or "0").strip()
                    lits.append(((l.text or "").strip(), int(sn) if sn.isdigit() else 0))
                    for c in l:  # sözcük düzeyindeki ilişkiler (İngilizce: zıt anlamlı, türetme)
                        if c.tag == "SR":
                            lsr.append(((c.text or "").strip(), (c.findtext("TYPE") or "").strip()))
            for c in el:  # sadece synset düzeyindeki ilişkiler (sözcük düzeyindekiler hariç)
                if c.tag == "SR":
                    sr.append(((c.text or "").strip(), (c.findtext("TYPE") or "").strip()))
                elif c.tag == "ILR":
                    ilr.append(((c.text or "").strip(), (c.findtext("TYPE") or "").strip()))
            ex = (el.findtext("EXAMPLE") or "").strip()
            self.idx[(el.findtext("ID") or "").strip()] = len(self.syn)
            self.syn.append({
                "id": (el.findtext("ID") or "").strip(), "pos": (el.findtext("POS") or "").strip(),
                "lits": lits, "d": (el.findtext("DEF") or "").strip(),
                "ex": [e.strip() for e in ex.split("|") if e.strip()] if ex else [],
                "sr": sr, "ilr": ilr, "lsr": lsr, "wiki": (el.findtext("WIKI") or "").strip(),
            })
            el.clear()

    def arrays(self, fold):
        """Normalize edilmiş metinler; ilk kullanımda üretilir."""
        with self._lock:
            if fold not in self._arr:
                self._arr[fold] = (
                    [[norm(w, fold) for w, _ in s["lits"]] for s in self.syn],
                    [norm(s["d"], fold) for s in self.syn],
                    [[norm(e, fold) for e in s["ex"]] for s in self.syn],
                )
            return self._arr[fold]
    def lindex(self, fold):
        """normalize sözcük -> [synset indeksleri] (ilk kullanımda üretilir)"""
        nl = self.arrays(fold)[0]
        with self._lock:
            if fold not in self._lidx:
                d = {}
                for i, ws in enumerate(nl):
                    for w in ws:
                        d.setdefault(w, []).append(i)
                self._lidx[fold] = d
            return self._lidx[fold]


DSS = {k: DS(k) for k in FILES}
REV = {}  # İngilizce synset id -> [kenet indeksleri]
READY = threading.Event()


def load_all():
    for k, d in DSS.items():
        t0 = time.time()
        d.load()
        print(f"{k}: {len(d.syn):,} synset ({time.time() - t0:.1f} sn)", flush=True)
    for j, s in enumerate(DSS["kenet"].syn):
        for eid, _ in s["ilr"]:
            REV.setdefault(eid, []).append(j)
    load_srl()
    for fn in (load_wn31_extra, load_semcor, load_senseval, load_verbnet, load_fnlu):
        try:
            fn()
        except FileNotFoundError as e:   # ek veri dosyası yoksa ilgili özellik devre dışı kalır
            print(f"  atlandı: {fn.__name__} ({os.path.basename(str(e.filename))} yok — scripts/build_nltk.py çalıştır)", flush=True)
    READY.set()
    print("hazır", flush=True)


# ---------------------------------------------------------------------- arama
def find_all(text, needle):
    out, i = [], text.find(needle)
    while i != -1 and needle:
        out.append([i, i + len(needle)])
        i = text.find(needle, i + len(needle))
    return out


def parse_sense(v):
    """'3' -> tam 3, '6+' -> en az 6, '' -> filtre yok."""
    v = (v or "").strip()
    try:
        return None if not v else ((int(v[:-1]), True) if v.endswith("+") else (int(v), False))
    except ValueError:
        return None


def sense_ok(sn, flt):
    return flt is None or (sn >= flt[0] if flt[1] else sn == flt[0])


def match_word(t, nq, mode):
    """Eşleşirse (sıra, [başlangıç, bitiş]) döndürür."""
    if not nq:
        return (0, None)
    if mode == "exact":
        return (0, [0, len(t)]) if t == nq else None
    if mode == "prefix":
        return (1, [0, len(nq)]) if t.startswith(nq) else None
    if mode == "suffix":
        return (2, [len(t) - len(nq), len(t)]) if t.endswith(nq) else None
    if mode == "token":  # çok sözcüklü ifadelerde tek sözcük olarak geçer
        pos = 0
        for tok in t.split(" "):
            if tok == nq:
                return (1, [pos, pos + len(nq)])
            pos += len(tok) + 1
        return None
    i = t.find(nq)  # contains
    return (3, [i, i + len(nq)]) if i != -1 else None


def search(ds, p):
    q = p.get("q", [""])[0].strip()
    field = p.get("field", ["word"])[0]
    mode = p.get("mode", ["exact"])[0]
    fold = 1 if p.get("fold", ["0"])[0] == "1" else 0
    pos_sel = {x for x in p.get("pos", [""])[0].split(",") if x}
    sflt = parse_sense(p.get("sense", [""])[0])
    lex = p.get("lex", [""])[0]
    need_ex = p.get("example", ["0"])[0] == "1"
    offset = max(0, int(p.get("offset", ["0"])[0] or 0))
    limit = min(100, max(1, int(p.get("limit", ["30"])[0] or 30)))
    nq = norm(q, fold)
    NL, ND, NE = ds.arrays(fold)

    hits = []
    for i, s in enumerate(ds.syn):
        if need_ex and not s["ex"]:
            continue
        hl = {}
        if field == "word":
            best, lm = None, {}
            for k, (_, sn) in enumerate(s["lits"]):
                if not sense_ok(sn, sflt):
                    continue
                m = match_word(NL[i][k], nq, mode)
                if m is None:
                    continue
                lm[k] = m[1]
                rank = (m[0], len(NL[i][k]), sn)
                if best is None or rank < best:
                    best = rank
            if best is None:
                continue
            hl["lits"] = lm
        else:
            if sflt is not None and not any(sense_ok(sn, sflt) for _, sn in s["lits"]):
                continue
            if field == "def":
                r = find_all(ND[i], nq) if nq else []
                if nq and not r:
                    continue
                best, hl["def"] = ((r[0][0] if r else 0), len(s["d"]), 0), r
            elif field == "example":
                er = {}
                if nq:
                    for k, t in enumerate(NE[i]):
                        r = find_all(t, nq)
                        if r:
                            er[k] = r
                    if not er:
                        continue
                best, hl["ex"] = (min(er) if er else 0, len(s["d"]), 0), er
            else:  # id (KeNet'te bağlı İngilizce ENG31-... kimlikleri de aranır)
                ids = [s["id"].lower()] + [e.lower() for e, _ in s["ilr"]]
                pos_ = [x.find(nq) for x in ids if nq in x] if nq else [0]
                if not pos_:
                    continue
                best = (min(pos_), len(s["id"]), 0)
        hits.append((best, i, hl))

    facets, lexf = {}, {}
    for _, i, _ in hits:
        facets[ds.syn[i]["pos"]] = facets.get(ds.syn[i]["pos"], 0) + 1
        if ds.key == "en" and ds.syn[i].get("lx"):
            lexf[ds.syn[i]["lx"]] = lexf.get(ds.syn[i]["lx"], 0) + 1
    if lex:
        hits = [h for h in hits if ds.syn[h[1]].get("lx") == lex]
    if pos_sel:
        hits = [h for h in hits if ds.syn[h[1]]["pos"] in pos_sel]
    if nq:
        hits.sort(key=lambda h: (h[0], h[1]))
    return {"total": len(hits), "facets": facets, "lexf": lexf,
            "results": [view(ds, i, hl) for _, i, hl in hits[offset:offset + limit]]}


# ------------------------------------------------------------------- görünümler
def brief(ds, i, n=4):
    s = ds.syn[i]
    return {"id": s["id"], "pos": s["pos"], "lits": [{"w": w, "s": sn} for w, sn in s["lits"][:n]],
            "more": max(0, len(s["lits"]) - n), "d": s["d"][:140]}


def view(ds, i, hl=None):
    """Liste kartı: sözcükler, tanım, örnekler ve karşı dildeki kısa bağlantılar."""
    s, hl = ds.syn[i], hl or {}
    lm, em = hl.get("lits", {}), hl.get("ex", {})
    v = {
        "id": s["id"], "pos": s["pos"],
        "lits": [{"w": w, "s": sn, "m": lm.get(k)} for k, (w, sn) in enumerate(s["lits"])],
        "def": s["d"], "dm": hl.get("def", []),
        "ex": [{"t": e, "m": em.get(k, [])} for k, e in enumerate(s["ex"])],
        "rc": len(s["sr"]), "wiki": s["wiki"] or None, "x": [], "xn": 0,
    }
    if s.get("cnt"):
        for k, l in enumerate(v["lits"]):
            l["c"] = s["cnt"][k]
    if s.get("lx"):
        v["lx"] = s["lx"]
    if s.get("vf"):
        v["vf"] = s["vf"]
    ps = parents(ds, i)
    v["h"] = [w for w, _ in ds.syn[ps[0]]["lits"][:2]] if ps else []
    if ds.key == "kenet":
        v["pb"] = i in PB_TR_IDX
        v["fr"] = KE_FN.get(i, [])[:4]
    if ds.key == "kenet":  # Türkçe -> İngilizce karşılıklar
        en = DSS["en"]
        v["x"] = [{"id": eid, "w": [w for w, _ in en.syn[en.idx[eid]]["lits"][:3]]}
                  for eid, _ in s["ilr"] if eid in en.idx][:3]
        v["xn"] = len(s["ilr"])
    elif ds.key == "en":  # İngilizce -> Türkçe karşılıklar
        tr, ke = REV.get(s["id"], []), DSS["kenet"]
        v["x"] = [{"id": ke.syn[j]["id"], "w": [w for w, _ in ke.syn[j]["lits"][:3]]} for j in tr[:4]]
        v["xn"] = len(tr)
    return v


def detail(ds, sid):
    """Bir synset için çözülmüş ilişkiler, tüm üst kavram yolları ve karşı dil bağlantıları."""
    i = ds.idx.get(sid)
    if i is None:
        return None
    s = ds.syn[i]
    groups = {}
    for tid, typ in s["sr"] + s["lsr"]:  # synset düzeyi + sözcük düzeyi (zıt anlamlı, türetme)
        j = ds.idx.get(tid)
        if j is not None and j != i and j not in groups.setdefault(typ, []):
            groups[typ].append(j)
    rels = [{"type": t, "n": len(js), "items": [brief(ds, j) for j in js[:40]]} for t, js in groups.items()]
    paths = [[brief(ds, j, 2) for j in pth] for pth in paths_up(ds, i)]

    cross, label = [], None
    if ds.key == "kenet":
        en = DSS["en"]
        label = "en"
        cross = [dict(brief(en, en.idx[eid], 6), t=typ) for eid, typ in s["ilr"] if eid in en.idx]
    elif ds.key == "en":
        ke = DSS["kenet"]
        label = "kenet"
        cross = [brief(ke, j, 6) for j in REV.get(s["id"], [])]
    srl = None
    if ds.key == "kenet" and (i in PB_TR_IDX or i in KE_FN):
        srl = {"args": PB_TR_IDX[i]["args"] if i in PB_TR_IDX else None, "frames": KE_FN.get(i, [])}
    return {"pos": s["pos"], "self": view(ds, i), "ds": ds.key, "rels": rels, "paths": paths, "cross": cross[:20],
            "cross_ds": label, "srl": srl}


# ------------------------------------------------- hiyerarşi, benzerlik, WSD, quiz
PARENT_T = ("HYPERNYM", "INSTANCE_HYPERNYM")


def parents(ds, i):
    out = []
    for t, ty in ds.syn[i]["sr"]:
        if ty in PARENT_T:
            j = ds.idx.get(t)
            if j is not None:
                out.append(j)
    return out


def ancestors(ds, i):
    """i'den yukarı BFS: ({düğüm: uzaklık}, {düğüm: nereden gelindi})"""
    dist, prev, q = {i: 0}, {}, [i]
    for cur in q:
        for p in parents(ds, cur):
            if p not in dist:
                dist[p], prev[p] = dist[cur] + 1, cur
                q.append(p)
    return dist, prev


def depth(ds, i):
    """En yakın köke uzaklık + 1 (kök = 1)."""
    dist, _ = ancestors(ds, i)
    return 1 + min(d for n, d in dist.items() if not parents(ds, n))


def paths_up(ds, i, limit=6):
    """Kökten i'nin üst kavramına kadar tüm hypernym yolları (slayttaki 'bass' çıktısı gibi)."""
    out = []

    def rec(cur, trail):
        if len(out) >= limit:
            return
        ps = [p for p in parents(ds, cur) if p not in trail]
        if not ps or len(trail) > 40:
            out.append(trail)
            return
        for p in ps:
            rec(p, trail + [p])

    rec(i, [i])
    return [list(reversed(t[1:])) for t in out if len(t) > 1]


def find_synsets(ds, term, cap=40):
    term = term.strip().replace("_", " ")
    if term in ds.idx:
        return [ds.idx[term]]
    return list(dict.fromkeys(ds.lindex(1).get(norm(term, 1), [])))[:cap]


REL_PRIO = {"synonym": 0, "antonym": 1, "a_hypo_b": 2, "a_hyper_b": 2, "cousin": 4}   # diğer açık ilişkiler: 3


def relate(ds, a, b):
    A, B = find_synsets(ds, a), find_synsets(ds, b)
    if not A or not B:
        return {"error": "notfound", "missing": [x for x, l in ((a, A), (b, B)) if not l]}
    anc = {}
    get = lambda n: anc.setdefault(n, ancestors(ds, n))
    rows = []
    for i in A:
        for j in B:
            rel, sim, d, lcs = None, 0.0, None, None
            if i == j:
                rel, sim, d, lcs = "synonym", 1.0, 0, i
            else:
                (di, _), (dj, _) = get(i), get(j)
                common = di.keys() & dj.keys()
                if common:
                    lcs = min(common, key=lambda n: di[n] + dj[n])
                    d = di[lcs] + dj[lcs]
                    sim = 1 / (d + 1)
                    rel = "a_hypo_b" if lcs == j else "a_hyper_b" if lcs == i else "cousin"
                links = {ty for t, ty in ds.syn[i]["sr"] + ds.syn[i]["lsr"] if ds.idx.get(t) == j}
                links |= {ty for t, ty in ds.syn[j]["sr"] + ds.syn[j]["lsr"] if ds.idx.get(t) == i and ty == "ANTONYM"}
                if "ANTONYM" in links:
                    rel, sim, d, lcs = "antonym", 0.0, None, None
                elif links and rel in (None, "cousin"):  # açık ilişki (entailment, meronym…) ortak atadan önemli
                    rel = sorted(links)[0]
                    sim, d, lcs = 0.5, None, None   # açık ilişkide hiyerarşi yolu anlamlı değil
            if rel is None:
                continue
            row = {"a": brief(ds, i, 3), "b": brief(ds, j, 3), "rel": rel, "sim": round(sim, 3), "d": d}
            ic = ic_sims(ds, i, j, get(i)[0], get(j)[0]) if ds.key == "en" and i != j else None
            if ic:
                row["ic"] = ic
            if lcs is not None:
                dl = depth(ds, lcs)  # Wu-Palmer: 2·derinlik(LCS) / (derinlik(a) + derinlik(b)), yol üzerinden
                row["wup"] = round(2 * dl / (2 * dl + d), 3)
                row["lcs"] = brief(ds, lcs, 3)
                (_, pi), (_, pj) = get(i), get(j)

                def chain(start, prev):  # start'tan lcs'ye (prev: ebeveyn -> geldiği çocuk)
                    out, n = [], lcs
                    while n != start:
                        out.append(n)
                        n = prev[n]
                    return [start] + list(reversed(out))

                up, down = chain(i, pi), chain(j, pj)
                row["path"] = [brief(ds, x, 2) for x in up + list(reversed(down))[1:]]
                row["lcs_at"] = len(up) - 1
            rows.append((REL_PRIO.get(rel, 4), -sim, d if d is not None else 99, row))
    rows.sort(key=lambda r: r[:3])
    return {"nA": len(A), "nB": len(B), "best": rows[0][3] if rows else None, "rows": [r[3] for r in rows[:8]]}


STOP_EN = set("""a an the of to in on at by for with and or is are was were be been being it its he she his her they them
their i you we my your our this that these those as from into than then so but if not no do does did has have had will would can
could there which who whom what when where how one some any usually something someone also very more most such other""".split())
STOP_TR = {norm(w, 1) for w in """ve bir bu şu o da de ile için gibi ki mi çok daha en ama fakat veya ya her ne kadar sonra önce
olan olarak şey kimse yapılan olan ise bile ancak hem ya da kendi""".split()}


def stem(w, tr):
    if tr:
        return w[:5]
    if len(w) > 4:
        for suf, rep in (("ies", "y"), ("ing", ""), ("ed", ""), ("es", ""), ("s", "")):
            if w.endswith(suf) and not w.endswith("ss"):
                return w[: -len(suf)] + rep
    return w


def toks(text, tr):
    ws = re.findall(r"[^\W\d_]+", norm(text, 1 if tr else 0))
    stop = STOP_TR if tr else STOP_EN
    return [stem(w, tr) for w in ws if w not in stop and len(w) > 1]


def lemma_cands(t, tr):
    if tr:  # sondan ek kırpma: yaklaştı -> yaklaş -> yaklaşmak
        return [c + suf for L in range(len(t), 2, -1) for c in (t[:L],) for suf in ("", "mak", "mek")]
    base = [t]
    for suf, rep in (("ies", "y"), ("es", ""), ("s", ""), ("ing", ""), ("ing", "e"), ("ed", ""), ("ed", "e")):
        if t.endswith(suf) and len(t) > len(suf) + 2:
            base.append(t[: -len(suf)] + rep)
    return base


def wsd(ds, text, target, ext, lemma_in=""):
    """Basitleştirilmiş (Extended) Lesk: bağlam sözcükleri ile synset tanım/örnek sözcüklerinin kesişimi.
    Kesişen sözcükler aday anlamlar arasındaki seyrekliğe göre (idf) ağırlıklandırılır.
    ext=1: üst/alt/parça ilişkili synset'lerin tanımları da (yarı ağırlıkla) katılır."""
    import math
    tr = ds.key == "kenet"
    fold = 1 if tr else 0
    li = ds.lindex(fold)
    t = norm(target.strip(), fold)
    lemma, cands = None, []
    for c in ([norm(lemma_in.strip(), fold)] if lemma_in.strip() else []) + lemma_cands(t, tr):
        if c in li:
            lemma, cands = c, list(dict.fromkeys(li[c]))[:40]
            break
    if not cands:
        return {"error": "notfound"}
    skip = {stem(t, tr), stem(lemma, tr)}
    ctx = {w for w in toks(text, tr) if w not in skip}
    NL = ds.arrays(fold)[0]
    sigs = []
    for i in cands:
        s = ds.syn[i]
        own = set(toks(s["d"] + " " + " ".join(s["ex"]), tr)) - skip
        rel = set()
        if ext:
            for tid, ty in s["sr"][:40]:
                j = ds.idx.get(tid)
                if j is not None and ty in ("HYPERNYM", "HYPONYM", "INSTANCE_HYPERNYM", "PART_HOLONYM", "PART_MERONYM",
                                            "MEMBER_HOLONYM", "MEMBER_MERONYM", "SIMILAR_TO", "ALSO_SEE", "ATTRIBUTE", "DOMAIN_TOPIC"):
                    rel |= set(toks(ds.syn[j]["d"], tr))
                    rel |= {stem(w, tr) for w in NL[j] if " " not in w}
            rel -= skip
        sigs.append((own, rel - own))
    df = {}
    for own, rel in sigs:
        for w in own | rel:
            df[w] = df.get(w, 0) + 1
    idf = lambda w: math.log((len(cands) + 1) / (df.get(w, 0) + 0.5)) + 0.1
    scored = []
    for order, (i, (own, rel)) in enumerate(zip(cands, sigs)):
        o1, o2 = sorted(ctx & own), sorted(ctx & rel)
        score = sum(idf(w) for w in o1) + 0.5 * sum(idf(w) for w in o2)
        s = ds.syn[i]
        sense = next((sn for k, (_, sn) in enumerate(s["lits"]) if NL[i][k] == lemma), 0)
        scored.append((-round(score, 3), sense or 99, order, i, o1, o2))
    scored.sort(key=lambda r: r[:3])
    out = []
    for sc, _, _, i, o1, o2 in scored[:12]:
        v = view(ds, i)
        v.update(score=-sc, overlap=o1, overlap_rel=o2)
        out.append(v)
    return {"lemma": lemma, "ctx": sorted(ctx), "best": out[0]["id"] if out and out[0]["score"] > 0 else None,
            "n": len(cands), "results": out}


QTYPES = ["HYPERNYM", "HYPONYM", "MEMBER_MERONYM", "MEMBER_HOLONYM", "PART_MERONYM", "PART_HOLONYM",
          "INSTANCE_HYPONYM", "INSTANCE_HYPERNYM", "ANTONYM"]


def quiz(ds, n, kind):
    qs, tries = [], 0
    while len(qs) < n and tries < 3000:
        tries += 1
        i = random.randrange(len(ds.syn))
        s = ds.syn[i]
        if not s["lits"] or not s["d"]:
            continue
        if kind == "hyper":
            ps = parents(ds, i)
            if s["pos"] not in ("n", "v") or not ps:
                continue
            anc, _ = ancestors(ds, i)
            ok = random.choice(ps)
            opts = [ok]
            while len(opts) < 4:
                j = random.randrange(len(ds.syn))
                if ds.syn[j]["pos"] == s["pos"] and j not in anc and j not in opts and ds.syn[j]["lits"]:
                    opts.append(j)
            random.shuffle(opts)
            qs.append({"kind": "hyper", "a": brief(ds, i, 3), "options": [brief(ds, j, 3) for j in opts],
                       "answer": opts.index(ok)})
        else:
            cand = [(t, ty) for t, ty in s["sr"] if ty in QTYPES and ds.idx.get(t) is not None]
            if not cand:
                continue
            t, ty = random.choice(cand)
            opts = [ty] + random.sample([x for x in QTYPES if x != ty], 3)
            random.shuffle(opts)
            qs.append({"kind": "rel", "a": brief(ds, i, 3), "b": brief(ds, ds.idx[t], 3), "options": opts,
                       "answer": opts.index(ty)})
    return qs


# --------------------------------------------- PropBank / FrameNet (SRL kaynakları)
PB_EN, PB_EN_IDX = [], {}
FN_EN, FN_EN_IDX = [], {}
PB_TR, PB_TR_IDX = [], {}   # KeNet synset indeksi -> {"id", "i", "args"}
FN_TR, FN_TR_IDX = [], {}
KE_FN = {}                  # KeNet synset indeksi -> [Türkçe FrameNet çerçeve adları]
FN_PB = {}                  # çerçeve adı -> [PropBank roleset kimlikleri]

FN_POS = {"V": "fiil", "N": "isim", "A": "sıfat", "ADV": "zarf", "PREP": "edat", "NUM": "sayı", "C": "bağlaç",
          "ART": "tanımlık", "SCON": "bağlaç", "IDIO": "deyim", "INTJ": "ünlem"}


def load_srl():
    ke = DSS["kenet"]
    t0 = time.time()
    PB_EN[:] = json.load(open(os.path.join(DATA, "propbank_en.json"), encoding="utf8"))
    for r in PB_EN:
        PB_EN_IDX[r["id"]] = r
        for f in r["fn"]:
            FN_PB.setdefault(f, []).append(r["id"])
    FN_EN[:] = json.load(open(os.path.join(DATA, "framenet_en.json"), encoding="utf8"))
    for f in FN_EN:
        FN_EN_IDX[f["name"]] = f
    for fs in ET.parse(os.path.join(DATA, "turkish-propbank.xml")).getroot():
        i = ke.idx.get(fs.get("id", ""))
        if i is None:
            continue
        args = [{"n": a.get("name"), "f": a.get("function") or "",
                 "c": [c for c in (a.get("grammaticalCase") or "").split(",") if c], "d": (a.text or "").strip()} for a in fs]
        PB_TR_IDX[i] = {"id": fs.get("id"), "i": i, "args": args}
        PB_TR.append(PB_TR_IDX[i])
    for fr in ET.parse(os.path.join(DATA, "framenet.xml")).getroot():
        lus = [ke.idx[l.text.strip()] for l in fr.iter("LEXICAL_UNIT") if l.text and l.text.strip() in ke.idx]
        f = {"name": fr.get("NAME"), "lus": list(dict.fromkeys(lus)), "fes": [e.text.strip() for e in fr.iter("FRAME_ELEMENT") if e.text]}
        FN_TR.append(f)
        FN_TR_IDX[f["name"]] = f
        for i in f["lus"]:
            KE_FN.setdefault(i, []).append(f["name"])
    print(f"srl: PB-en {len(PB_EN):,}  PB-tr {len(PB_TR):,}  FN-en {len(FN_EN):,}  FN-tr {len(FN_TR):,} ({time.time() - t0:.1f} sn)", flush=True)


def _q(p, key, default=""):
    return p.get(key, [default])[0].strip()


def _fold(p):
    return 1 if p.get("fold", ["1"])[0] == "1" else 0


def pb_view(r):
    return {"id": r["id"], "lemma": r["lemma"], "name": r["name"], "roles": r["roles"], "fn": r["fn"], "vn": r["vn"],
            "nex": len(r["ex"]), "al": [a["w"] for a in r["al"] if a["p"] == "v"][:3]}


def pb_en_search(p):
    q, field, mode, fold = _q(p, "q"), _q(p, "field", "lemma"), _q(p, "mode", "exact"), _fold(p)
    func, need_fn = _q(p, "func"), p.get("fn", ["0"])[0] == "1"
    offset, limit = max(0, int(_q(p, "offset", "0") or 0)), min(100, int(_q(p, "limit", "30") or 30))
    nq = norm(q, fold).replace("_", " ")
    hits = []
    for r in PB_EN:
        if need_fn and not r["fn"]:
            continue
        if field == "lemma":
            cands, md = [r["lemma"]], mode
        elif field == "name":
            cands, md = [r["name"]], "contains"
        elif field == "role":
            cands, md = [x["d"] for x in r["roles"]], "contains"
        elif field == "fn":
            cands, md = r["fn"], mode
        elif field == "vn":
            cands, md = r["vn"], mode
        else:
            cands, md = [r["id"]], mode
        best = None
        for c in cands:
            m = match_word(norm(c, fold).replace("_", " "), nq, md)
            if m is not None and (best is None or (m[0], len(c)) < best):
                best = (m[0], len(c))
        if best is not None:
            hits.append((best, r["id"], r))
    facets = {}
    for _, _, r in hits:
        for f in {x["f"] for x in r["roles"] if x["f"]}:
            facets[f] = facets.get(f, 0) + 1
    if func:
        hits = [h for h in hits if any(x["f"] == func for x in h[2]["roles"])]
    hits.sort(key=lambda h: (h[0], h[1]))
    return {"total": len(hits), "facets": facets, "results": [pb_view(h[2]) for h in hits[offset:offset + limit]]}


def pb_tr_search(p):
    ke = DSS["kenet"]
    q, field, mode, fold = _q(p, "q"), _q(p, "field", "verb"), _q(p, "mode", "exact"), _fold(p)
    func, case = _q(p, "func"), _q(p, "case")
    offset, limit = max(0, int(_q(p, "offset", "0") or 0)), min(100, int(_q(p, "limit", "30") or 30))
    nq = norm(q, fold)
    NL, ND, _ = ke.arrays(fold)
    hits = []
    for fs in PB_TR:
        i = fs["i"]
        s = ke.syn[i]
        if field == "verb":
            best = None
            for k, t in enumerate(NL[i]):
                m = match_word(t, nq, mode)
                if m is not None and (best is None or (m[0], len(t)) < best):
                    best = (m[0], len(t))
            if best is None:
                continue
        elif field == "role":
            if nq and not any(nq in norm(a["d"], fold) for a in fs["args"]):
                continue
            best = (0, len(s["d"]))
        elif field == "def":
            if nq and nq not in ND[i]:
                continue
            best = (0, len(s["d"]))
        else:
            if nq and nq not in s["id"].lower():
                continue
            best = (0, len(s["id"]))
        hits.append((best, i, fs))
    facets = {"f": {}, "c": {}}
    for _, _, fs in hits:
        for f in {a["f"] for a in fs["args"] if a["f"]}:
            facets["f"][f] = facets["f"].get(f, 0) + 1
        for c in {c for a in fs["args"] for c in a["c"]}:
            facets["c"][c] = facets["c"].get(c, 0) + 1
    if func:
        hits = [h for h in hits if any(a["f"] == func for a in h[2]["args"])]
    if case:
        hits = [h for h in hits if any(case in a["c"] for a in h[2]["args"])]
    hits.sort(key=lambda h: (h[0], h[1]))
    out = []
    for _, i, fs in hits[offset:offset + limit]:
        v = view(ke, i)
        v["args"] = fs["args"]
        out.append(v)
    return {"total": len(hits), "facets": facets, "results": out}


def fn_view(f):
    en = FN_EN_IDX.get(f["name"])
    tr = FN_TR_IDX.get(f["name"])
    return {"name": f["name"], "d": (f["d"][:260] + "…") if len(f["d"]) > 260 else f["d"], "nfe": len(f["fes"]),
            "nlu": len(f["lus"]), "core": [x["n"] for x in f["fes"] if x["c"] == "Core"][:6],
            "tr": bool(tr), "ntr": len(tr["lus"]) if tr else 0, "npb": len(FN_PB.get(f["name"], []))}


def fn_en_search(p):
    q, field, mode, fold = _q(p, "q"), _q(p, "field", "name"), _q(p, "mode", "contains"), _fold(p)
    lupos = _q(p, "lupos")
    offset, limit = max(0, int(_q(p, "offset", "0") or 0)), min(100, int(_q(p, "limit", "30") or 30))
    nq = norm(q, fold).replace("_", " ")
    lu_q, _, lu_pos = nq.partition(".") if field == "lu" and "." in nq else (nq, "", "")
    hits = []
    for f in FN_EN:
        matched = []
        if field == "name":
            m = match_word(norm(f["name"], fold).replace("_", " "), nq, mode)
            best = None if m is None else (m[0], len(f["name"]))
        elif field == "lu":
            best = None
            for lu in f["lus"]:
                lem, _, ps = lu["n"].rpartition(".")
                if lu_pos and ps.lower() != lu_pos:
                    continue
                m = match_word(norm(lem, fold).replace("_", " "), lu_q, mode)
                if m is not None:
                    matched.append(lu["n"])
                    best = (m[0], len(lem)) if best is None else min(best, (m[0], len(lem)))
        elif field == "fe":
            best = None
            for fe in f["fes"]:
                m = match_word(norm(fe["n"], fold).replace("_", " "), nq, mode)
                if m is not None:
                    matched.append(fe["n"])
                    best = (m[0], len(fe["n"])) if best is None else min(best, (m[0], len(fe["n"])))
        else:
            best = (0, len(f["d"])) if (not nq or nq in norm(f["d"], fold)) else None
        if best is not None:
            hits.append((best, f["name"], f, matched))
    facets = {}
    for _, _, f, _ in hits:
        for ps in {lu["p"] for lu in f["lus"]}:
            facets[ps] = facets.get(ps, 0) + 1
    if lupos:
        hits = [h for h in hits if any(lu["p"] == lupos for lu in h[2]["lus"])]
    hits.sort(key=lambda h: (h[0], h[1]))
    res = []
    for _, _, f, m in hits[offset:offset + limit]:
        v = fn_view(f)
        v["m"] = m[:8]
        res.append(v)
    return {"total": len(hits), "facets": facets, "results": res}


def fn_tr_search(p):
    ke = DSS["kenet"]
    q, field, mode, fold = _q(p, "q"), _q(p, "field", "name"), _q(p, "mode", "contains"), _fold(p)
    offset, limit = max(0, int(_q(p, "offset", "0") or 0)), min(100, int(_q(p, "limit", "30") or 30))
    nq = norm(q, fold).replace("_", " ")
    NL = ke.arrays(fold)[0]
    hits = []
    for f in FN_TR:
        matched = []
        if field == "name":
            m = match_word(norm(f["name"], fold).replace("_", " "), nq, mode)
            best = None if m is None else (m[0], len(f["name"]))
        elif field == "fe":
            best = None
            for fe in f["fes"]:
                m = match_word(norm(fe, fold).replace("_", " "), nq, mode)
                if m is not None:
                    matched.append(fe)
                    best = (m[0], len(fe)) if best is None else min(best, (m[0], len(fe)))
        else:  # verb: LU synset'lerinin Türkçe sözcükleri
            best = None
            for i in f["lus"]:
                for k, t in enumerate(NL[i]):
                    m = match_word(t, nq, mode if mode != "contains" else "exact")
                    if m is not None:
                        matched.append(ke.syn[i]["lits"][k][0])
                        best = (m[0], len(t)) if best is None else min(best, (m[0], len(t)))
        if best is not None:
            hits.append((best, f["name"], f, matched))
    hits.sort(key=lambda h: (h[0], h[1]))
    res = []
    for _, _, f, m in hits[offset:offset + limit]:
        en = FN_EN_IDX.get(f["name"])
        res.append({"name": f["name"], "d": ((en["d"][:200] + "…") if en and len(en["d"]) > 200 else (en["d"] if en else "")),
                    "nfe": len(f["fes"]), "nlu": len(f["lus"]), "fes": f["fes"][:8], "en": bool(en), "m": list(dict.fromkeys(m))[:8]})
    return {"total": len(hits), "facets": {}, "results": res}


def frame_detail(name):
    en, tr = FN_EN_IDX.get(name), FN_TR_IDX.get(name)
    if not en and not tr:
        return None
    ke = DSS["kenet"]
    out = {"name": name, "en": None, "tr": None, "pb": []}
    if en:
        order = {"Core": 0, "Core-Unexpressed": 1, "Peripheral": 2, "Extra-Thematic": 3}
        lus = {}
        for lu in en["lus"]:
            lus.setdefault(lu["p"], []).append(lu["n"])
        out["en"] = {"d": en["d"], "ex": en["ex"], "fes": sorted(en["fes"], key=lambda x: order.get(x["c"], 9)),
                     "lus": {k: sorted(v) for k, v in lus.items()}, "rels": en["rels"]}
    if tr:
        out["tr"] = {"fes": tr["fes"], "nlu": len(tr["lus"]), "lus": [brief(ke, i, 3) for i in tr["lus"][:60]]}
    out["lux"] = FN_LUEX.get(name, {})
    for rid in FN_PB.get(name, [])[:40]:
        r = PB_EN_IDX[rid]
        out["pb"].append({"id": rid, "name": r["name"]})
    return out


def roleset_detail(rid):
    r = PB_EN_IDX.get(rid)
    if not r:
        return None
    return dict(r, frames=[{"name": f, "ok": f in FN_EN_IDX} for f in r["fn"]])


def pbquiz(n):
    qs, tries = [], 0
    while len(qs) < n and tries < 5000:
        tries += 1
        r = random.choice(PB_EN)
        if len(r["roles"]) < 2 or not r["ex"]:
            continue
        e = random.choice(r["ex"])
        toks = e["text"].split()
        args = [a for a in e["args"] if a["t"].startswith("ARG") and a["t"][3:].isdigit() and a["e"] < len(toks)]
        if len(args) < 2 or not e["rel"] or len(toks) > 40:
            continue
        a = random.choice(args)
        labels = [f"ARG{x['n']}" for x in r["roles"] if x["n"].isdigit()]
        if len(labels) < 2 or a["t"] not in labels:
            continue
        opts = labels[:4]
        qs.append({"id": r["id"], "name": r["name"], "toks": toks, "rel": e["rel"], "span": [a["s"], a["e"]],
                   "roles": [{"n": f"ARG{x['n']}", "d": x["d"], "f": x["f"]} for x in r["roles"] if x["n"].isdigit()],
                   "options": opts, "answer": opts.index(a["t"]),
                   "others": [{"t": b["t"], "s": b["s"], "e": b["e"]} for b in args if b is not a]})
    return qs


# --- Türkçe rol etiketleme demosu (kural tabanlı)
_CASES = [
    ("abl", ("ndan", "nden", "dan", "den", "tan", "ten", "ından", "inden", "undan", "ünden")),
    ("loc", ("nda", "nde", "da", "de", "ta", "te", "ında", "inde", "unda", "ünde")),
    ("ins", ("yla", "yle", "la", "le")),
    ("gen", ("nın", "nin", "nun", "nün", "ın", "in", "un", "ün", "ının", "inin", "unun", "ünün")),
    ("acc", ("yı", "yi", "yu", "yü", "nı", "ni", "nu", "nü", "ı", "i", "u", "ü", "ını", "ini", "unu", "ünü")),
    ("dat", ("ya", "ye", "na", "ne", "a", "e", "ına", "ine", "una", "üne")),
]
_SOFT = {"ğ": "k", "b": "p", "d": "t", "c": "ç"}
_SUF = sorted([(suf, c) for c, sufs in _CASES for suf in sufs], key=lambda x: -len(x[0]))
_APOS = {suf: c for c, sufs in _CASES for suf in sufs}
_POSS = ("ımız", "imiz", "umuz", "ümüz", "ınız", "iniz", "unuz", "ünüz", "ları", "leri", "lar", "ler",
         "ım", "im", "um", "üm", "ın", "in", "un", "ün", "sı", "si", "su", "sü", "m")


def _lex(stem, li):
    """Sözlükte var mı? (ünsüz yumuşaması tolere edilir) -> synset indeksleri"""
    out = list(li.get(norm(stem, 0), []))
    if stem and stem[-1] in _SOFT:
        out += li.get(norm(stem[:-1] + _SOFT[stem[-1]], 0), [])
    return out


def analyze_token(tok, li, ke):
    """(durum, kök, isim_mi). Sözlük + ek kuralları; yanlışsa arayüzden elle düzeltilebilir."""
    isnoun = lambda hit: any(ke.syn[i]["pos"] in ("n", "r") for i in hit)
    m = re.match(r"^(.+?)['’](.*)$", tok)
    if m:  # özel ad + kesme: Ankara'dan
        return (_APOS.get(norm(m.group(2), 0)) if m.group(2) else "nom"), norm(m.group(1), 0), True
    t = norm(tok, 0)
    if t in li:
        return "nom", t, isnoun(li[t])
    for suf, c in _SUF:
        if t.endswith(suf) and len(t) - len(suf) >= 2:
            stem = t[: -len(suf)]
            for st in (stem, stem[:-3] if stem.endswith(("lar", "ler")) else None):
                hit = _lex(st, li) if st else []
                if hit:
                    return c, st, isnoun(hit)
    for suf in _POSS:
        if t.endswith(suf) and len(t) - len(suf) >= 2:
            hit = _lex(t[: -len(suf)], li)
            if hit:
                return "nom", t[: -len(suf)], isnoun(hit)
    if tok[:1].isupper():  # sözlükte olmayan büyük harfli sözcük: özel ad
        return "nom", t, True
    return None, t, False


def verb_synsets(tok, li, ke):
    """Ekli fiil biçiminden (yaklaştı -> yaklaşmak) fiil synset'leri; en uzun kök önce."""
    t = norm(tok, 0)
    for L in range(len(t), 1, -1):
        for suf in ("mak", "mek"):
            c = t[:L] + suf
            ids = [i for i in li.get(c, []) if ke.syn[i]["pos"] == "v"]
            if ids:
                return c, ids
    return None, []


def srl(text, pred_in, cases_in=""):
    ke = DSS["kenet"]
    li = ke.lindex(0)
    toks = [{"w": m.group(), "s": m.start(), "e": m.end()} for m in re.finditer(r"[^\W\d_]+(?:['’][^\W\d_]+)?", text)]
    ov = dict(x.split(":", 1) for x in cases_in.split(";") if ":" in x)
    for k, t in enumerate(toks):
        t["case"], t["stem"], t["noun"] = analyze_token(t["w"], li, ke)
        if str(k) in ov:   # kullanıcı düzeltmesi
            t["case"] = None if ov[str(k)] in ("", "none") else ov[str(k)]
            t["noun"] = t["case"] is not None
            t["fixed"] = True
    pred, lemma, cands = None, None, []
    order = [pred_in] if 0 <= pred_in < len(toks) else list(range(len(toks) - 1, -1, -1))
    for k in order:
        lem, ids = verb_synsets(toks[k]["w"], li, ke)
        ids = [i for i in ids if i in PB_TR_IDX]
        if ids and not (k == len(toks) - 1 and False):
            pred, lemma, cands = k, lem, ids
            break
    if pred is None:
        return {"tokens": toks, "pred": None}
    ranked = wsd(ke, text, toks[pred]["w"], True, lemma)
    order_ids = {r["id"]: (j, r["score"]) for j, r in enumerate(ranked.get("results", []))}
    res = []
    for i in cands:
        fs = PB_TR_IDX[i]
        used, assign = set(), {}
        for a in fs["args"]:  # önce durum eki gerektirenler
            need = set(a["c"]) - {"nom"}
            if need:
                for k, t in enumerate(toks):
                    if k != pred and k not in used and t["noun"] and t["case"] in need:
                        assign[a["n"]] = k
                        used.add(k)
                        break
        for a in fs["args"]:  # özne: ilk yalın hâl isim (bulunamazsa ilk yalın hâl sözcük)
            if a["n"] not in assign and (not a["c"] or "nom" in a["c"]):
                for strict in (True, False):
                    k = next((k for k, t in enumerate(toks) if k != pred and k not in used and t["case"] == "nom"
                              and (t["noun"] or not strict)), None)
                    if k is not None:
                        assign[a["n"]] = k
                        used.add(k)
                        break
        v = view(ke, i)
        j, sc = order_ids.get(ke.syn[i]["id"], (99, 0.0))
        v.update(args=fs["args"], assign=assign, score=sc, order=j)
        res.append(v)
    res.sort(key=lambda v: v["order"])
    return {"tokens": toks, "pred": pred, "lemma": lemma, "candidates": res[:8]}


# ------------------------------------------- NLTK kaynaklı ek veriler (scripts/build_nltk.py)
LEXNAMES, VFRAMES = {}, {}
SEMCOR = {"sents": [], "inst": []}
SC_LEM = {}          # lemma -> [instance indeksleri]
SENSEVAL = {}        # "interest-n" -> [{"s","t","p","h"}]
VN, VN_IDX = [], {}
FN_LUEX = {}         # çerçeve -> LU -> [örnekler]
IC_CNT, IC_TOT = {"n": {}, "v": {}}, {"n": 0, "v": 0}


def _gz(name):
    with gzip.open(os.path.join(DATA, name), "rt", encoding="utf8") as f:
        return json.load(f)


def load_wn31_extra():
    """WordNet 3.1: gerçek sense sırası/sıklığı, örnek cümleler, lexname, fiil kalıpları."""
    ex = _gz("wn31_extra.json.gz")
    en = DSS["en"]
    LEXNAMES.update({int(k): v for k, v in ex["lexnames"].items()})
    VFRAMES.update({int(k): v for k, v in ex["frames"].items()})
    n = 0
    for s in en.syn:
        e = ex["syn"].get(s["id"][6:])
        if not e:
            continue
        if e.get("ex") and not s["ex"]:
            s["ex"] = e["ex"]
        s["lx"] = LEXNAMES.get(e["lx"], "")
        s["vf"] = [VFRAMES[f] for f in e.get("fr", []) if f in VFRAMES]
        sm = {l: (no, c) for l, no, c in e.get("sn", [])}
        lits, cnt = [], []
        for w, _ in s["lits"]:
            no, c = sm.get(w.lower().replace(" ", "_"), (0, 0))
            lits.append((w, no))
            cnt.append(c)
        s["lits"], s["cnt"] = lits, cnt
        n += 1
    print(f"wn31 ek veri: {n:,} synset", flush=True)


def load_semcor():
    d = _gz("semcor.json.gz")
    SEMCOR["sents"], SEMCOR["inst"] = d["sents"], d["inst"]
    for k, (_, _, lem, sid, _) in enumerate(d["inst"]):
        SC_LEM.setdefault(lem, []).append(k)
    en = DSS["en"]
    seen = {}
    for _, _, _, sid, _ in d["inst"]:
        seen[sid] = seen.get(sid, 0) + 1
    for sid, c in seen.items():   # bilgi içeriği (IC): her etiket kendisi ve tüm üst kavramlarına sayılır
        i = en.idx.get("ENG31-" + sid)
        if i is None or en.syn[i]["pos"] not in ("n", "v"):
            continue
        pos = en.syn[i]["pos"]
        for a in ancestors(en, i)[0]:
            IC_CNT[pos][a] = IC_CNT[pos].get(a, 0) + c
        IC_TOT[pos] += c
    print(f"semcor: {len(d['sents']):,} cümle, {len(d['inst']):,} etiket, {len(SC_LEM):,} lemma", flush=True)


def load_senseval():
    SENSEVAL.update(_gz("senseval.json.gz"))


def load_verbnet():
    VN[:] = json.load(open(os.path.join(DATA, "verbnet.json"), encoding="utf8"))
    for c in VN:
        VN_IDX[c["id"]] = c


def load_fnlu():
    FN_LUEX.update(_gz("framenet_lu_ex.json.gz"))


# --- bilgi içeriği (IC) tabanlı benzerlik: Resnik / Lin / Jiang-Conrath
def ic_of(en, i):
    pos = en.syn[i]["pos"]
    if pos not in IC_TOT or not IC_TOT[pos]:
        return None
    return -math.log((IC_CNT[pos].get(i, 0) + 1) / (IC_TOT[pos] + 1))


def ic_sims(en, i, j, anc_i, anc_j):
    if not IC_TOT["n"] or en.syn[i]["pos"] != en.syn[j]["pos"] or en.syn[i]["pos"] not in ("n", "v"):
        return None
    common = anc_i.keys() & anc_j.keys()
    if not common:
        return None
    lcs = max(common, key=lambda n: ic_of(en, n))
    il, ia, ib = ic_of(en, lcs), ic_of(en, i), ic_of(en, j)
    dist = ia + ib - 2 * il
    return {"res": round(il, 3), "lin": round(2 * il / (ia + ib), 3) if ia + ib > 0 else 0.0,
            "jcn": round(1 / dist, 3) if dist > 1e-6 else None, "lcs": brief(en, lcs, 2)}


# --- Naive Bayes ile denetimli WSD (SemCor / SENSEVAL-2)
SV_LABELS = {
    "interest-n": {"interest_1": "ilgi duyma isteği (readiness to give attention)", "interest_2": "dikkat çekme niteliği (quality of causing attention)",
                   "interest_3": "ilgi duyulan etkinlik / konu (activity or subject)", "interest_4": "çıkar, yarar (advantage, favour)",
                   "interest_5": "hisse, pay (share in a business)", "interest_6": "faiz (money paid for the use of money)"},
}


def nb_instances(corpus, lemma):
    """-> [(tokens, hedef_indeksi, etiket)]"""
    if corpus == "senseval":
        return [(i["t"], i["h"], i["s"][0]) for i in SENSEVAL.get(lemma, [])]
    out = []
    for k in SC_LEM.get(lemma, []):
        si, ti, _, sid, _ = SEMCOR["inst"][k]
        out.append((SEMCOR["sents"][si].split(" "), ti, sid))
    return out


def nb_feats(tokens, t, feats, win):
    f = []
    if "bag" in feats:
        lo, hi = (0, len(tokens)) if win <= 0 else (max(0, t - win), min(len(tokens), t + win + 1))
        for k in range(lo, hi):
            if k == t:
                continue
            for part in tokens[k].split("_"):
                if part.isalpha() and len(part) > 1 and part not in STOP_EN:
                    f.append("b:" + part)
    if "pos" in feats:
        for d in (-2, -1, 1, 2):
            k = t + d
            f.append(f"w{d:+d}:" + (tokens[k].lower() if 0 <= k < len(tokens) else "<s>"))
    return f


class NB:
    def __init__(self, data, feats, win):
        self.cls, self.fc, self.tot, self.vocab = {}, {}, {}, set()
        for tokens, t, lab in data:
            self.cls[lab] = self.cls.get(lab, 0) + 1
            c = self.fc.setdefault(lab, {})
            for f in nb_feats(tokens, t, feats, win):
                c[f] = c.get(f, 0) + 1
                self.tot[lab] = self.tot.get(lab, 0) + 1
                self.vocab.add(f)
        self.n = sum(self.cls.values())

    def logp(self, lab, f):
        return math.log((self.fc[lab].get(f, 0) + 1) / (self.tot.get(lab, 0) + len(self.vocab) + 1))

    def predict(self, feats):
        sc = {lab: math.log(c / self.n) + sum(self.logp(lab, f) for f in feats) for lab, c in self.cls.items()}
        m = max(sc.values())
        z = sum(math.exp(v - m) for v in sc.values())
        return sorted(((lab, math.exp(v - m) / z) for lab, v in sc.items()), key=lambda x: -x[1])


def nb_lemmas(corpus):
    if corpus == "senseval":
        return [{"lemma": k, "n": len(v), "senses": len({i["s"][0] for i in v})} for k, v in SENSEVAL.items()]
    out = []
    for lem, ks in SC_LEM.items():
        if len(ks) >= 40:
            senses = {SEMCOR["inst"][k][3] for k in ks}
            if len(senses) >= 2:
                out.append({"lemma": lem, "n": len(ks), "senses": len(senses)})
    return sorted(out, key=lambda x: -x["n"])[:60]


def _opts(p):
    feats = set(_q(p, "feat", "bag,pos").split(","))
    return feats, int(_q(p, "win", "10") or 10)


def nb_predict(p):
    corpus, lemma = _q(p, "corpus", "semcor"), _q(p, "lemma").lower()
    data = nb_instances(corpus, lemma)
    if len(data) < 2:
        return {"error": "nodata"}
    feats, win = _opts(p)
    text = p.get("text", [""])[0]
    toks = re.findall(r"[a-z0-9']+", text.lower())
    base = lemma.split("-")[0]
    tgt = next((k for k, w in enumerate(toks) if base in lemma_cands(w, False)), None)
    if tgt is None:
        return {"error": "notarget", "tokens": toks}
    nb = NB(data, feats, win)
    f = nb_feats(toks, tgt, feats, win)
    ranked = nb.predict(f)
    en, out = DSS["en"], []
    labels = SV_LABELS.get(lemma, {})
    for rank, (lab, pr) in enumerate(ranked[:8]):
        r = {"label": lab, "p": round(pr, 4), "n": nb.cls[lab]}
        if corpus == "semcor":
            i = en.idx.get("ENG31-" + lab)
            r["syn"] = view(en, i) if i is not None else None
        else:
            r["gloss"] = labels.get(lab, "")
        out.append(r)
    top = []
    if len(ranked) > 1:   # kazanan ile ikinci arasındaki ayırt edici özellikler
        a, b = ranked[0][0], ranked[1][0]
        diffs = sorted(((nb.logp(a, x) - nb.logp(b, x), x) for x in set(f)), key=lambda d: -abs(d[0]))[:10]
        top = [{"f": x, "d": round(d, 2)} for d, x in diffs]
    return {"tokens": toks, "target": tgt, "n": nb.n, "k": len(nb.cls), "features": sorted(set(f))[:60], "results": out,
            "top": top, "winner": ranked[0][0]}


NB_EVAL_CACHE = {}


def nb_eval(p):
    corpus, lemma = _q(p, "corpus", "semcor"), _q(p, "lemma").lower()
    feats, win = _opts(p)
    key = (corpus, lemma, tuple(sorted(feats)), win)
    if key in NB_EVAL_CACHE:
        return NB_EVAL_CACHE[key]
    data = nb_instances(corpus, lemma)
    if len(data) < 10:
        return {"error": "nodata"}
    rnd = random.Random(7)
    idx = list(range(len(data)))
    rnd.shuffle(idx)
    K = 5
    nb_ok = mfs_ok = 0
    for fold in range(K):
        test = {idx[i] for i in range(len(idx)) if i % K == fold}
        train = [data[j] for j in idx if j not in test]
        nb = NB(train, feats, win)
        mfs = max(nb.cls, key=nb.cls.get)
        for j in test:
            tokens, t, gold = data[j]
            if nb.predict(nb_feats(tokens, t, feats, win))[0][0] == gold:
                nb_ok += 1
            if mfs == gold:
                mfs_ok += 1
    res = {"n": len(data), "k": len({d[2] for d in data}), "nb": round(nb_ok / len(data), 3), "mfs": round(mfs_ok / len(data), 3),
           "folds": K, "lesk": None, "lesk_n": 0}
    if corpus == "semcor":   # aynı örneklerde (en fazla 120) bilgi-tabanlı Lesk
        en, ok, n = DSS["en"], 0, 0
        for j in idx[:120]:
            tokens, t, gold = data[j]
            r = wsd(en, " ".join(w.replace("_", " ") for w in tokens), tokens[t].replace("_", " "), True, lemma.replace("_", " "))
            if r.get("results"):
                n += 1
                ok += r["results"][0]["id"] == "ENG31-" + gold
        if n:
            res["lesk"], res["lesk_n"] = round(ok / n, 3), n
    NB_EVAL_CACHE[key] = res
    return res


# --- VerbNet
def vn_resolve(cid):
    c = cid
    while c:
        if c in VN_IDX:
            return c
        m = re.match(r"^(.*)-\d+$", c) or re.match(r"^(.*)\.\d+$", c)
        c = m.group(1) if m else None
    return None


def vn_view(c):
    """Alt sınıflar tematik rolleri üst sınıftan miras alır; çerçeveler üst sınıfınkilerle birlikte gösterilir."""
    roles, inh, frames, par = c["roles"], False, list(c["frames"]), c["parent"]
    while par and par in VN_IDX:
        up = VN_IDX[par]
        if not roles and up["roles"]:
            roles, inh = up["roles"], True
        frames += [dict(f, inherited=True) for f in up["frames"]]
        par = up["parent"]
    return {"id": c["id"], "parent": c["parent"], "members": c["members"][:80], "nm": len(c["members"]), "roles": roles,
            "roles_inherited": inh, "frames": frames, "children": [x["id"] for x in VN if x["parent"] == c["id"]]}


def vn_search(p):
    q, field, mode, fold = _q(p, "q"), _q(p, "field", "member"), _q(p, "mode", "exact"), _fold(p)
    offset, limit = max(0, int(_q(p, "offset", "0") or 0)), min(100, int(_q(p, "limit", "30") or 30))
    nq = norm(q, fold)
    hits = []
    for c in VN:
        if field == "member":
            cands = [m["n"] for m in c["members"]]
        elif field == "class":
            res = vn_resolve(q)
            if res:
                hits.append(((0, 0), c["id"], c)) if c["id"] == res else None
                continue
            cands = [c["id"]]
        elif field == "role":
            cands = [r["t"] for r in c["roles"]]
        elif field == "pred":
            cands = [s for f in c["frames"] for s in f["sem"]]
        elif field == "pb":
            cands = [m["g"] for m in c["members"] if m["g"]]
        else:
            cands = [f["p"] for f in c["frames"]]
        best = None
        for t in cands:
            m = match_word(norm(t, fold), nq, mode if field in ("member", "class", "role", "pb") else "contains")
            if m is not None and (best is None or (m[0], len(t)) < best):
                best = (m[0], len(t))
        if best is not None:
            hits.append((best, c["id"], c))
    hits.sort(key=lambda h: (h[0], h[1]))
    return {"total": len(hits), "facets": {}, "results": [vn_view(h[2]) for h in hits[offset:offset + limit]]}


# --------------------------------------------------------------------- hızlı öneri (⌘K)
_SORTED = {}


def _sorted_keys(ds):
    if ds.key not in _SORTED:
        li = ds.lindex(1)
        _SORTED[ds.key] = sorted(li)
    return _SORTED[ds.key]


def suggest(p):
    """Kelime (TR + EN), çerçeve, roleset ve VerbNet sınıfları için önek önerileri."""
    import bisect
    q = _q(p, "q")
    nq = norm(q, 1)
    out = {"words": [], "frames": [], "rolesets": [], "vn": []}
    if not nq:
        return out
    for key in ("kenet", "en"):
        ds = DSS[key]
        keys, li = _sorted_keys(ds), ds.lindex(1)
        i = bisect.bisect_left(keys, nq)
        hit = []
        while i < len(keys) and keys[i].startswith(nq) and len(hit) < 40:
            hit.append(keys[i])
            i += 1
        hit.sort(key=lambda k: (k != nq, len(k), k))
        for k in hit[:7]:
            idx = li[k]
            pos = sorted({ds.syn[j]["pos"] for j in idx})
            lit = next((w for j in idx for w, _ in ds.syn[j]["lits"] if norm(w, 1) == k), k)
            out["words"].append({"w": lit, "ds": key, "n": len(set(idx)), "pos": pos})
    nl = q.lower().replace(" ", "_")
    out["frames"] = [f["name"] for f in FN_EN if f["name"].lower().startswith(nl)][:5]
    out["rolesets"] = [r["id"] for r in PB_EN if r["lemma"].lower() == q.lower()][:5] or [r["id"] for r in PB_EN if r["id"].startswith(q.lower())][:5]
    out["vn"] = [c["id"] for c in VN if c["id"].lower().startswith(q.lower())][:4]
    return out


# ------------------------------------------------------------------ Universal Dependencies (BOUN)
UD_FILE = os.path.join(DATA, "ud", "tr_boun-ud-test.conllu")
_UD = []
_UD_LOCK = threading.Lock()
NL, TAB = chr(10), chr(9)


def ud_sents():
    """BOUN test kümesi: [{id, text, n, conllu}]. İlk istekte okunur."""
    with _UD_LOCK:
        if _UD or not os.path.exists(UD_FILE):
            return _UD
        with open(UD_FILE, encoding="utf-8") as f:
            blocks = f.read().replace(chr(13), "").split(NL * 2)   # git autocrlf CRLF yapsa da çalışsın
        for blk in blocks:
            lines = [l for l in blk.strip().split(NL) if l]
            if not lines:
                continue
            meta = {}
            for l in lines:
                m = re.match(r"# (\w+) = (.*)", l)
                if m:
                    meta[m.group(1)] = m.group(2)
            rows = [l.split(TAB) for l in lines if l[0].isdigit()]
            n = sum(1 for r in rows if r[0].isdigit())          # çok sözcüklü belirteç (1-2) ve boş düğüm (1.1) sayılmaz
            _UD.append({"id": meta.get("sent_id", str(len(_UD))), "text": meta.get("text", ""), "n": n, "conllu": NL.join(lines)})
        return _UD


_UD_IDX = {}


def ud_index():
    """Sözcük biçimi -> (lemma, UPOS, FEATS) sayımları ve kök sözlüğü (lemma, UPOS, sıklık)."""
    with _UD_LOCK:
        if _UD_IDX:
            return _UD_IDX
    sents = ud_sents()
    forms, lemmas = {}, {}
    for s in sents:
        for line in s["conllu"].split(NL):
            if not line or not line[0].isdigit():
                continue
            c = line.split(TAB)
            if len(c) < 6 or not c[0].isdigit():
                continue
            f = forms.setdefault(norm(c[1], False), {})
            f[(c[2], c[3], c[5])] = f.get((c[2], c[3], c[5]), 0) + 1
            if c[3] in ("NOUN", "VERB", "ADJ", "PROPN") and c[2].isalpha():
                k = (norm(c[2], False), c[3])
                lemmas[k] = lemmas.get(k, 0) + 1
    with _UD_LOCK:
        _UD_IDX["forms"] = forms
        _UD_IDX["lemmas"] = sorted(([l, p, n] for (l, p), n in lemmas.items()), key=lambda x: (-x[2], x[0]))
    return _UD_IDX


def ud_word(w):
    f = ud_index()["forms"].get(norm(w, False), {})
    return {"form": w, "results": [{"lemma": k[0], "upos": k[1], "feats": k[2], "n": n} for k, n in sorted(f.items(), key=lambda x: -x[1])]}


_CORP = {}


def corpus_boun():
    """BOUN: [{id, f: biçimler, l: lemmalar, p: UPOS, x: FEATS}] (çok sözcüklü belirteç ve boş düğümler atlanır)."""
    if "boun" not in _CORP:
        out = []
        for s in ud_sents():
            f, l, p, x = [], [], [], []
            for line in s["conllu"].split(NL):
                if not line or not line[0].isdigit():
                    continue
                c = line.split(TAB)
                if len(c) < 6 or not c[0].isdigit():
                    continue
                f.append(c[1]); l.append(c[2]); p.append(c[3]); x.append(c[5])
            out.append({"id": s["id"], "f": f, "l": l, "p": p, "x": x})
        _CORP["boun"] = out
    return _CORP["boun"]


def corpus_get(name, n):
    """name=boun: tüm cümleler; name=brown: SemCor'daki (Brown Corpus) İngilizce cümleler, n tanesi eşit aralıkla seçilir."""
    if name == "boun":
        return {"name": "boun", "total": len(corpus_boun()), "sents": corpus_boun()}
    sents = SEMCOR.get("sents") or []
    total = len(sents)
    if n and n < total:
        step = total / n
        sents = [sents[int(i * step)] for i in range(n)]
    return {"name": "brown", "total": total, "sents": sents}


def ud_search(q, lo, hi, limit):
    q = norm(q, True).strip()
    out = [s for s in ud_sents() if lo <= s["n"] <= hi and (not q or q in norm(s["text"], True))]
    return {"total": len(out), "results": [{"id": s["id"], "text": s["text"], "n": s["n"]} for s in out[:limit]]}


def ud_get(sid):
    for s in ud_sents():
        if s["id"] == sid:
            return s
    return None


# ------------------------------------------------------------------ Zemberek (isteğe bağlı gerçek morfolojik çözümleyici)
# lib/zemberek-full.jar (Apache 2.0) ve bir JDK varsa scripts/ZemberekBridge.java derlenip kalıcı bir alt süreç olarak çalıştırılır.
ZEM_JAR = os.path.join(ROOT, "lib", "zemberek-full.jar")
ZEM_SRC = os.path.join(ROOT, "scripts", "ZemberekBridge.java")
ZEM_OUT = os.path.join(ROOT, "lib", "bridge")
ZEM = {"proc": None, "ready": threading.Event(), "state": "idle", "error": "", "lock": threading.Lock()}


def zem_start():
    """Arka planda köprüyü derler ve başlatır; durum ZEM['state'] içinde: idle / starting / ready / unavailable."""
    if ZEM["state"] != "idle":
        return
    ZEM["state"] = "starting"
    java, javac = shutil.which("java"), shutil.which("javac")
    jh = os.environ.get("JAVA_HOME")
    if jh:
        java = java or os.path.join(jh, "bin", "java")
        javac = javac or os.path.join(jh, "bin", "javac")
    cls = os.path.join(ZEM_OUT, "ZemberekBridge.class")
    try:
        if not os.path.exists(ZEM_JAR):
            raise RuntimeError("lib/zemberek-full.jar yok")
        if not java:
            raise RuntimeError("java bulunamadı")
        if not os.path.exists(cls) or os.path.getmtime(cls) < os.path.getmtime(ZEM_SRC):
            if not javac:
                raise RuntimeError("javac (JDK) bulunamadı")
            os.makedirs(ZEM_OUT, exist_ok=True)
            r = subprocess.run([javac, "-encoding", "UTF-8", "-cp", ZEM_JAR, "-d", ZEM_OUT, ZEM_SRC], capture_output=True, text=True)
            if r.returncode:
                raise RuntimeError("derleme hatası: " + r.stderr[:200])
        sep = ";" if os.name == "nt" else ":"
        p = subprocess.Popen([java, "-Xmx1g", "-cp", ZEM_OUT + sep + ZEM_JAR, "ZemberekBridge"], stdin=subprocess.PIPE,
                             stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, encoding="utf-8", bufsize=1)
        line = p.stdout.readline()
        while line and not line.startswith("@@"):
            line = p.stdout.readline()
        if not line.startswith("@@READY"):
            raise RuntimeError("köprü başlamadı")
        ZEM["proc"] = p
        ZEM["state"] = "ready"
    except Exception as e:  # noqa: BLE001 - kullanıcıya durum olarak gösterilir
        ZEM["state"], ZEM["error"] = "unavailable", str(e)
    ZEM["ready"].set()


def zem_call(cmd, *fields):
    text = TAB.join(f.replace(NL, " ").replace(TAB, " ").strip()[:600] for f in fields)
    with ZEM["lock"]:
        p = ZEM["proc"]
        p.stdin.write(cmd + TAB + text + NL)
        p.stdin.flush()
        line = p.stdout.readline()
        while line and not line.startswith("@@"):
            line = p.stdout.readline()
    if not line:
        ZEM["state"], ZEM["error"] = "unavailable", "köprü kapandı"
        raise ValueError("Zemberek kapandı")
    return json.loads(line[2:])


# ------------------------------------------------------------------ HTTP katmanı
class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=STATIC, **kw)

    def log_message(self, fmt, *args):
        if not self.path.startswith("/api/"):
            super().log_message(fmt, *args)

    def send_json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        gz = len(body) > 50000 and "gzip" in (self.headers.get("Accept-Encoding") or "")
        if gz:
            body = gzip.compress(body, 5)
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        if gz:
            self.send_header("Content-Encoding", "gzip")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        u = urlparse(self.path)
        if not u.path.startswith("/api/"):
            return super().do_GET()
        if not READY.is_set():
            return self.send_json({"loading": True}, 503)
        p = parse_qs(u.query)
        ds = DSS.get(p.get("ds", ["kenet"])[0], DSS["kenet"])
        try:
            if u.path == "/api/stats":
                self.send_json({k: {"synsets": len(d.syn), "literals": sum(len(s["lits"]) for s in d.syn),
                                    "relations": sum(len(s["sr"]) for s in d.syn)} for k, d in DSS.items()})
            elif u.path == "/api/search":
                t0 = time.time()
                r = search(ds, p)
                r["ms"] = round((time.time() - t0) * 1000)
                self.send_json(r)
            elif u.path == "/api/synset":
                d = detail(ds, p.get("id", [""])[0])
                self.send_json(d if d else {"error": "not found"}, 200 if d else 404)
            elif u.path == "/api/pb":
                self.send_json(pb_tr_search(p) if _q(p, "lang") == "tr" else pb_en_search(p))
            elif u.path == "/api/roleset":
                d = roleset_detail(_q(p, "id"))
                self.send_json(d if d else {"error": "not found"}, 200 if d else 404)
            elif u.path == "/api/fn":
                self.send_json(fn_tr_search(p) if _q(p, "lang") == "tr" else fn_en_search(p))
            elif u.path == "/api/frame":
                d = frame_detail(_q(p, "name"))
                self.send_json(d if d else {"error": "not found"}, 200 if d else 404)
            elif u.path == "/api/srl":
                self.send_json(srl(p.get("text", [""])[0], int(_q(p, "pred", "-1") or -1), _q(p, "cases")))
            elif u.path == "/api/pbquiz":
                self.send_json({"questions": pbquiz(min(10, int(_q(p, "n", "5") or 5)))})
            elif u.path == "/api/suggest":
                self.send_json(suggest(p))
            elif u.path == "/api/vn":
                self.send_json(vn_search(p))
            elif u.path == "/api/nb":
                self.send_json(nb_predict(p))
            elif u.path == "/api/nbeval":
                self.send_json(nb_eval(p))
            elif u.path == "/api/nblemmas":
                self.send_json({"lemmas": nb_lemmas(_q(p, "corpus", "semcor"))})
            elif u.path == "/api/corpus":
                self.send_json(corpus_get(p.get("name", ["boun"])[0], int(p.get("n", ["0"])[0] or 0)))
            elif u.path == "/api/zemberek":
                st = ZEM["state"]
                if st == "starting":
                    return self.send_json({"loading": True}, 503)
                if st != "ready":
                    return self.send_json({"available": False, "error": ZEM["error"]})
                if p.get("w"):
                    self.send_json({"available": True, **zem_call("A", p["w"][0])})
                elif p.get("s"):
                    self.send_json({"available": True, **zem_call("S", p["s"][0])})
                elif p.get("i"):
                    self.send_json({"available": True, **zem_call("I", p["i"][0])})
                elif p.get("g") or p.get("o"):
                    cmd = "G" if p.get("g") else "O"
                    self.send_json({"available": True, **zem_call(cmd, p[cmd.lower()][0], p.get("pos", [""])[0], p.get("ids", [""])[0])})
                else:
                    self.send_json({"available": True})
            elif u.path == "/api/relate":
                r = relate(ds, p.get("a", [""])[0], p.get("b", [""])[0])
                self.send_json(r)
            elif u.path == "/api/wsd":
                r = wsd(ds, p.get("text", [""])[0], p.get("target", [""])[0], p.get("ext", ["1"])[0] == "1",
                        p.get("lemma", [""])[0])
                self.send_json(r)
            elif u.path == "/api/quiz":
                self.send_json({"questions": quiz(ds, min(10, int(p.get("n", ["5"])[0] or 5)), p.get("kind", ["hyper"])[0])})
            elif u.path == "/api/random":
                n = min(30, int(p.get("n", ["10"])[0] or 10))
                pool = [i for i, s in enumerate(ds.syn) if s["ex"] or ds.key == "en"]
                self.send_json({"results": [view(ds, i) for i in random.sample(pool, n)]})
            elif u.path == "/api/ud":
                if p.get("lex"):
                    self.send_json({"lemmas": ud_index()["lemmas"]})
                elif p.get("w"):
                    self.send_json(ud_word(p["w"][0]))
                elif p.get("id"):
                    r = ud_get(p["id"][0])
                    self.send_json(r or {"error": "not found"}, 200 if r else 404)
                else:
                    self.send_json(ud_search(p.get("q", [""])[0], int(p.get("min", ["1"])[0] or 1), int(p.get("max", ["999"])[0] or 999),
                                             min(100, int(p.get("limit", ["30"])[0] or 30))))
            else:
                self.send_json({"error": "not found"}, 404)
        except (ValueError, BrokenPipeError) as e:
            self.send_json({"error": str(e)}, 400)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8770"))
    srv = ThreadingHTTPServer(("127.0.0.1", port), Handler)

    class Srv6(ThreadingHTTPServer):
        address_family = socket.AF_INET6

    # Windows'ta "localhost" önce ::1'e gider; orada dinleyen yoksa her bağlantı ~250 ms bekler. Yalnızca yerel ::1 de dinlenir (dışarıya açılmaz).
    try:
        threading.Thread(target=Srv6(("::1", port), Handler).serve_forever, daemon=True).start()
    except OSError:
        pass
    threading.Thread(target=load_all, daemon=True).start()
    threading.Thread(target=zem_start, daemon=True).start()
    print(f"http://127.0.0.1:{port}  (veri arka planda yükleniyor)", flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
