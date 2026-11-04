// Zemberek -> UD eşlemesi ve karşılaştırma sayacı denetimi: node scripts/test_zmap.mjs (Zemberek gerekmez)
import {zUpos, zLemma, matchZ, groups, newTally, tallySentence} from "../static/js/zmap.js";
import {uposOf} from "../static/js/md.js";
let bad = 0, total = 0;
const check = (name, got, want) => { total++; if(got !== want){ bad++; console.log("FAIL", name, "beklenen", want, "bulunan", got); } };

const U = [
  ["okul+Noun+A3pl+P1sg", "NOUN"], ["gel+Verb+Pos+Past+A3sg", "VERB"], ["güzel+Adj", "ADJ"], ["bugün+Adverb", "ADV"], ["bu+Det", "DET"], ["ve+Conj", "CCONJ"],
  ["ile+Postp+PCNom", "ADP"], ["ben+Pron+Pers+A1sg+Pnon+Nom", "PRON"], ["üç+Num+Card", "NUM"], ["mi+Ques+Pres+A3sg", "AUX"], ["hey+Interj", "INTJ"], [".+Punc", "PUNCT"],
  ["Ankara+Noun+Prop+A3sg+Pnon+Loc", "PROPN"],
  ["gel+Verb^DB+Adj+PresPart", "VERB"], ["yap+Verb^DB+Noun+Inf2+A3sg+Pnon+Nom", "VERB"], ["gel+Verb^DB+Adv+AfterDoing", "VERB"], ["ed+Verb^DB+Verb+Able+Aor+A3sg", "VERB"],
  ["ev+Noun+A3sg+Pnon+Nom^DB+Verb+Zero+Pres+A3sg+Cop", "NOUN"], ["güzel+Adj^DB+Verb+Zero+Pres+A3sg+Cop", "ADJ"],
  ["kitap+Noun+A3sg^DB+Noun+Agt+A3sg", "NOUN"], ["güzel+Adj^DB+Noun+Ness+A3sg", "NOUN"]
];
for(const [s, w] of U) check("zUpos " + s, zUpos(s), w);
check("groups sayısı", groups("ev+Noun+A3sg^DB+Verb+Zero+Pres+A3sg").length, 2);
check("groups ikinci grup türü", groups("ev+Noun+A3sg^DB+Verb+Zero+Pres+A3sg")[1].pos, "Verb");

check("zLemma fiil", zLemma({lemma:"gelmek", pos:"Verb", stem:"gel"}), "gel");
check("zLemma isim", zLemma({lemma:"Okul", pos:"Noun", stem:"okul"}), "okul");
check("zLemma -mak", zLemma({lemma:"yapmak", pos:"Verb", stem:"yap"}), "yap");
check("matchZ lemma sözlük maddesinden", matchZ({lemma:"gelmek", pos:"Verb", stem:"gel", oflazer:"gel+Verb+Pos+Past+A3sg"}, "gel", "VERB").lemma, true);
check("matchZ lemma yüzey kökten", matchZ({lemma:"sunucu", pos:"Noun", stem:"sunucu", oflazer:"sunucu+Noun+A3sg"}, "Sunucu", "NOUN").lemma, true);
check("matchZ UPOS yanlış", matchZ({lemma:"da", pos:"Conj", stem:"da", oflazer:"da+Conj"}, "da", "PART").upos, false);

// sayaç: iki sözcüklü cümle ve bir noktalama
const s = {f:["Evde", "kal", "."], l:["ev", "kal", "."], p:["NOUN", "VERB", "PUNCT"]};
const tok = (tag, base, lemma) => ({base, dl:{tag}, ap:{tag}, cands:[{tag:base, lemma}, {tag, lemma}]});
const mine = [tok("NOUN Case=Loc", "NOUN Case=Loc", "ev"), tok("NOUN Case=Nom", "VERB Mood=Imp", "kal"), tok("PUNCT _", "PUNCT _", ".")];
const z = [{best:{lemma:"ev", pos:"Noun", stem:"ev", oflazer:"ev+Noun+A3sg+Pnon+Loc"}, all:[{lemma:"ev", pos:"Noun", stem:"ev", oflazer:"ev+Noun+A3sg+Pnon+Loc"}]},
  {best:{lemma:"kalmak", pos:"Verb", stem:"kal", oflazer:"kal+Verb+Pos+Imp+A2sg"}, all:[{lemma:"kalmak", pos:"Verb", stem:"kal", oflazer:"kal+Verb+Pos+Imp+A2sg"}]},
  {best:{lemma:".", pos:"Punc", stem:".", oflazer:".+Punc"}, all:[]}];
const T = newTally();
check("sayaç uygun cümle", tallySentence(T, s, mine, z, uposOf), true);
check("sayaç sözcük (noktalamasız)", T.n, 2);
check("Zemberek kök ve UPOS", T.rows.zem.l + "/" + T.rows.zem.u + "/" + T.rows.zem.b, "2/2/2");
check("perceptron UPOS (ikinci sözcük yanlış)", T.rows.ap.u, 1);
check("taban çizgisi UPOS (ikisi de doğru)", T.rows.base.u, 2);
check("sayaç uyumsuz cümleyi atlar", tallySentence(T, s, mine, z.slice(0, 2), uposOf), false);
check("atlanan sayısı", T.skipped, 1);
console.log("Zemberek eşleme denetimi:", total - bad, "/", total);
if(bad) process.exitCode = 1;
