// Oflazer FSM yol çıkarıcı için denetim: node scripts/test_fsm.mjs
// Beklenen durum dizileri, Sample.pdf'teki üç el çözümünden alınmıştır.
import {trace, stepStates, POOL, VERIFIED, checkPath, edgeTable, edgesFrom, sampleLines} from "../static/js/fsm.js";

const cases = [
  ["küçük+Noun+A3pl", ["1", "2", "3", "4", "5", "6"]],
  ["uyu+Verb+Prog1+A3sg+Cop", ["1", "101", "107", "112", "1131", "120", "1200", "125", "130"]],
  ["uyu+Verb+Prog1+Cop", ["1", "101", "107", "112", "1131", "120", "1200", "125", "130"]],
  ["uyu+Verb^DB+Noun+Inf1+A3sg+Loc^DB+Verb+Zero+Pres+A3sg+Cop", ["1", "101", "107", "112", "113", "118", "5", "21", "22"]]
];
let bad = 0;
for(const [s, want] of cases){
  const t = trace(s), got = t.ok ? stepStates(t) : null;
  const ok = t.ok && JSON.stringify(got) === JSON.stringify(want);
  if(!ok){ bad++; console.log("FAIL", s, "\n  beklenen", want.join(" "), "\n  bulunan ", got ? got.join(" ") : t.reason); }
}
// kapsam: hata vermeden yol çıkarması beklenen birkaç çözümleme (durum dizisi elle doğrulanmadı)
for(const s of ["ev+Noun+A3sg+P3sg+Abl", "gel+Verb+Neg+Prog1+A1sg", "gel+Verb+Past+A3pl", "ev+Noun+A3sg+Loc^DB+Verb+Zero+Past+A3sg", "gel+Verb^DB+Verb+Able+Aor+A2sg", "oku+Verb+Fut+A1sg"]){
  const t = trace(s);
  console.log(t.ok ? "ok  " : "STOP", s, t.ok ? stepStates(t).join(" ") : t.reason);
}
// "kendin yaz" alıştırması: havuzdaki her çözümlemenin yolu çıkmalı ve varsayım kenarı içermemeli
let pbad = 0;
for(const s of POOL){ const t = trace(s); if(!t.ok || t.steps.some(x => x.assumed || x.inferred)){ pbad++; console.log("FAIL havuz", s, t.ok ? "varsayım ya da çıkarım kenarı" : t.reason); } }
// Sample.pdf'ten doğrulananlar havuzda ve yolları beklenenle aynı
for(const [s, want] of cases) if(VERIFIED.has(s) && stepStates(trace(s)).join(" ") !== want.join(" ")){ pbad++; console.log("FAIL doğrulanmış yol", s); }
const chk = (name, got, want) => { if(got !== want){ pbad++; console.log("FAIL", name, "beklenen", want, "bulunan", got); } };
const W = ["1", "2", "3", "4", "5", "6"];
chk("checkPath tam", checkPath(W, ["1", "2", "3", "4", "5", "6"]).status, "ok");
chk("checkPath başlangıç 1 eklenir", checkPath(W, ["2", "3", "4", "5", "6"]).status, "ok");
chk("checkPath eksik", checkPath(W, ["1", "2", "3"]).status, "prefix");
chk("checkPath yanlış durum", checkPath(W, ["1", "2", "3", "9"]).bad, 3);
chk("checkPath yanlış durum durumu", checkPath(W, ["1", "2", "3", "9"]).status, "wrong");
chk("checkPath fazla", checkPath(W, ["1", "2", "3", "4", "5", "6", "7"]).status, "long");
chk("edgesFrom 3", [...new Set(edgesFrom(3))].join(","), "4,9,2");
chk("edgeTable her durum", edgeTable().every(r => r.to.length > 0), true);
chk("sampleLines biçimi", sampleLines(trace("küçük+Noun+A3pl"))[0], "From State 1-State 2: küçük+Noun");
// şekilden sonradan kodlananlar: durum dizisi ve işaret (çıkarım / varsayım yok)
const P = (s, want, flag = "") => { const t = trace(s); const got = t.ok ? stepStates(t).join(" ") : "STOP " + t.reason; const f = t.ok && t.steps.some(x => x.assumed) ? "assumed" : t.ok && t.steps.some(x => x.inferred) ? "inferred" : ""; chk("yol " + s, got + "|" + f, want + "|" + flag); };
P("uyu+Verb+Prog2+A3sg+Cop", "1 101 107 112 113 118 5 21 22");
P("çalış+Verb+Neg+Aor+A3sg", "1 101 107 108 1080 110 1100");
P("çalış+Verb+Neg+Aor+A1pl", "1 101 107 108 1080 110 1100");
P("gel+Verb+Unable+Aor+A3sg", "1 101 107 109 110 1100");
P("gel+Verb+Unable+Past+A3sg", "1 101 107 109 113 123 128 1280");
P("gel+Verb+Prog1+Narr+A3sg", "1 101 107 112 1131 120 1200 125 130");
P("gel+Verb+Aor+A3pl+While", "1 101 107 112 1131 120 124 129");
P("gel+Verb+Prog1+A3pl", "1 101 107 112 1131 120 1200 125 130");
P("gel+Verb+Past+A1sg+Narr", "1 101 107 112 113 123 128 1280");
P("gel+Verb^DB+Verb+Repeat+Imp+A2sg", "1 101 107 112 113 122 127 1270");
P("sun+Verb^DB+Noun+Agt+A3sg", "1 101 107 112 2 3 4 5 6");
P("gel+Verb+Prog1+Past+A3sg", "1 101 107 112 1131 120 1320 132 135", "inferred");
P("gel+Verb+Prog1+Narr+Past+A3sg", "1 101 107 112 1131 120 1320 132 135", "inferred");
P("gel+Verb+Aor+Cond+A3sg", "1 101 107 112 1131 120 1321 1322 135", "inferred");
P("gel+Verb+Past+Narr+A3sg", "1 101 107 112 113 123 1330 133 136", "inferred");
P("gel+Verb+Neg+Aor+Past+A3sg", "1 101 107 108 111 1320 132 135", "inferred");
P("gel+Verb+Desr+Past+A3sg", "1 101 107 112 113 1230 1320 132 135", "inferred");
P("biri+Pron+Quant+A3sg+P3sg+Abl", "1 2 3 9 5 6", "assumed");
console.log("alıştırma denetimi:", pbad ? "BAŞARISIZ " + pbad : "tamam", "(havuz " + POOL.length + " çözümleme)");
if(pbad) process.exitCode = 1;
console.log("Sample.pdf yolları:", cases.length - bad, "/", cases.length);
if(bad) process.exitCode = 1;
