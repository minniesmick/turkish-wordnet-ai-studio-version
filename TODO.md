# Yapılacaklar

Haftalık InClass soruları ve slaytlar geldikçe uygulamaya taşınacak işler. Önce PDF doldurulur, uygulama işi buraya yazılır.

## Bilinen kısıtlar

Rakamlar 2026-10-23'te 500 gerçek BOUN sözcüğü ve 400 rastgele üretimle ölçüldü; ölçüm betikleri repoda yok, yeniden ölçmek için yöntem: BOUN'dan sözcük örnekle, Zemberek'le çözümle, `fsm.js` / `turkish.js` çıktısıyla karşılaştır.

**Morfoloji**
- Belirsizlik sekmesi (ölçüm 2026-10-23, BOUN test kümesinin 784 / 195 cümlelik bölümü): aday kümesi çözümleyiciden değil eğitim sözlüğünden geliyor; sınama sözcüklerinin %51'i eğitimde yok ve onlarda doğru çözümleme aday kümesinde yalnızca %78 oranında (tavan). Tam çözümlemede (636 farklı UPOS + FEATS birleşimi) doğruluk taban çizgisi %67,4, karar listesi %68,4, perceptron %69,8; belirsiz bilinen sözcüklerde %83,7 / %85,9 / %86,6. Veri küçük olduğu için yöntemler arası fark az; ayrı bir dev kümesi olmadığından hiperparametreler (6 devir, tohum 7) önceden sabitlendi, sınamaya göre ayarlanmadı. Perceptron eğitimde öğrenilen "önceki çözümleme" özelliklerini sınamada kendi tahminleriyle kullanır (hata yayılabilir). Zemberek karşılaştırması (aynı sınama cümleleri, 11 cümle tokenlaştırma farkıyla atlanır, 1948 sözcük): Zemberek'in seçtiği çözümlemenin kökü %90,8, eşlenen UPOS'u %84,1; aday kümesinde doğru kök %92,9, doğru UPOS %89,1. Bizim yöntemlerde UPOS %81,5 / %81,9 / %83,7, kök yalnızca %48 (eğitimde görülmemiş sözcükte kök yok). UPOS eşlemesi (`zmap.js`) bana ait ve Zemberek'in aleyhine sapabilir (da/de bağlaç ↔ parçacık, ad ↔ özel ad, AUX); bu yüzden UPOS sütunu Zemberek için bir alt sınır, kök sütunu eşlemeye bağlı değildir.
- Küçük kural motoru yalnızca çevrimdışı yedek. Ölçüm (2026-10-23, BOUN'dan rastgele sözcükler, Zemberek çözümlemesi referans; Pnon / Nom / Pos / A3sg gibi sıfır morfemler ve Prop / Abbrv işaretleri karşılaştırmada atılır): sözlük BOUN'un tamamından kurulunca (sözcükler sözlükte) 677 sözcüğün %91,9'una çözümleme veriyor, %79,5'i Zemberek'in bir çözümlemesiyle birebir aynı; sözlük yalnızca eğitim cümlelerinden kurulup sınama cümlelerinin sözcüklerine bakılırsa (sözlükte olmayan kökler) 882 sözcükte %65,4 ve %55,8. Eksiklerin çoğu sözlükte olmayan kökler, sayı / kısaltma / bağlaç / edat / zamir ve Ness, Related, Acquire gibi türetmeler. Sıfat-fiil (-DHk, -(y)AcAk, -mHş), ad-fiil (-(y)Hş), zarf-fiil (-(y)ArAk, -(y)Hp), ilgi eki -ki, ek-fiil (-DHr, -(y)Hm ...), bileşik zaman, olumsuz geniş zaman, yetersizlik, istek ve gereklilik kipi eklendi. Sözlüğü BOUN lemmalarından (özel adlar dahil) ve ~70 elle yazılmış kökten oluşuyor; yumuşama sezgisel (çok heceli p/ç/k ile bitenler yumuşar), ünlü düşmesi yalnızca 3 kökte. Üretimde Zemberek'le etiketler %93 örtüşüyordu (eklemeden önceki ölçüm); -sA artık doğrudan gövdede Desr, zamandan sonra Cond.
- Zemberek (0.17.1, 2019) için JDK ve `lib/zemberek-full.jar` gerekir; jar git'te yok. Yoksa uygulama küçük motora düşer, yani aynı sözcük makineden makineye farklı sonuç verebilir. Zemberek Pnon / Nom / Pos yazmaz (`fsm.js` tamamlar); etiket adları `Sample.pdf`'teki eski sürümden farklı olabilir. Cümle bağlamında belirsizlik giderme olasılıksaldır, yanlış seçebilir.
- Oflazer FSM yolu şekillerden elle kodlandı. `Sample.pdf`'teki 3 yol birebir doğrulandı; geri kalan yollar doğrulanmadı. 2026-10-23'te BOUN'dan rastgele 1500 sözcüğün Zemberek çözümlemelerinde (3190 çözümleme) %90,9 için yol çıkıyor. Çıkmayanlar şekilde olmayanlar: Adverb / Postp / Interj / Conj / Det kökleri (şekiller yalnızca isim ve fiil), isimden fiile türetme (Acquire, Become: lAn / lAş), AorPart, Neces, Ness / Related / Dim türevleri, bazı zamir ve sayı alt türleri. Pron ve Num köklerinin 2 numaralı isim köküne bağlanışı şekilde yok (varsayım olarak işaretli); Caus'un köke bağlanışı da öyle. Bileşik zamanlar (geliyordu, gelmişti, gelirse ...) şekilde var ama birinci zaman durumlarından 1320 / 1321 / 1330'a giden uzun çizgiler kesişiyor; hangi durumdan hangisine gidildiği dil bilgisine göre yorumlandı ("çıkarım" olarak işaretli, yolun yanında yazar). Zemberek etiketlerini şekil kenarlarına eşleme kararları bana ait.

**N-gram ve korpus**
- Backoff "stupid backoff": puan verir, normalize olasılık dağılımı vermez; bu yüzden perplexity'si yaklaşıktır. λ ağırlıkları elle girilir. Katz / Kneser-Ney yok.
- "Brown" korpusu SemCor cümleleridir (küçük harfli, noktalamasız), gerçek Brown'un tamamı değildir; cümleler eşit aralıkla seçilir.
- PMI yalnızca ilk ~150 bin sözcüğü kullanır; "benzer bağlamlı sözcükler" gürültülüdür (BOUN gibi küçük korpusta özellikle; Brown'da `president` iyi, `good` / `school` zayıf).
- Eğitim/test ayrımı sabittir (her 5. cümle); küçük korpuslarda test perplexity oynaktır. Rastgele cümle üretimi bilerek rastgeledir (her tıklamada farklı).
- "Kendin hesapla" yalnızca Yumuşatma Yok ya da Laplace iken çalışır.

**Ayrıştırma ve bağımlılık**
- CKY: tekli kural döngüleri atlanır, düğüm başına en iyi 60 alt ağaç tutulur, çok belirsiz cümlede en fazla 30 ağaç gösterilir. Adım adım yöntemler küçük cümleler için (üstten alta 400, shift-reduce 500 adım sınırı). Earley yok.
- Bağımlılık verisi yalnızca UD Turkish-BOUN **test** kümesidir (979 cümle); çok sözcüklü belirteçler (1-2) atlanır.

**Genel**
- İndirilen SVG / PNG sitenin yazı tiplerini taşımaz, açıldığı bilgisayarın yazı tipiyle çizilir.
- Ders sayfaları ve soruları ders slaytlarının metninden yazıldı; slayt görselleri (şekiller, tablolar) tek tek taranmadı.
- Testler: `scripts/test_*.mjs` (turkish 43 + 54 yeni ek, fsm 4 yol + alıştırma ve yeni yollar, lm 41, mle 19, parsers 13, md 34, zmap 36); arayüz otomatik test edilmiyor, preview'da elle denendi.

## N-gram dil modeli laboratuvarı (InClass 5, Güz 2026)

Kaynak: `InClass5.pdf` (PDF dolduruldu: `~/Downloads/InClass5_filled.pdf`). Sekme: **N-gram** (`static/js/ngram.js`, `g n`). Slayt 24 korpusu doğrulandı (2/3, 1/3, 1/2, Laplace 3/8).

- [x] Korpus kutusu, `<s>` ve `</s>` otomatik, unigram / bigram / trigram.
- [x] Sayım tablosu, koşullu olasılık (kesir + ondalık), satır toplamı = 1 doğrulaması, bigram matrisi.
- [x] Geçmiş seçince dağılımı gösterme.
- [x] "the cat X" tipi soru: en olası sonraki sözcük ve nedeni.
- [x] Cümle olasılığı adım adım, log₂, 0 çarpan uyarısı, OOV uyarısı, perplexity.
- [x] Laplace (add-one) yumuşatma.
- [x] InClass 5 korpusu hazır örnek (`PRESETS.inclass5`); 4/6, 2/6, 3/7, 2/7, 2/7 PDF'deki tabloyla doğrulandı, "the cat X" cevabı X = cat (2/6).
- [x] Backoff ve interpolation (slayt 32), UNK / açık sözcük dağarcığı (slayt 33): `static/js/lm.js` (test: `node scripts/test_lm.mjs`).
- [x] PMI (slayt 34–39): pencere ±k, en yüksek çiftler, kolokasyonlar, PPMI kosinüs benzerliği. Rastgele cümle üretimi (slayt 28–29) ve eğitim/test perplexity karşılaştırması da var.
- [x] Korpus gezgini (`static/js/corpus.js`, `g o`): BOUN ve Brown, sıklık, Zipf, KWIC; `/api/corpus` (gzip).
- [ ] N-gram: Katz / Kneser-Ney (normalize edilmiş backoff), λ'ları held-out veriden öğrenme (deleted interpolation), SemCor dışı İngilizce korpus.

## Dışa aktarma

- [x] Ağaç, bağımlılık şeması ve Zipf için SVG / PNG indirme (`static/js/exportfig.js`); CKY tablosu ve n-gram tablosu Markdown kopyalama; CoNLL-U kopyalama.
- [ ] CKY tablosu ve n-gram matrisi için PNG; yazı tiplerini SVG'ye göm (şu an indirilen dosyada sistem yazı tipi kullanılır).

## Kullanım kipi ve morfoloji (Lecture 2)

- [x] Araç / Öğrenci kipi (`MODE`, `.stu`, `STUDENT_VIEWS` in `core.js`); öğretici öğeler Araç kipinde gizli.
- [x] Morfoloji sekmesi (`static/js/morph.js`, `turkish.js`, `g m`); motor denetimi: `node scripts/test_turkish.mjs`.
- [x] Zemberek köprüsü (`scripts/ZemberekBridge.java`, `/api/zemberek`, `lib/zemberek-full.jar` git'te yok) + cümle belirsizlik giderme + Oflazer FSM yolu (`static/js/fsm.js`, test `node scripts/test_fsm.mjs`; Sample.pdf yolları birebir tutuyor).
- [x] FSM: Prog2 (-mAktA, Sample.pdf'teki ad-fiil + bulunma yoluna açılır), olumsuz geniş zaman (108 → 1080 → 110, Aor + kişi tek kenar), yetersizlik (+yAmA, 109), kip türevleri (Repeat, Hastily, EverSince, Almost, Stay, Start), Agt (+yHcH), Desr, isteğe bağlı +mH (Narr) okları, 124 (While / AsIf) ve bileşik zamanlar (132 / 133 / 1322, çıkarım) kodlandı; kapsam %83,9 → %90,9. `Verbs1.pdf`'te 1100 hem bitiş çemberi hem `Verbs2.pdf`'te kutu olarak çizilmiş; kutu burada 1101.
- [ ] FSM: AorPart, Neces, isimden fiile türetme ve 2 numaradan sonra kalan türevler şekilde yok; bileşik zaman bağlantıları şekil PDF'inin daha net bir kopyasıyla doğrulanmalı.
- [x] Zemberek WordGenerator ile üretim (`G`/`O` komutları, `/api/zemberek?g=&o=&i=`); alıştırma cevap anahtarı Zemberek'ten, çözümleme sorusunda geçerli çözümleme tek seçeneğe indirildi (belirsiz yüzey sorunu giderildi).
- [x] Morfoloji kapsamı (küçük motor, yalnızca yedek): -DHk, -ArAk / -Ip, -ki, ek-fiil, bileşik zaman, olumsuz geniş zaman, yetersizlik, istek, gereklilik eklendi (kapsam %75,6 → %91,9, Zemberek'le birebir %66,2 → %79,5).
- [ ] Küçük motor: sözlük dışı kökler için tahmin (sonek tabanlı), sayı / kısaltma, Ness / Related / Acquire türetmeleri, -ken, ünlü düşmesi (sezgisel yumuşama yerine sözlük).
- [x] Morfolojik belirsizlik giderme (slayt 31–32): sekme **Belirsizlik** (`static/js/disamb.js`, hesap `static/js/md.js`, `g z`, test `node scripts/test_md.mjs`). Taban çizgisi, karar listesi (Yüret ve Türe) ve ortalama perceptron (Sak ve ark.) BOUN'la eğitilir; sınama doğruluğu, cümle içi karşılaştırma, sözcük başına aday ve "neden" açıklaması, öğrenci kipinde kural listesi ve sınav.
- [x] Belirsizlik: Zemberek'in kendi seçimiyle karşılaştırma (kök ve eşlenen UPOS; "Zemberek ile karşılaştır" düğmesi, cümle tablosunda Zemberek sütunu).
- [ ] Belirsizlik: aday kümesini Zemberek çözümlemelerinden al (tam UD etiket eşlemesi gerekir); BOUN train/dev kümesiyle eğit; lemma de seçilsin; sinir ağı yöntemi (slayt 32'deki üçüncü yöntem).
- [x] "Kendin doldur, kontrol et": CKY tablosu (Ayrıştırma, hücre hücre kontrol, ipucu) ve n-gram (tek olasılık, tablo satırı).
- [x] Ders sekmesi Lecture 1, 2, 3 ve 5 için genişletildi (`static/js/lessons.js`: bölümler + 38 çoktan seçmeli soru; düğmeler `act: go` ile araçları hazır örnekle açar).
- [x] "FSM yolunu kendin yaz" (`static/js/fsmquiz.js`, Morfoloji sekmesi bölüm 7, yalnızca Öğrenci kipi): 22 hazır çözümleme ya da kendi çözümlemen, durum dizisini yaz, kontrol et, ipucu, cevap (Sample.pdf biçimi), şekil yerine durum haritası. Cevap anahtarı elle kodlanan kenarlardan çıkar; PDF'le birebir doğrulananlar 3 yol.
- [ ] Kendin-doldur'u bağımlılık ağacına (kenar ekleme) taşı; Ders sorularını slayt görsellerinden ek sorularla zenginleştir.

## Ayrıştırma laboratuvarı (InClass 2, 3, 4; Lecture 3)

- [x] PCFG (InClass 2) ve CKY (InClass 3): sekme **Ayrıştırma** (`static/js/parse.js`, `g c`). InClass 2 cümlesi 2 ağaç verir ve ikisi de P = 3.527e-9 (eşit, kuralların çarpanları aynı); InClass 3 cümlesi gramerde yok (S yalnızca [0,7] kapsıyor, `time` bağlanamıyor).
- [ ] Bağımlılık: train/dev kümesi, çok sözcüklü belirteç (1-2) gösterimi, çevrimiçi graph-based / transition-based ayrıştırıcı demosu, Turkish IG (çekim grupları) gösterimi.
- [x] PCFG kural olasılığını parantezli ağaçlardan MLE ile öğrenme (`static/js/mle.js`, test `node scripts/test_mle.mjs`).
- [x] Top-down (özyinelemeli iniş) ve shift-reduce adım adım izi (`static/js/parsers.js`, test `node scripts/test_parsers.mjs`).
- [ ] Earley ayrıştırıcı (slayt 3-1'de adı geçiyor).
- [x] Bağımlılık ağacı (InClass 4): sekme **Bağımlılık** (`static/js/deps.js`, `g k`, API `/api/ud`). Veri: `data/ud/tr_boun-ud-test.conllu` (UD Turkish-BOUN test, CC BY-SA 4.0).

## Önceki notlardan kalanlar

- [ ] Benzerlik: ortak taban karşılaştırması ve A↔B çevirme.
- [ ] Kenar kâğıdı bağlam sekmelerini görselle doğrula.
- [x] Telefonda harita kontrollerini diyagramdan ayır; dar ekranda araç çubuğu artık kendi satırında ve grafik alanı altında başlıyor.
- [ ] Fiziksel telefonda dokunma hareketlerini; ekran okuyucu/klavye akışını ve 200% yakınlaştırmayı doğrula.
