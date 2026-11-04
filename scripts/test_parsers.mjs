// Üstten alta ve shift-reduce izleri için denetim: node scripts/test_parsers.mjs
import {topDown, shiftReduce} from "../static/js/parsers.js";
const R = (...l) => l.map(s => { const [a, b] = s.split("->"); return {lhs:a.trim(), rhs:b.trim().split(/\s+/)}; });
let bad = 0, total = 0;
const check = (name, got, want) => { total++; if(got !== want){ bad++; console.log("FAIL", name, "beklenen", want, "bulunan", got); } };

const g = R("S -> NP VP", "NP -> Det N", "NP -> N", "VP -> V NP", "VP -> V", "Det -> the", "N -> dog", "N -> cat", "V -> saw", "V -> barks");
check("top-down: the dog barks", topDown(g, "the dog barks".split(" "), "S").ok, true);
check("top-down: the cat saw the dog", topDown(g, "the cat saw the dog".split(" "), "S").ok, true);
check("top-down: dog the (olmaz)", topDown(g, "dog the".split(" "), "S").exhausted, true);
check("shift-reduce: the dog barks", shiftReduce(g, "the dog barks".split(" "), "S").ok, true);
check("shift-reduce: the cat saw the dog", shiftReduce(g, "the cat saw the dog".split(" "), "S").ok, true);
check("shift-reduce: dog the (olmaz)", shiftReduce(g, "dog the".split(" "), "S").exhausted, true);
// geri dönüş: VP -> V NP, VP -> V sırası; "saw" sonrası girdi var
const t = topDown(g, "the dog saw the cat".split(" "), "S");
check("top-down geri dönüş izleri", t.steps.some(s => s.kind === "fail") && t.ok, true);
// sol özyineleme: NP -> NP PP ilk kural olunca budamasız top-down bitmez, budamalı biter
const lr = R("S -> NP VP", "NP -> NP PP", "NP -> N", "PP -> P NP", "VP -> V NP", "N -> kids", "N -> birds", "N -> binoculars", "V -> saw", "P -> with");
const sent = "kids saw birds with binoculars".split(" ");
check("sol özyineleme, budamasız: bitmez", topDown(lr, sent, "S", {cap:300}).capped, true);
check("sol özyineleme, budamalı: başarır", topDown(lr, sent, "S", {cap:600, prune:true}).ok, true);
check("shift-reduce sol özyinelemeyi çözer", shiftReduce(lr, sent, "S").ok, true);
// InClass 3: cümle gramerde yok
const ic3 = R("S -> NP VP", "S -> VP NP", "NP -> D NP", "NP -> N", "NP -> ADJ NP", "NP -> ADJ N", "VP -> V NP", "VP -> V N", "VP -> N V", "VP -> V ADV", "VP -> AUX VP", "VP -> AUX V",
  "N -> quick", "N -> position", "N -> open", "N -> time", "N -> response", "V -> help", "V -> position", "V -> open", "V -> time", "V -> require", "D -> the", "D -> a", "D -> some",
  "ADJ -> good", "ADJ -> quick", "ADJ -> open", "ADV -> fast", "ADV -> quick", "AUX -> may", "AUX -> can");
check("InClass 3, shift-reduce: yok", shiftReduce(ic3, "the open position may require quick response time".split(" "), "S", {cap:5000}).ok, false);
check("InClass 3, shift-reduce: the quick response may help var", shiftReduce(ic3, "the quick response may help".split(" "), "S", {cap:5000}).ok, true);
check("InClass 3, top-down: the quick response may help var", topDown(ic3, "the quick response may help".split(" "), "S", {cap:5000}).ok, true);
console.log("ayrıştırma yöntemleri denetimi:", total - bad, "/", total);
if(bad) process.exitCode = 1;
