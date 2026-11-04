#!/usr/bin/env python3
"""NLTK veri deposundaki (nltk_data) kaynaklardan arayüzün ihtiyaç duyduğu ek verileri üretir.

Kaynaklar (yoksa indirilir; hepsi https://github.com/nltk/nltk_data/tree/gh-pages/packages/corpora):
  wordnet31    Princeton WordNet 3.1 sözlük dosyaları -> sense sırası/sıklığı, örnek cümleler, lexname, fiil kalıpları
  semcor       SemCor 3.0 (anlam etiketli Brown)     -> denetimli WSD verisi + bilgi içeriği (IC) sayımları
  senseval     SENSEVAL-2 (hard, interest, line, serve) -> denetimli WSD verisi
  verbnet3     VerbNet 3.3                           -> sınıf / üye / tematik rol / çerçeve
  framenet_v17 FrameNet 1.7 LU dosyaları             -> sözcük birimi başına anotasyonlu örnekler

Çıktılar (data/): wn31_extra.json.gz  semcor.json.gz  senseval.json.gz  verbnet.json  framenet_lu_ex.json.gz
Kullanım:  python3 scripts/build_nltk.py [--cache DIR] [--only wn31,semcor,senseval,verbnet,fnlu]
"""
import argparse
import gzip
import json
import os
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
BASE = "https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/corpora/"
SS = {"1": "n", "2": "v", "3": "a", "4": "r", "5": "s"}


def fetch(pkg, cache):
    """Paketi cache klasörüne indirip açar; açılmış klasörün yolunu döndürür."""
    out = os.path.join(cache, pkg)
    if os.path.isdir(out):
        return out
    os.makedirs(cache, exist_ok=True)
    z = os.path.join(cache, pkg + ".zip")
    if not os.path.exists(z):
        print(f"indiriliyor: {pkg}…", flush=True)
        urllib.request.urlretrieve(BASE + pkg + ".zip", z)
    zipfile.ZipFile(z).extractall(cache)
    return out


def dump_gz(obj, name):
    with gzip.open(os.path.join(DATA, name), "wt", encoding="utf8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{name}: {os.path.getsize(os.path.join(DATA, name)) / 1e6:.1f} MB", flush=True)


# --------------------------------------------------------------- WordNet 3.1
def sense_map(wn):
    """index.sense: sense_key -> (synset_id, sense_no, tag_count); ayrıca synset -> [[lemma,no,cnt]]"""
    keys, per_syn = {}, {}
    for line in open(os.path.join(wn, "index.sense"), encoding="utf8"):
        k, off, no, cnt = line.split()
        lemma, _, rest = k.partition("%")
        sid = f"{off}-{SS[rest.split(':')[0]]}"
        keys[k] = (sid, int(no), int(cnt))
        per_syn.setdefault(sid, []).append([lemma, int(no), int(cnt)])
    return keys, per_syn


def build_wn31(wn):
    lexnames = {}
    for line in open(os.path.join(wn, "lexnames"), encoding="utf8"):
        p = line.split()
        if len(p) >= 2:
            lexnames[int(p[0])] = p[1]
    frames = {}
    for line in open(os.path.join(wn, "verb.Framestext"), encoding="utf8"):
        m = re.match(r"(\d+)\s+(.*)", line.strip())
        if m:
            frames[int(m.group(1))] = m.group(2)
    _, per_syn = sense_map(wn)
    syn = {}
    for fn in ("data.noun", "data.verb", "data.adj", "data.adv"):
        for line in open(os.path.join(wn, fn), encoding="utf8"):
            if line.startswith("  "):
                continue
            head, _, gloss = line.rstrip("\n").partition(" | ")
            t = head.split()
            off, lex, ss, wc = t[0], int(t[1]), t[2], int(t[3], 16)
            i = 4 + 2 * wc
            p = int(t[i])
            i += 1 + 4 * p
            frs = []
            if ss == "v" and i < len(t):
                f = int(t[i])
                i += 1
                for _ in range(f):
                    frs.append(int(t[i + 1]))
                    i += 3
            sid = f"{off}-{ss}"
            e = {"lx": lex}
            ex = re.findall(r'"([^"]*)"', gloss)
            if ex:
                e["ex"] = ex
            if frs:
                e["fr"] = sorted(set(frs))
            if sid in per_syn:
                e["sn"] = per_syn[sid]
            syn[sid] = e
    dump_gz({"lexnames": lexnames, "frames": frames, "syn": syn}, "wn31_extra.json.gz")


# --------------------------------------------------------------------- SemCor
def build_semcor(sc, wn):
    keys, _ = sense_map(wn)
    sents, inst, miss = [], [], 0
    for sub in ("brown1", "brown2", "brownv"):
        d = os.path.join(sc, sub, "tagfiles")
        for fn in sorted(os.listdir(d)):
            text = open(os.path.join(d, fn), encoding="latin-1").read()
            for m in re.finditer(r"<s snum=\"\d+\">(.*?)</s>", text, re.S):
                toks, cur = [], []
                for t in re.finditer(r"<wf ([^>]*)>([^<]*)</wf>", m.group(1)):
                    a = dict(re.findall(r'(\w+)="([^"]*)"', t.group(1)))
                    toks.append(t.group(2).lower())
                    if a.get("cmd") == "done" and a.get("lemma") and a.get("lexsn"):
                        k = f"{a['lemma'].lower()}%{a['lexsn'].split(';')[0]}"
                        if k in keys:
                            cur.append([len(toks) - 1, a["lemma"].lower(), keys[k][0], a.get("pos", "")])
                        else:
                            miss += 1
                if len(toks) >= 3 and cur:
                    si = len(sents)
                    sents.append(" ".join(toks))
                    inst += [[si] + c for c in cur]
    print(f"semcor: {len(sents):,} cümle, {len(inst):,} anlam etiketi, {miss:,} eşleşmeyen anahtar", flush=True)
    dump_gz({"sents": sents, "inst": inst}, "semcor.json.gz")


# ------------------------------------------------------------------- SENSEVAL
def build_senseval(sv):
    out = {}
    for fn in ("hard.pos", "interest.pos", "line.pos", "serve.pos"):
        raw = open(os.path.join(sv, fn), encoding="latin-1").read()
        item = re.search(r'<lexelt item="([^"]+)"', raw).group(1)
        ins = []
        for m in re.finditer(r"<instance id=\"[^\"]*\">(.*?)</instance>", raw, re.S):
            body = m.group(1)
            senses = re.findall(r'senseid="([^"]+)"', body)
            ctx = re.search(r"<context>(.*?)</context>", body, re.S)
            if not senses or not ctx:
                continue
            toks, pos, head = [], [], -1
            for t in re.finditer(r'(<head>\s*)?<wf pos="([^"]*)">([^<]*)</wf>', ctx.group(1)):
                if t.group(1) and head < 0:
                    head = len(toks)
                toks.append(t.group(3).lower())
                pos.append(t.group(2))
            if head >= 0:
                ins.append({"s": senses, "t": toks, "p": pos, "h": head})
        out[item] = ins
        print(f"senseval {item}: {len(ins):,}", flush=True)
    dump_gz(out, "senseval.json.gz")


# -------------------------------------------------------------------- VerbNet
def restr(el):
    if el is None:
        return ""
    parts = []
    for c in el:
        if c.tag in ("SELRESTR", "SYNRESTR"):
            parts.append(("-" if c.get("Value") == "-" else "+") + (c.get("type") or ""))
        elif c.tag in ("SELRESTRS", "SYNRESTRS"):
            s = restr(c)
            if s:
                parts.append("(" + s + ")")
    return (" ∨ " if el.get("logic") == "or" else " ∧ ").join(parts)


def build_verbnet(vn):
    classes = []

    def walk(el, parent):
        cid = el.get("ID")
        frames = []
        for f in el.findall("FRAMES/FRAME"):
            d = f.find("DESCRIPTION")
            syn = []
            for c in f.find("SYNTAX") if f.find("SYNTAX") is not None else []:
                syn.append([c.tag, c.get("value") or "", restr(c.find("SYNRESTRS"))])
            sem = []
            for p in f.findall("SEMANTICS/PRED"):
                args = ", ".join((a.get("value") or "") for a in p.findall("ARGS/ARG"))
                sem.append(("¬" if p.get("bool") == "!" else "") + (p.get("value") or "") + f"({args})")
            frames.append({"p": d.get("primary") if d is not None else "", "s": d.get("secondary") if d is not None else "",
                           "ex": [e.text for e in f.findall("EXAMPLES/EXAMPLE") if e.text], "syn": syn, "sem": sem})
        classes.append({"id": cid, "parent": parent,
                        "members": [{"n": m.get("name"), "wn": m.get("wn", ""), "g": m.get("grouping", "")} for m in el.findall("MEMBERS/MEMBER")],
                        "roles": [{"t": r.get("type"), "sel": restr(r.find("SELRESTRS"))} for r in el.findall("THEMROLES/THEMROLE")],
                        "frames": frames})
        for sub in el.findall("SUBCLASSES/VNSUBCLASS"):
            walk(sub, cid)

    for fn in sorted(os.listdir(vn)):
        if fn.endswith(".xml"):
            walk(ET.parse(os.path.join(vn, fn)).getroot(), None)
    json.dump(classes, open(os.path.join(DATA, "verbnet.json"), "w", encoding="utf8"), ensure_ascii=False, separators=(",", ":"))
    print(f"verbnet.json: {len(classes)} sınıf (alt sınıflar dahil)", flush=True)


# ----------------------------------------------------- FrameNet LU örnekleri
def build_fnlu(zpath):
    ns = "{http://framenet.icsi.berkeley.edu}"
    z = zipfile.ZipFile(zpath)
    names = [n for n in z.namelist() if re.search(r"/lu/lu\d+\.xml$", n)]
    out, n_ex = {}, 0
    for k, name in enumerate(names):
        root = ET.fromstring(z.read(name))
        frame, lu = root.get("frame"), root.get("name")
        exs = []
        for s in root.iter(ns + "sentence"):
            text = (s.findtext(ns + "text") or "").strip()
            if not text or len(text) > 230:
                continue
            for a in s.findall(ns + "annotationSet"):
                if a.get("status") != "MANUAL":
                    continue
                fes, tg = [], None
                for lay in a.findall(ns + "layer"):
                    for lab in lay.findall(ns + "label"):
                        if lab.get("start") is None or lab.get("end") is None:
                            continue
                        st, en = int(lab.get("start")), int(lab.get("end")) + 1
                        if lay.get("name") == "FE":
                            fes.append({"n": lab.get("name"), "s": st, "e": en})
                        elif lay.get("name") == "Target":
                            tg = [st, en]
                if tg and len(fes) >= 2:
                    exs.append((len(fes), {"t": text, "tg": tg, "fe": fes}))
                    break
        exs.sort(key=lambda x: -x[0])
        if exs and frame and lu:
            out.setdefault(frame, {})[lu] = [e for _, e in exs[:2]]
            n_ex += min(2, len(exs))
        if k % 2000 == 0:
            print(f"  {k}/{len(names)}", flush=True)
    print(f"framenet_lu_ex: {len(out)} çerçeve, {n_ex:,} örnek", flush=True)
    dump_gz(out, "framenet_lu_ex.json.gz")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", default=os.path.join(ROOT, ".nltk_cache"))
    ap.add_argument("--only", default="wn31,semcor,senseval,verbnet,fnlu")
    a = ap.parse_args()
    only = set(a.only.split(","))
    os.makedirs(DATA, exist_ok=True)
    if only & {"wn31", "semcor"}:
        wn = fetch("wordnet31", a.cache)
    if "wn31" in only:
        build_wn31(wn)
    if "semcor" in only:
        build_semcor(fetch("semcor", a.cache), wn)
    if "senseval" in only:
        build_senseval(fetch("senseval", a.cache))
    if "verbnet" in only:
        build_verbnet(fetch("verbnet3", a.cache))
    if "fnlu" in only:
        z = os.path.join(a.cache, "framenet_v17.zip")
        if not os.path.exists(z):
            os.makedirs(a.cache, exist_ok=True)
            print("FrameNet 1.7 indiriliyor (~99 MB)…", flush=True)
            urllib.request.urlretrieve(BASE + "framenet_v17.zip", z)
        build_fnlu(z)


if __name__ == "__main__":
    sys.exit(main())
