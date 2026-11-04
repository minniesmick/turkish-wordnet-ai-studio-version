// Türkçe morfoloji motoru için hızlı denetim: node scripts/test_turkish.mjs
import {CURATED, generate, analyze, nextOptions, SUF} from "../static/js/turkish.js";
const L = new Proxy(Object.fromEntries(CURATED.map(e=>[e.w,e])), {get:(o,k)=>o[k]||{w:k,pos:"N"}});
const cases = [
 ["okul",["PLU","P1sg"],"okullarım"],["masa",["P1sg"],"masam"],["kitap",["P1sg","ABL"],"kitabımdan"],["ağaç",["DAT"],"ağaca"],
 ["ayak",["GEN"],"ayağın"],["renk",["ACC"],"rengi"],["ev",["PLU","P3sg"],"evleri"],["ev",["P3pl"],"evleri"],
 ["kütüphane",["P3sg","DAT"],"kütüphanesine"],["gel",["FUT","A1sg_k"],"geleceğim"],["git",["PROG"],"gidiyor"],["git",["PAST"],"gitti"],
 ["kapa",["PROG"],"kapıyor"],["sevin",["CAUS_d","PROG"],"sevindiriyor"],["gel",["NEG","PROG","A1sg_k"],"gelmiyorum"],["ye",["FUT"],"yiyecek"],
 ["oku",["PROG","A3pl"],"okuyorlar"],["yaz",["AOR"],"yazar"],["gel",["AOR","A2sg_k"],"gelirsin"],["saat",["PLU"],"saatler"],["kalp",["P1sg"],"kalbim"],
 ["güzel",["LIK","ACC"],"güzelliği"],["kitap",["CI"],"kitapçı"],["gör",["PAST","A2pl_z"],"gördünüz"],["gez",["INF2"],"gezme"],["gez",["NEG"],"gezme"],
 ["gel",["ABIL","AOR"],"gelebilir"],["yaz",["PASS_l","PAST"],"yazıldı"],["oku",["PASS_n","PAST"],"okundu"],["de",["PROG"],"diyor"],["su",["INS"],"suyla"],
 ["okul",["LAS"],"okullaş"],["çocuk",["P3sg"],"çocuğu"],["gül",["PLU","P2pl"],"gülleriniz"],
 ["oku",["NEG","PROG"],"okumuyor"],["gör",["NEG","PROG","A2pl_k"],"görmüyorsunuz"],["yap",["NEG","PROG"],"yapmıyor"],["gel",["NEG","PROG"],"gelmiyor"],
 ["şehir",["P1sg"],"şehrim"],["şehir",["ACC"],"şehri"],["şehir",["LOC"],"şehirde"],["şehir",["PLU"],"şehirler"],["burun",["DAT"],"burna"]
];
let bad=0;
for(const [s,ids,exp] of cases){ const g=generate(L[s],ids); const got=g.ok?g.surface:"ERR:"+g.reason; if(got!==exp){bad++; console.log("FAIL",s,ids.join("+"),"->",got,"expected",exp);} }
console.log("generation checks:",cases.length-bad,"/",cases.length);
if(bad) process.exitCode = 1;
console.log(generate(L.okul,["PLU","P1sg"]).lex);
console.log(generate(L.sevin,["CAUS_d","PROG"]).lex);
console.log(generate(L.gez,["INF2","PLU"]).lex);
console.log(generate(L.kitap,["NEG"]).reason, "|", generate(L.kütüphane,["P3sg","P3sg"]).reason);
for(const w of ["okulum","evleri","gezme","sevindiriyor","kitabımdan","geleceğim","kapıyor"]){ console.log(w, "=>", analyze(w, CURATED).map(a=>a.lex).join("  ||  ")); }

// ───── ek-fiil, bileşik zaman, zarf-fiil, sıfat-fiil, olumsuz geniş zaman, yetersizlik, istek, ilgi eki
const V = (w, o = {}) => ({w, pos:"V", ...o}), Nn = w => ({w, pos:"N"});
const more = [
  [V("kır"), ["ARAK"], "kırarak"], [V("bırak"), ["IP"], "bırakıp"], [V("oku"), ["IP"], "okuyup"], [V("duy"), ["PASTP"], "duyduk"], [V("duy"), ["PASTP", "P3sg"], "duyduğu"],
  [V("yap"), ["NECES"], "yapmalı"], [V("yap"), ["NECES", "A1sg_k"], "yapmalıyım"], [V("ol"), ["INF3", "GEN"], "oluşun"], [V("et", {soft:1}), ["FUTP"], "edecek"], [V("gör"), ["NARRP"], "görmüş"],
  [V("gel"), ["NEG", "NAOR"], "gelmez"], [V("gel"), ["NEG", "NA1sg"], "gelmem"], [V("gel"), ["NEG", "NA1pl"], "gelmeyiz"], [V("gel"), ["NEG", "NAOR", "A2sg_k"], "gelmezsin"], [V("gel"), ["NEG", "NAOR", "A3pl"], "gelmezler"],
  [V("gel"), ["UNABLE", "PAST"], "gelemedi"], [V("gel"), ["UNABLE", "PROG"], "gelemiyor"], [V("oku"), ["UNABLE", "PROG"], "okuyamıyor"],
  [V("gel"), ["PROG", "PAST_2"], "geliyordu"], [V("gel"), ["EVID", "PAST_2", "A1sg_z"], "gelmiştim"], [V("ol"), ["COND", "PAST_2"], "olsaydı"], [V("gel"), ["AOR", "COND_2", "A1sg_z"], "gelirsem"],
  [V("git", {soft:1}), ["OPT", "A1sg_o"], "gideyim"], [V("sat"), ["OPT", "A1pl_o"], "satalım"],
  [Nn("öğrenci"), ["A1sg_k"], "öğrenciyim"], [Nn("ev"), ["LOC", "A1sg_k"], "evdeyim"], [Nn("öğrenci"), ["PAST_2", "A1sg_z"], "öğrenciydim"], [Nn("ev"), ["LOC", "KI"], "evdeki"], [Nn("ev"), ["GEN", "KI"], "evinki"],
  [Nn("kitap"), ["COP"], "kitaptır"], [V("gel"), ["EVID", "COP"], "gelmiştir"], [V("yap"), ["PASS_l", "FUT", "COP"], "yapılacaktır"], [Nn("ev"), ["LOC", "COP"], "evdedir"]
];
let bad2 = 0;
for(const [st, ids, exp] of more){ const g = generate(st, ids); const got = g.ok ? g.surface : "ERR:" + g.reason; if(got !== exp){ bad2++; console.log("FAIL", st.w, ids.join("+"), "->", got, "expected", exp); } }
const lexCases = [
  [V("gel"), ["PROG", "PAST_2"], "gel+Verb+Pos+Prog1+Past+A3sg"], [V("gel"), ["UNABLE", "NAOR"], "gel+Verb+Unable+Aor+A3sg"], [V("gel"), ["NEG", "NA1sg"], "gel+Verb+Neg+Aor+A1sg"],
  [Nn("ev"), ["LOC", "A1sg_k"], "ev+Noun+A3sg+Pnon+Loc^DB+Verb+Zero+Pres+A1sg"], [Nn("ev"), ["LOC", "KI"], "ev+Noun+A3sg+Pnon+Loc^DB+Adj+Rel"], [V("gel"), ["EVID", "COP"], "gel+Verb+Pos+Narr+A3sg+Cop"],
  [Nn("ev"), ["COP"], "ev+Noun+A3sg+Pnon+Nom^DB+Verb+Zero+Pres+A3sg+Cop"], [V("duy"), ["PASTP", "P3sg"], "duy+Verb+Pos^DB+Adj+PastPart+A3sg+P3sg+Nom"], [V("ol"), ["COND"], "ol+Verb+Pos+Desr+A3sg"]
];
for(const [st, ids, exp] of lexCases){ const g = generate(st, ids); if(!g.ok || g.lex !== exp){ bad2++; console.log("FAIL lex", st.w, ids.join("+"), "->", g.ok ? g.lex : g.reason, "expected", exp); } }
// geçersiz diziler reddedilmeli
for(const [st, ids] of [[Nn("ev"), ["KI"]], [Nn("ev"), ["PLU", "KI"]], [V("gel"), ["NEG", "NAOR", "A1sg_k"]], [V("gel"), ["AOR", "NA1sg"]], [V("gel"), ["COP", "PLU"]], [V("gel"), ["PAST_2"]]]){
  if(generate(st, ids).ok){ bad2++; console.log("FAIL geçersiz kabul edildi", st.w, ids.join("+")); }
}
// çözümleme: kesme işareti ve yeni ekler
const LEXA = [V("gel"), V("duy"), Nn("ankara"), Nn("ev")];
const hasLex = (w, lex) => analyze(w, LEXA).some(a => a.lex === lex);
for(const [w, lex] of [["gelmez", "gel+Verb+Neg+Aor+A3sg"], ["Ankara'da", "ankara+Noun+A3sg+Pnon+Loc"], ["evdeki", "ev+Noun+A3sg+Pnon+Loc^DB+Adj+Rel"], ["geliyordu", "gel+Verb+Pos+Prog1+Past+A3sg"], ["duyduğu", "duy+Verb+Pos^DB+Adj+PastPart+A3sg+P3sg+Nom"], ["evdedir", "ev+Noun+A3sg+Pnon+Loc^DB+Verb+Zero+Pres+A3sg+Cop"]]){
  if(!hasLex(w, lex)){ bad2++; console.log("FAIL analiz", w, "->", analyze(w, LEXA).map(a => a.lex).join(" | ") || "yok", "beklenen", lex); }
}
console.log("yeni ek denetimi:", more.length + lexCases.length + 6 + 6 - bad2, "/", more.length + lexCases.length + 6 + 6);
if(bad2) process.exitCode = 1;
