#!/usr/bin/env python3
"""İngilizce PropBank 3.4 frame dosyaları ve FrameNet 1.7 verisinden sunucunun okuyacağı kompakt JSON'ları üretir.

Kaynaklar (yoksa indirilir):
  PropBank 3.4 frames : https://github.com/propbank/propbank-frames        (CC BY-SA 4.0)
  FrameNet 1.7        : NLTK veri deposundaki framenet_v17.zip (ICSI, CC BY 3.0)

Çıktı:  data/propbank_en.json  data/framenet_en.json
Kullanım:  python3 scripts/build_srl.py [--pb DIR/frames] [--fn DIR/framenet_v17]
"""
import argparse
import html
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.request
import xml.etree.ElementTree as ET
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
FN_NS = "{http://framenet.icsi.berkeley.edu}"


# ------------------------------------------------------------------ PropBank
def ints(s):
    return [int(x) for x in re.findall(r"\d+", s or "")]


def build_propbank(frames_dir):
    out = []
    files = sorted(f for f in os.listdir(frames_dir) if f.endswith(".xml"))
    for fn in files:
        try:
            root = ET.parse(os.path.join(frames_dir, fn)).getroot()
        except ET.ParseError:
            continue
        for pred in root.iter("predicate"):
            lemma = pred.get("lemma", "")
            for rs in pred.findall("roleset"):
                roles = []
                for r in rs.iterfind("roles/role"):
                    th = []
                    for rl in r.iterfind("rolelinks/rolelink"):
                        if rl.get("resource") == "VerbNet" and rl.get("class") != "best_guess" and (rl.text or "").strip():
                            th.append((rl.text or "").strip())
                    roles.append({"n": r.get("n", ""), "f": (r.get("f") or "").lower(), "d": r.get("descr", ""),
                                  "vt": sorted(set(th))})
                lex = list(rs.iterfind("lexlinks/lexlink"))
                fnl = sorted({l.get("class") for l in lex if l.get("resource") == "FrameNet"})
                vnl = sorted({l.get("class") for l in lex if l.get("resource") == "VerbNet"})
                ex = []
                for e in rs.findall("example")[:3]:
                    text = (e.findtext("text") or "").strip()
                    pb = e.find("propbank")
                    if not text or pb is None:
                        continue
                    rel = []
                    for r in pb.findall("rel"):
                        rel += ints(r.get("relloc"))
                    args = []
                    for a in pb.findall("arg"):
                        s, en = ints(a.get("start")), ints(a.get("end"))
                        if s and en:
                            args.append({"t": a.get("type", ""), "s": s[0], "e": en[0], "f": (a.get("f") or "")})
                    ex.append({"name": e.get("name", ""), "text": text, "rel": rel, "args": args})
                out.append({"id": rs.get("id", ""), "lemma": lemma, "name": rs.get("name", ""),
                            "al": [{"p": a.get("pos", ""), "w": (a.text or "").strip()} for a in rs.iterfind("aliases/alias")],
                            "roles": roles, "fn": fnl, "vn": vnl, "ex": ex})
    return out


# ------------------------------------------------------------------ FrameNet
def plain_with_spans(raw):
    """<ex> / tanım içeriğini düz metne çevirir; <fex> ve <t> aralıklarını döndürür."""
    raw = re.sub(r"\s+", " ", raw)
    text, spans, pos, stack = "", [], 0, []
    for m in re.finditer(r"<(/?)(\w+)([^>]*)>|([^<]+)", raw):
        if m.group(4) is not None:
            text += m.group(4)
            continue
        close, tag, attrs = m.group(1), m.group(2), m.group(3)
        if tag not in ("fex", "t"):
            continue
        if not close:
            nm = re.search(r'name="([^"]*)"', attrs)
            stack.append((tag, len(text), nm.group(1) if nm else ""))
        elif stack:
            tg, st, nm = stack.pop()
            spans.append({"k": tg, "s": st, "e": len(text), "n": nm})
    lead = len(text) - len(text.lstrip())
    text = text.strip()
    spans = [{**sp, "s": max(0, sp["s"] - lead), "e": min(len(text), sp["e"] - lead)} for sp in spans]
    return text, spans


def clean_def(raw):
    raw = html.unescape(raw or "")
    raw = re.sub(r"</?def-root>", "", raw)
    exs = [plain_with_spans(m) for m in re.findall(r"<ex>(.*?)</ex>", raw, flags=re.S)]
    body = re.sub(r"<ex>.*?</ex>", "", raw, flags=re.S)
    body = re.sub(r"<fen>(.*?)</fen>", r"\1", body, flags=re.S)
    body = re.sub(r"<[^>]+>", "", body)
    body = re.sub(r"\s+", " ", body).strip()
    return body, [{"t": t, "sp": sp} for t, sp in exs if t.strip()]


def build_framenet(fn_dir):
    frames = {}
    for fn in sorted(os.listdir(os.path.join(fn_dir, "frame"))):
        if not fn.endswith(".xml"):
            continue
        root = ET.parse(os.path.join(fn_dir, "frame", fn)).getroot()
        d, ex = clean_def(root.findtext(FN_NS + "definition"))
        fes = []
        for fe in root.findall(FN_NS + "FE"):
            fd, _ = clean_def(fe.findtext(FN_NS + "definition"))
            st = fe.find(FN_NS + "semType")
            fes.append({"n": fe.get("name"), "ab": fe.get("abbrev", ""), "c": fe.get("coreType", ""), "d": fd,
                        "st": st.get("name") if st is not None else ""})
        lus = [{"n": lu.get("name"), "p": lu.get("POS", "")} for lu in root.findall(FN_NS + "lexUnit")]
        frames[root.get("name")] = {"name": root.get("name"), "id": root.get("ID"), "d": d, "ex": ex[:3], "fes": fes,
                                    "lus": lus, "rels": []}
    rr = ET.parse(os.path.join(fn_dir, "frRelation.xml")).getroot()
    for t in rr.findall(FN_NS + "frameRelationType"):
        name, sub_l, sup_l = t.get("name"), t.get("subFrameName"), t.get("superFrameName")
        for r in t.findall(FN_NS + "frameRelation"):
            sub, sup = r.get("subFrameName"), r.get("superFrameName")
            if sub in frames and sup in frames:
                frames[sub]["rels"].append({"t": name, "as": sub_l, "o": sup})   # sub: "super"'e bağlı
                frames[sup]["rels"].append({"t": name, "as": sup_l, "o": sub})
    return list(frames.values())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pb")
    ap.add_argument("--fn")
    a = ap.parse_args()
    tmp = tempfile.mkdtemp()
    pb = a.pb
    if not pb:
        print("PropBank frames indiriliyor (git clone --depth 1)…")
        subprocess.check_call(["git", "clone", "-q", "--depth", "1", "https://github.com/propbank/propbank-frames", os.path.join(tmp, "pb")])
        pb = os.path.join(tmp, "pb", "frames")
    fn = a.fn
    if not fn:
        print("FrameNet 1.7 indiriliyor (~99 MB)…")
        z = os.path.join(tmp, "fn.zip")
        urllib.request.urlretrieve("https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/corpora/framenet_v17.zip", z)
        zipfile.ZipFile(z).extractall(tmp, [n for n in zipfile.ZipFile(z).namelist() if "/frame/" in n or n.endswith("frRelation.xml")])
        fn = os.path.join(tmp, "framenet_v17")
    os.makedirs(DATA, exist_ok=True)
    p = build_propbank(pb)
    json.dump(p, open(os.path.join(DATA, "propbank_en.json"), "w", encoding="utf8"), ensure_ascii=False, separators=(",", ":"))
    print("propbank_en.json:", len(p), "roleset")
    f = build_framenet(fn)
    json.dump(f, open(os.path.join(DATA, "framenet_en.json"), "w", encoding="utf8"), ensure_ascii=False, separators=(",", ":"))
    print("framenet_en.json:", len(f), "frame")


if __name__ == "__main__":
    sys.exit(main())
