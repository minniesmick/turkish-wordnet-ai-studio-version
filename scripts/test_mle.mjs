// PCFG MLE denetimi: node scripts/test_mle.mjs
import {parseTrees, learn, toGrammar} from "../static/js/mle.js";
let bad = 0, total = 0;
const check = (name, got, want) => { total++; const ok = typeof want === "number" ? Math.abs(got - want) < 1e-9 : got === want; if(!ok){ bad++; console.log("FAIL", name, "beklenen", want, "bulunan", got); } };
const tb = `(S (NP (Det the) (N dog)) (VP (V barks)))
(S (NP (Det the) (N cat)) (VP (V saw) (NP (Det the) (N dog))))
(S (NP (Det a) (N dog)) (VP (V saw) (NP (Det a) (N cat))))`;
const trees = parseTrees(tb), L = learn(trees);
const P = (l, r) => L.rules.find(x => x.lhs === l && x.rhs.join(" ") === r)?.p;
check("ağaç sayısı", trees.length, 3);
check("S -> NP VP", P("S", "NP VP"), 1);
check("NP -> Det N", P("NP", "Det N"), 1);
check("VP -> V", P("VP", "V"), 1 / 3);
check("VP -> V NP", P("VP", "V NP"), 2 / 3);
check("Det -> the", P("Det", "the"), 3 / 5);
check("Det -> a", P("Det", "a"), 2 / 5);
check("N -> dog", P("N", "dog"), 3 / 5);
check("V -> saw", P("V", "saw"), 2 / 3);
// her sol tarafın olasılıkları 1'e toplanır
for(const l of L.lhs) check("Σ " + l, L.rules.filter(r => r.lhs === l).reduce((a, r) => a + r.p, 0), 1);
// ağaç olasılığı: ağaç 1 = S->NP VP (1) · NP->Det N (1) · Det->the (3/5) · N->dog (3/5) · VP->V (1/3) · V->barks (1/3)
check("ağaç 1 olasılığı", L.probs[0], 1 * 1 * (3 / 5) * (3 / 5) * (1 / 3) * (1 / 3));
check("toGrammar satırı", toGrammar(L).split("\n").some(s => s.startsWith("VP -> V [0.333333] | V NP [0.666667]")), true);
// hata durumları
let e1 = ""; try{ parseTrees("(S (NP a)"); }catch(e){ e1 = e.message; }
check("kapanmayan parantez", e1, "Kapanmayan parantez");
let e2 = ""; try{ parseTrees("S (NP a)"); }catch(e){ e2 = e.message; }
check("başlangıç parantezi", e2.startsWith("Ağaç “(” ile başlamalı"), true);
console.log("PCFG MLE denetimi:", total - bad, "/", total);
if(bad) process.exitCode = 1;
