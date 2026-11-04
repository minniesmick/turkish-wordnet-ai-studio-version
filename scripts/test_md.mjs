// Morfolojik belirsizlik giderme denetimi: node scripts/test_md.mjs
import fs from "node:fs";
import {parseConllu, split, train, evaluate, analyze, candidates, buildLexicon, topRules, tagOf, uposOf, featsOf} from "../static/js/md.js";
let bad = 0, total = 0;
const check = (name, got, want) => { total++; if(got !== want){ bad++; console.log("FAIL", name, "beklenen", want, "bulunan", got); } };
const S = (pairs) => ({f:pairs.map(p => p[0]), l:pairs.map(p => p[0]), p:pairs.map(p => p[1]), x:pairs.map(p => p[2] || "_")});

// etiket yardımcıları
check("tagOf boş özellik", tagOf("PUNCT", "_"), "PUNCT _");
check("tagOf özellikli", tagOf("NOUN", "Case=Loc|Number=Sing"), "NOUN Case=Loc|Number=Sing");
check("uposOf", uposOf("NOUN Case=Loc|Number=Sing"), "NOUN");
check("featsOf", featsOf("NOUN Case=Loc|Number=Sing"), "Case=Loc|Number=Sing");

// küçük korpus: "a" çoğunlukla DET ama "a c" bağlamında PRON; taban çizgisi bağlama bakamaz
const tiny = [
  ...Array.from({length:3}, () => S([["a", "DET"], ["b", "NOUN"]])),
  ...Array.from({length:2}, () => S([["a", "PRON"], ["c", "VERB"]]))
];
const m = train(tiny);
const r1 = analyze(m, ["a", "c"]);
check("küçük: aday sayısı", r1[0].cands.length, 2);
check("küçük: taban çizgisi en sık (DET)", r1[0].base, "DET _");
check("küçük: karar listesi bağlamdan PRON", r1[0].dl.tag, "PRON _");
check("küçük: perceptron bağlamdan PRON", r1[0].ap.tag, "PRON _");
const r2 = analyze(m, ["a", "b"]);
check("küçük: a b bağlamında DET (perceptron)", r2[0].ap.tag, "DET _");
check("küçük: a b bağlamında DET (karar listesi)", r2[0].dl.tag, "DET _");
check("küçük: belirsiz olmayan sözcük tek aday", r1[1].cands.length, 1);
check("küçük: görülmeyen sözcük bilinmeyen", analyze(m, ["zzz"])[0].known, false);

// aday kümesi: görülen sözcük, sonek geri dönüşü ve tek geçen sözcüğün kendi etiketinin düşülmesi
const sfx = buildLexicon([S([["evde", "NOUN", "Case=Loc"]]), S([["okulda", "NOUN", "Case=Loc"]]), S([["evden", "NOUN", "Case=Abl"]]), S([["gelir", "VERB"]])]);
check("aday: görülen sözcük", candidates(sfx, "evde").known, true);
check("aday: görülmeyen sözcük sonekten (kitapta)", candidates(sfx, "kitapta").list[0][0], "NOUN Case=Loc");
check("aday: noktalama", candidates(sfx, "...").list[0][0], "PUNCT _");
const ex = candidates(sfx, "gelir", "VERB _");
check("aday: tek geçen sözcük sonekten sayılır (known=false)", ex.known, false);
check("aday: kendi etiketi sonek sayımından düşer", ex.list.some(c => c[0] === "VERB _"), false);

// BOUN: bölme, eğitim, sınama
const sents = parseConllu(fs.readFileSync(new URL("../data/ud/tr_boun-ud-test.conllu", import.meta.url), "utf8"));
check("BOUN cümle sayısı", sents.length, 979);
const {train: tr, test: te} = split(sents);
check("her 5. cümle sınama", te.length, 195);
check("eğitim + sınama", tr.length + te.length, 979);
const M = train(tr), R = evaluate(M, te);
check("sınama sözcük sayısı (noktalamasız)", R.all.n, 2143);
check("kümeler toplamı", R.amb.n + R.one.n + R.unk.n, R.all.n);
check("bilinmeyen sözcükler", R.unk.n, 1095);
check("tavan >= %85", R.all.ceil / R.all.n >= 0.85, true);
check("hiçbir yöntem tavanı aşmaz", ["base", "dl", "ap"].every(k => R.all[k] <= R.all.ceil), true);
check("UPOS doğruluğu tam etiketten düşük değil", ["base", "dl", "ap"].every(k => R.all[k + "U"] >= R.all[k]), true);
check("tek adaylı sözcükte üç yöntem de aynı", R.one.base === R.one.dl && R.one.dl === R.one.ap, true);
check("belirsiz sözcükte karar listesi taban çizgisinden iyi", R.amb.dl > R.amb.base, true);
check("belirsiz sözcükte perceptron taban çizgisinden iyi", R.amb.ap > R.amb.base, true);
check("tümünde perceptron taban çizgisinden iyi", R.all.ap > R.all.base, true);
check("taban çizgisi >= %60", R.all.base / R.all.n >= 0.6, true);
// kararlılık: aynı tohumla aynı sonuç
const R2 = evaluate(train(tr), te);
check("deterministik eğitim", R2.all.ap + "/" + R2.all.dl, R.all.ap + "/" + R.all.dl);
// kural listesi sıralı ve olumlu
const rules = topRules(M.dl, 10);
check("kural listesi azalan güven", rules.every((x, i) => !i || rules[i - 1].score >= x.score), true);
check("kurallar doğru > yanlış", rules.every(x => x.p > x.n), true);
console.log("belirsizlik giderme denetimi:", total - bad, "/", total);
if(bad) process.exitCode = 1;
