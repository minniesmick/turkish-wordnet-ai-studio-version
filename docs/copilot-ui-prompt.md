# VS Code Copilot için görev: arayüzü /impeccable ile kusursuza yaklaştır

> **Chat'e yapıştırılacak kısa hâli** (Agent modunda):
>
> `docs/copilot-ui-prompt.md` dosyasını baştan sona oku ve uygula. `/impeccable` skill'ini kullan; komut adlarını skill'in kendi `SKILL.md` dosyasından öğren. Her aşamanın sonunda dur, özet ver, ben "devam" deyince sonrakine geç.

---

## 0. Görev

`turkish-wordnet-ui` uygulamasının **tüm arayüzünü ve UX'ini** (kabuk, 13 sekme, iki kullanım kipi, açık / koyu tema, mobil) Impeccable skill'inin **bütün yetenekleriyle** gözden geçir, düzelt ve cilala. Hedef: "yapay zekâ işi" izlenimi vermeyen, tutarlı, erişilebilir, hızlı, sakin ve ders anında projeksiyonda da okunur, kusursuza yakın bir arayüz.

Bu iş yalnızca **sunum katmanıdır** (HTML yapısı, CSS, görünüm modüllerinin işaretleme kısımları). Hesap mantığına, veriye, sunucuya dokunma (bkz. bölüm 3).

## 1. Skill'i kullanma biçimi (en önemli kısım)

1. Önce skill'in kurulu olduğunu doğrula: `.github/skills/`, `.agents/skills/`, `.claude/skills/`, `.cursor/skills/` ve kullanıcı düzeyindeki skill klasörlerinde `impeccable` ara. Bulamazsan **dur** ve bana "skill görünmüyor" de; kendi bildiğinle taklit etme.
2. `SKILL.md` ve onun gösterdiği referans dosyalarını **tamamen oku**. Komut adlarını, sırayı ve çıktı biçimlerini oradan al; ben burada tahmin ettiğim adları yazıyorum, çelişirse skill kazanır.
3. Skill'in tarif ettiği şu yeteneklerin **hepsini** kullan (adlar skill'deki karşılıklarıyla eşlenmeli): shape (tasarım yönü / plan), critique (eleştirel inceleme), audit (erişilebilirlik, performans, tema, duyarlılık, anti-pattern taraması), polish, clarify (UX metni), distill / simplify (sadeleştirme), harden (uç durumlar, hata, i18n), optimize (performans), adapt (mobil / dokunmatik / farklı ekran), animate (hareket), colorize (renk), bolder / quieter (ton ayarı), extract (token ve bileşen çıkarma), document (DESIGN.md ve token yakalama) ve varsa canlı tarayıcıda yineleme (live) ile detector (otomatik anti-pattern denetimi).
4. Skill'in yasakladığı ya da "AI slop" saydığı kalıpları (gradient metin, cam efekti, rastgele kart yığınları, anlamsız ikon süsleri vb.) **skill'in listesine göre** uygulama; ben burada örnek vermiyorum, liste sende.
5. Skill bir şeyi "yap" ile "yapma" arasında bırakırsa **projenin mevcut tasarım dilini** (bölüm 2.3) esas al.

## 2. Proje bağlamı

### 2.1 Ne bu?

Yerel çalışan, bağımlılıksız bir ders çalışma uygulaması: MEF Üniversitesi COMP 451 (Doğal Dil İşlemeye Giriş, Güz 2026). Python 3 standart kütüphane sunucusu (`server.py`, port 8770) + vanilla ES modülü JS (`static/js/*.js`) + tek CSS dosyası (`static/css/app.css`, ~750 satır) + tek HTML kabuğu (`static/index.html`). **Derleme adımı yok.** Yazı tipleri `static/fonts/` içinde, kendi sunucumuzdan (Schibsted Grotesk arayüz, Spectral gövde / metin, JetBrains Mono kod ve etiket).

Kullanıcı: bir öğrenci (Alper) hem günlük çalışırken hem derste projeksiyonda kullanıyor; hoca ve sınıf arkadaşları da görebilir. Ders sırasına göre sekme ekleniyor.

### 2.2 İki kullanım kipi (dokunulmaz kural)

Üstteki `Araç | Öğrenci` anahtarı (`#modeSeg`, `MODE` in `core.js`):

- **Araç:** yalnızca sonuçlar. Ders göndermeleri, formüller, "neden" açıklamaları, kural izleri, alıştırmalar, sınavlar, slayt numaraları **görünmez**.
- **Öğrenci:** hepsi görünür.

Uygulama: `body.student` sınıfı + `body:not(.student) .stu{display:none!important}`; tamamen öğretici sekmeler `STUDENT_VIEWS` (şu an yalnızca `learn`). Yeni her öğretici öğe `.stu` taşır. **Her değişikliği iki kipte de kontrol et.** Araç kipinde öğretici bir şeyin sızması hata sayılır.

### 2.3 Mevcut tasarım dili ("İki Renkli Sözlük")

`PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, `.impeccable/config.json` ve `.impeccable/surfaces/` **zaten var**, ama yalnızca ilk WordNet sekmeleri için yazıldı (22 Ekim). Sonradan 8 sekme ve bir kip sistemi eklendi; bu dosyalar eskidi. Özet: soğuk ince kâğıt zemin, mavi-siyah mürekkep, **tek leke rengi (ultramarin `--spot`)**; leke rengi yalnızca tıklanabilir ve odaktaki öğede; kategoriler renkle değil **çizgi biçimiyle** ayrılır; yazı tipi üçlüsü yukarıdaki gibi; sert gölge yok, 1px kenarlık; yarıçap `--r:6px`. Tokenlar `app.css` başındaki `:root` ve koyu tema bloklarında. `.impeccable/config.json` içinde iki detector kuralı "Claude kararı, kullanıcı onayı yok" diye susturulmuş (`.kbd` kalın alt kenar, yüzen katman gölgesi): **bunları yeniden değerlendir**, gerekçe zayıfsa kaldır.

Bu dili **koru ve olgunlaştır**; baştan başka bir görsel kimlik icat etme. Bir şeyi değiştirmek istiyorsan nedenini yaz.

### 2.4 Dosya haritası

| Ne | Nerede |
|---|---|
| Kabuk (kenar çubuğu, üst çubuk, kâğıt, komut paleti, kısayol penceresi) | `static/index.html` + `static/js/ui.js` |
| Sekme listesi, etiket, ikon, kısayol (`g m` vb.), `registerView`, `act`, kip kodu, ikon yolları `P` | `static/js/core.js` |
| Sekmeler (her biri `<section id="v-…">` içine kendi HTML'ini yazar) | `search.js graph.js relate.js wsd.js roles.js frames.js morph.js disamb.js parse.js deps.js corpus.js ngram.js learn.js` |
| Yardımcı arayüz modülleri | `fsmquiz.js` (Morfoloji içindeki alıştırma), `exportfig.js` (SVG/PNG indirme: `.fig-box` içindeki `svg.pt|dp|zipf`, **hesaplanmış stilleri satır içine gömer**) |
| **Saf hesap modülleri (dokunma)** | `md.js lm.js fsm.js turkish.js zmap.js mle.js parsers.js corpusdata.js lessons.js` (içerik) |
| Yazı tipleri | `static/fonts/` + `fonts.css` |
| Testler | `scripts/test_*.mjs` |

Sekmeler ve dersler: Ara, Harita, Benzerlik, Anlam seçimi, Roller, Çerçeveler (WordNet / PropBank / FrameNet, Lecture 4) · **Morfoloji**, **Belirsizlik** (Lecture 2) · **Ayrıştırma**, **Bağımlılık** (Lecture 3) · **Korpus**, **N-gram** (Lecture 5) · **Ders** (yalnızca Öğrenci kipi).

## 3. Değişmez kurallar

1. **Sunucu yalnızca yerelde kalır.** `server.py` yalnızca `127.0.0.1` ve `::1` dinler. Bağlama adresini, CORS'u, portu açma yönünde **hiçbir şey değiştirme**. Arayüz işi sunucuyu ilgilendirmez; `server.py`'ye dokunman gerekirse dur ve sor.
2. **Yeni bağımlılık yok.** Framework, Tailwind, derleyici, CDN, internetten yazı tipi, dış betik, telemetri yok. Gerekirse yazı tipini `static/fonts/` içine koy (lisansını yaz). Tek CSS dosyası mimarisi kalsın (bölümlere ayır, yorumla).
3. **Hesap koduna dokunma.** Bölüm 2.4'teki "dokunma" modülleri ve `lessons.js` içeriği olduğu gibi kalır. Görünüm modüllerinde (`morph.js`, `disamb.js` ...) yalnızca işaretleme / sınıf / erişilebilirlik / metin değişir; durum yönetimi ve hesap çağrıları aynı kalır.
4. **Kancaları kırma.** JS, HTML'e `id`, `data-*` ve sınıflarla bağlı. Bir ad değiştirmeden önce `grep` ile tüm kullanımları bul ve **hepsini birlikte** değiştir. Bilinen tuzaklar: `#app[data-view]` ile çakışmasın diye bağımlılık sekmesi `data-dv` kullanıyor; `exportfig.js` `.fig-box`, `svg.pt|dp|zipf` ve hesaplanmış stillere bağlı (indirilen SVG/PNG açık temada doğru çıkmalı); `.stu` ve `.hidden` kuralları; `.ng-*`, `.mp-*`, `.dm-*`, `.fq-*`, `.ck-*`, `.pt-*`, `.dp-*`, `.cp-*` önekli sınıflar JS içinde üretiliyor.
5. **Durum ve URL uyumu.** `?v=`, `?mode=student`, `?theme=`, `localStorage` anahtarları (`wn:*`, `wn:p:theme`) aynı çalışmalı; eski bağlantılar kırılmasın.
6. **Türkçe arayüz metni.** Türkçe büyük / küçük harf (İ/ı) doğru işlenir. Metinleri iyileştirebilirsin (clarify) ama anlamı ve terimleri (synset, CKY, perplexity, UPOS ...) koru. `lang="tr"` kalsın.
7. **Veri dürüstlüğü** (PRODUCT.md ilke 3): yöntemlerin sınırları saklanmaz; doğruluk sayıları hesaptan gelir. Sınırlama notlarını silme, yalnızca daha okunur yap.
8. **Hiçbir özellik silinmez.** Bir şeyi sadeleştirirken işlevi koru ya da başka yerde erişilebilir kıl (örn. açılır bölüm).
9. **Testler yeşil kalır.** Baştan ve her aşama sonunda:
   `node scripts/test_turkish.mjs`, `test_fsm.mjs`, `test_lm.mjs`, `test_mle.mjs`, `test_parsers.mjs`, `test_md.mjs`, `test_zmap.mjs`.
10. **Git:** yeni yerel dal aç (`ui/impeccable`). Her aşama bir ya da birkaç **mantıklı Türkçe commit**. **Push yok, merge yok, `main`'e dokunma.** Bitince bana özet ver; ben inceleyip karar veririm.
11. Zemberek isteğe bağlı: `lib/zemberek-full.jar` ve JDK varsa gerçek çözümleyici çalışır, yoksa Morfoloji / Belirsizlik küçük motora düşer. İki durumu da dene; "Zemberek yok" görünümü de düzgün olmalı.

## 4. Nasıl çalışacaksın

- Sunucu: `python server.py` (isteğe bağlı `PORT=...`), adres `http://localhost:8770`. Tarayıcıda bak (Simple Browser, Playwright / başka bir tarayıcı aracı; hangisi varsa). Tarayıcı aracın yoksa bunu söyle ve doğrulamayı komut ve DOM okumasıyla yap; **görmeden "oldu" deme**.
- Tarayıcı ES modüllerini önbelleğe alır; değişiklik görünmüyorsa sert yenile.
- Her aşamayı **ayrı bir adımda** yap. Bağlam dolarsa dur ve `docs/ui-review/PROGRESS.md` dosyasına "nerede kaldım, sıradaki ne, kararlar" yaz; yeni sohbette oradan devam edilebilsin.
- Çıktıları `docs/ui-review/` altında topla (dosya adları aşağıda). Ekran görüntülerini `before/` ve `after/` altına koy; dosya adı `görünüm-kip-tema-genişlik.png` biçiminde.
- Sormayı en aza indir: davranışı değiştirmeyen tasarım kararlarını kendin ver, **gerekçesini** kaydet. Yalnızca geri dönüşü zor ya da davranışı değiştiren seçimlerde (sekme sırası / gruplama, bir özelliğin yeri, silme) dur ve tek satırlık soru sor.

## 5. Aşamalar

### Aşama 0: hazırlık ve taban çizgisi
1. Skill'i doğrula ve oku (bölüm 1). Bu dosyayı, `PRODUCT.md`, `DESIGN.md`, `.impeccable/*`, `README.md`, `TODO.md` dosyalarını oku.
2. Dalı aç, sunucuyu başlat, bütün testleri çalıştır, sonucu kaydet.
3. **Taban çizgisi ekran görüntüleri:** 13 görünüm × {Araç, Öğrenci (Ders yalnızca Öğrenci)} × {açık, koyu} × {1280 px, 375 px} → `docs/ui-review/before/`. Her sekmede tipik içeriği yükle (örn. Belirsizlik'te bir sınama cümlesi ve "Zemberek ile karşılaştır", N-gram'da BOUN, Ayrıştırma'da bir ayrıştırma sonucu).
4. **Bağlamı yenile:** skill'in context / document adımıyla `PRODUCT.md` ve `DESIGN.md`'yi **güncel uygulamaya** göre yeniden yaz (8 yeni sekme, kip sistemi, Lecture 2 / 3 / 5 içerikleri, kullanıcı: öğrenci + ders sunumu). Mevcut ilkeleri koru, eskimiş cümleleri düzelt.

### Aşama 1: critique (eleştirel inceleme)
Tüm uygulamayı ve her sekmeyi ayrı ayrı eleştir: bilgi mimarisi, görsel hiyerarşi, bilişsel yük, tutarlılık, hizalama ve ritim, boşluk, yoğunluk, yazı ölçeği, renk kullanımı, geri bildirim, boş / yükleme / hata durumları, projeksiyonda okunurluk. Her bulguyu **P0 (kırık / erişilemez) … P3 (cila)** olarak sınıfla, dosya ve satır göster. Çıktı: `docs/ui-review/critique.md`. Bu adımda kod değiştirme.

### Aşama 2: audit
Skill'in audit ve detector araçlarını çalıştır: erişilebilirlik (WCAG 2.2 AA: kontrast, odak, klavye, ARIA, hedef boyutu, `prefers-reduced-motion`, renge tek başına güvenme), performans (ilk yükleme, düzen kayması, büyük tablolar), duyarlılık (375 / 768 / 1280 / 1920, yatay sayfa kaydırması yok), tema (açık / koyu / sistem), anti-pattern taraması. Çıktı: `docs/ui-review/audit.md` (+ sayısal sonuçlar). Düzeltmeye geçmeden önce ikisini birleştirip tek sıralı yapılacaklar listesi yaz.

### Aşama 3: shape (kabuk ve bilgi mimarisi)
Önce kabuğu ele al, çünkü her sekmeyi etkiler:
- 13 sekme düz bir liste. Derse göre **gruplama / bölüm başlıkları** düşün (Sözcük anlamı: Ara, Harita, Benzerlik, Anlam seçimi, Roller, Çerçeveler · Lecture 2: Morfoloji, Belirsizlik · Lecture 3: Ayrıştırma, Bağımlılık · Lecture 5: Korpus, N-gram · Ders). Kısayollar (`g` + harf), komut paleti ve `?` penceresi aynı sırayı izlesin.
- Kenar çubuğundaki "İz" ve "Çalışma listem" bölümleri WordNet kavramlarına özgü; NLP sekmelerinde anlamsız. Bağlama göre gizle ya da yeniden düşün.
- Üst çubuk: arama kutusu, sözlük dili anahtarı (yalnızca WordNet sekmelerinde anlamlı), **Araç / Öğrenci** anahtarı (şu an ne yaptığı yalnızca `title` ile anlaşılıyor; keşfedilebilirlik ve ne değiştirdiğinin anlatımı), bağlantı, sunum, tema. Mobilde nasıl yığılacağı.
- Sunum modu (`P`, `--scale:1.22`): projeksiyonda tablo ve etiketler okunur mu?
Çıktı: kısa bir tasarım yönü notu (`docs/ui-review/shell.md`) + uygulama.

### Aşama 4: görünüm görünüm geçiş
Sıra: **Belirsizlik → Morfoloji → Ayrıştırma → Bağımlılık → N-gram → Korpus → Ders → eski WordNet sekmeleri** (sonuncular yalnızca tutarlılık denetimi; daha önce tasarlandılar, yeniden tasarlama). Her görünümde critique + audit bulgularını uygula; skill'in shape / typeset / layout / colorize / clarify / distill / harden / adapt yeteneklerini **o görünüme uygun olanlarla** kullan. Bilinen sorunlar ve istekler:

- **Belirsizlik** (`disamb.js`): cümle tablosu çok geniş (sözcük + aday + 3 yöntem + Zemberek + doğru = 7 sütun); UD etiketleri uzun (`Case=Nom · Number=Sing · Person=3 · Person[psor]=3 …`) ve satırları şişiriyor. Kompakt etiket gösterimi (önce UPOS, sonra özellikler kısaltılmış / ayrıştırılabilir, ayrıntı tıklayınca), ✓ / ✗ yalnızca renkle değil simgeyle de (şu an var, koru), mobilde ilk sütun sabit + yatay kaydırma ipucu. İki benzer doğruluk tablosu (sınama doğruluğu ve Zemberek karşılaştırması) birbirine görsel olarak bağlansın. "Aynı" kısaltması anlaşılır mı?
- **Morfoloji** (`morph.js`, `fsmquiz.js`): 7 bölüm tek uzun sayfada; Zemberek / küçük motor geçişi; Oflazer FSM yolu bloğu (`pre.mp-fsm`); ek zinciri düğmeleri (`mp-ch`); alıştırma ve FSM egzersizi. Bölüm içi gezinme (içindekiler / sabit alt başlık) ve Öğrenci bölümlerinin kümelenmesi.
- **Ayrıştırma** (`parse.js`): gramer metin kutusu, CKY tablosu (hücre doldurma alıştırması), SVG ağaçlar, ayrıştırma yöntemleri adım kaydırıcısı, MLE bölümü. Çok yoğun; hiyerarşi ve ritim. Ağaç SVG'leri ve CKY tablosu küçük ekranda.
- **Bağımlılık** (`deps.js`): ok diyagramı SVG, cümle seçici, CoNLL-U yapıştırma, özellik denetimleri.
- **N-gram** (`ngram.js`): çok sayıda kontrol (korpus kaynağı, n, yumuşatma, UNK, λ, α) tek satıra sıkışıyor; sayım tabloları, olasılık matrisi, perplexity karşılaştırma tablosu, PMI. Kontrol grubu düzeni, tablo okunurluğu, matris ısı gösterimi (renk tek başına olmasın).
- **Korpus** (`corpus.js`): istatistik şeridi, sıklık listesi, Zipf grafiği (SVG), KWIC.
- **Ders** (`learn.js`): `.lesson` bölümleri (sol kenarda `.gut` slayt etiketi), düğmeler başka sekmeyi hazır örnekle açıyor, çoktan seçmeli sorular. Okuma ölçüsü (satır uzunluğu), sınav geri bildirimi, ilerleme hissi.
- **Eski sekmeler** (Ara, Harita, Benzerlik, Anlam seçimi, Roller, Çerçeveler): yalnızca yeni tasarım dilindeki değişikliklerle tutarlılık; harita (`graph.js`) mobil kontrol çakışması `TODO.md`'de açık iş.

Her görünüm sonunda: önce / sonra ekran görüntüleri, hangi bulgular kapandı, testler, iki kip, iki tema, 375 px.

### Aşama 5: çapraz konular (uygulama genelinde)
- **typeset:** tür ölçeği (arayüz / gövde / mono rolleri), tablo sayıları `tnum`, uzun Türkçe sözcüklerde taşma ve `hyphens` / `overflow-wrap`, mono etiketlerin okunurluğu, satır uzunluğu sınırı.
- **layout / spacing:** tek bir boşluk ölçeği, hizalama ızgarası, `.page` genişlikleri, tablo ve `.ng-scroll` sarmalayıcılarının tutarlılığı.
- **colorize:** `--spot` disiplini (yalnızca tıklanabilir / odak), anlamsal `--ok` / `--bad` kullanımı ve renk dışı ikinci ipucu, koyu temada `--ink-3` kontrastı, ısı / ton gösterimleri.
- **animate:** amaçlı, kısa, `--ease` ile; yükleme çubuğu, açılır bölüm, sonuç belirmesi. `prefers-reduced-motion`'a saygı. Süs için hareket yok.
- **clarify:** buton ve etiket metinleri, boş durum cümleleri, hata iletileri, tooltips; Araç kipinde sade, Öğrenci kipinde açıklayıcı. Anlamı değiştirme.
- **distill / simplify:** özellikle Araç kipinde gereksiz çerçeve, tekrar eden başlık, açıklama; ama işlev silme.
- **harden:** boş / yükleme (503 "veri yükleniyor") / hata / çok uzun metin / çok büyük tablo / Zemberek yok / `localStorage` erişilemez / yavaş bağlantı / çok dar ekran; klavyeyle tam gezinme; odak yönetimi (dinamik içerik değişince odak kaybolmasın); `aria-live` bölgeleri doğru mu.
- **adapt:** 375 / 768 / 1280 / 1920; dokunma hedefi ≥ 40 px (`.btn.sm` 30 px, tablo satırı tıklamaları); sunum modu; yazdırma (isteğe bağlı, düşük öncelik).
- **optimize:** ilk yük (yazı tipi alt kümeleri, `preload`), görünümlerin tembel yüklenmesi, büyük tablolarda render maliyeti (Korpus sıklık listesi, N-gram matrisi), `content-visibility` gibi güvenli kazançlar. Ölç, sonra düzelt; sayıları yaz.
- **bolder / quieter:** her görünümde tonu ayarla; dili bozmadan. Sakin çalışma, etkileyici sunum (PRODUCT.md ilke 2).
- **delight:** yalnızca Öğrenci kipinde ve yalnızca küçük, anlamlı dokunuşlar (örn. doğru cevap geri bildirimi). Süs yok.

### Aşama 6: polish, extract, document
1. Son cila geçişi (skill'in polish adımı) + detector'ı yeniden çalıştır, kalan uyarıları kapat ya da gerekçeyle belgele.
2. **extract:** tekrarlanan desenleri (etiket çipi, tablo, bölüm başlığı, istatistik şeridi, kontrol satırı, düğme grupları) CSS içinde adlandırılmış bileşenlere indir; ölü CSS'i sil (silmeden önce `grep`).
3. **document:** `DESIGN.md` ve `.impeccable/design.json`'ı son duruma getir; token listesi, tür ölçeği, boşluk ölçeği, bileşen kataloğu, yapılmayacaklar.
4. `after/` ekran görüntüleri, `docs/ui-review/SUMMARY.md` (ne değişti, neden, önce / sonra, ölçülen sonuçlar, kalan P2–P3 işler), `TODO.md`'ye kalan işler.

## 6. Kabul ölçütleri

- [ ] Yedi test betiği geçiyor; tarayıcı konsolunda yeni hata yok.
- [ ] 13 görünüm × iki kip × iki tema × 375 / 1280 px'te görsel hata yok; **sayfada yatay kaydırma yok** (tablolar kendi sarmalayıcısında kayıyor ve bunu belli ediyor).
- [ ] Araç kipinde hiçbir `.stu` öğesi görünmüyor; Öğrenci kipinde hepsi görünüyor.
- [ ] Metin kontrastı ≥ 4,5:1, büyük metin ve arayüz bileşenleri ≥ 3:1 (iki temada); odak göstergesi her etkileşimli öğede görünür; tüm işlevler klavyeyle yapılabiliyor; renk tek başına bilgi taşımıyor.
- [ ] `prefers-reduced-motion` ve `prefers-color-scheme` doğru; `?theme=` ve `?mode=` çalışıyor.
- [ ] Dokunma hedefleri mobilde ≥ 40 px.
- [ ] Detector'da açıklanmamış bulgu yok.
- [ ] SVG / PNG indirmeler (ağaç, bağımlılık şeması, Zipf) hâlâ doğru ve açık temada çıkıyor.
- [ ] `server.py` bağlama adresleri değişmedi (`127.0.0.1` ve `::1`); yeni bağımlılık yok; internete istek yok.
- [ ] `git diff main --stat` içinde `md.js lm.js fsm.js turkish.js zmap.js mle.js parsers.js corpusdata.js lessons.js server.py` yok (ya da gerekçesi yazılı ve ben onayladım).

## 7. Her aşama sonunda bana vereceğin rapor

Kısa ve gerçek: ne değişti (dosya listesi), hangi bulgular kapandı, hangileri kaldı, testler (geçti / kaldı), ekran görüntüsü yolları, **karar bekleyen** noktalar (en çok 3 satır). Görmediğin ya da ölçmediğin şeyi "doğrulandı" diye yazma.
