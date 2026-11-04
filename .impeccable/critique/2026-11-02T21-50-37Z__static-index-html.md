---
target_identity: "file:C:\\Users\\alper\\PROJELER\\turkish-wordnet-ui\\static-index-html"
timestamp: 2026-11-02T21-50-37Z
slug: static-index-html
---
# Aşama 1 — eleştirel arayüz incelemesi

**Yöntem:** dual-agent (A: `8a76916c-bd16-43cb-8b8c-4d07ed918c22` · B: `9d4e2217-d574-4ca1-9ae8-be7595ada1e1`)

**Hedef:** `static/index.html` ve uygulamanın 13 görünümü

**Kapsam:** kod değişikliği yapılmadı. İnceleme A, detector sonuçlarından habersiz ve ayrı yürütüldü.

## Tasarım özgüllüğü

Uygulama, genel amaçlı bir yönetim panelinden daha karakterli ve ürüne özgü: sözlük sayfası metaforu, kavram haritası, Türkçe–İngilizce bağları ve Araç / Öğrenci ayrımı NLP çalışma alanına hizmet ediyor. Tek leke renk, kâğıt ve mürekkep dili ile serif açıklamalar mevcut tasarım kimliğiyle tutarlı; bunları korumak önemli.

İyileştirme fırsatı, kimliği değiştirmek değil; 13 görünümün karmaşıklığını düzenlemek. Bugünkü ilk katmanda tüm görünümler eş düzeyde, uzun laboratuvarlar ise kontrol ve açıklamaları aynı anda gösteriyor. Mobil üst çubukta denetimler sıkışıyor; sunum modunda kromun hover'a bağımlı olması sınıf karşısında güven vermiyor.

## Nielsen kullanılabilirlik puanları

| # | İlke | Puan | Gözlem |
|---|---|---:|---|
| 1 | Sistem durumunun görünürlüğü | 3/4 | Etkin görünüm, yükleme çubuğu ve durum bildirimleri var; yoğun laboratuvar durumları yine de taramayı zorlaştırıyor. |
| 2 | Sistem ile gerçek dünya uyumu | 3/4 | Türkçe ve alana özgü dil uygun; yeni öğrenciler için teknik kısaltmalar zaman zaman açıklamasız. |
| 3 | Kullanıcı kontrolü ve özgürlüğü | 3/4 | Görünüm değiştirme, paylaşılabilir URL ve Esc ile kapatma sağlanıyor; tüm laboratuvarlarda sıfırlama / geri alma eşit derecede görünür değil. |
| 4 | Tutarlılık ve standartlar | 3/4 | Ortak görsel dil ve kontroller tutarlı; uzun laboratuvarların etkileşim yoğunluğu farklılaşıyor. |
| 5 | Hata önleme | 2/4 | Ayrıştırıcı, n-gram ve metin girişleri teknik; geçersiz durumların sonuç öncesi önlenmesi her yerde belirgin değil. |
| 6 | Hatırlamak yerine tanıma | 3/4 | Etiketler, örnekler ve etkin sekme yardımcı; görünüm seçimi ve yöntemler yine de çok sayıda seçeneği hatırlatıyor. |
| 7 | Esneklik ve verimlilik | 4/4 | Komut paleti, klavye kısayolları, geçmiş ve URL durumu güçlü hızlandırıcılar. |
| 8 | Estetik ve minimalist tasarım | 2/4 | Temel estetik güçlü; laboratuvarlardaki içerik yoğunluğu ve eş düzeyli gezinme odağı dağıtıyor. |
| 9 | Hataları tanıma ve kurtarma | 2/4 | Bazı hata / durum bildirimleri var; laboratuvar hatalarından sonra yönlendirme ve toparlanma tutarlı değil. |
| 10 | Yardım ve dokümantasyon | 3/4 | Öğrenci kipi ile Ders görünümü iyi bir iskele kuruyor; yardım en zor kararların yanında her zaman bulunmuyor. |
| **Toplam** |  | **28/40 — İyi temel** | **Gezinme ve yoğunluk iyileştirmeleri gerekli.** |

## Bilişsel yük

**Yüksek — 8 kontrol maddesinden 5'i başarısız veya belirgin biçimde zorlanıyor.**

- **Tek odak:** Ara ve Harita'da iyi; laboratuvar ekranlarında çok sayıda eşzamanlı amaç dikkati bölüyor.
- **Küçük gruplar (en çok 4):** başarısız. N-gram kontrolleri ve 12–13 görünümlü gezinme aynı anda çok sayıda seçenek sunuyor.
- **İlişkili öğelerin gruplanması:** genel olarak başarılı.
- **Görsel hiyerarşi:** ilk arama ve harita başlangıç ekranlarında başarılı; yoğun sonuç tablolarında zayıflıyor.
- **Bir seferde tek karar:** başarısız. Bazı araçlar kaynak, yöntem, parametre ve çıktı adımlarını birlikte gösteriyor.
- **Seçenek sayısını sınırlama:** başarısız. 12–13 görünüm, Ara ekranında dokuz örnek sözcük ve N-gram'da çok sayıda kontrol / geçmiş seçeneği var.
- **Çalışma belleği:** başarısız. Kullanıcının aynı anda yöntem, parametre ve daha önce seçtiği bağlamı izlemesi gerekiyor.
- **Aşamalı açıklama:** başarısız. Öğrenci kipi öğretici içeriği açıyor; ancak araç içindeki ileri kontroller ve uzun bölümler de baştan görünür.

## Genel izlenim ve duygusal akış

İlk arama ve boş harita ekranı davetkâr; kavramın anlamlarından ilişkilerine geçiş güçlü bir “aha” anı yaratıyor. Akışın en zayıf noktası laboratuvarlara geçiş: birden fazla kontrol grubu ve uzun sonuç içeriği, merakı “şimdi ne yapmalıyım?” sorusuna dönüştürebiliyor. Ders görünümü öğrenme bağlamını geri getiriyor; ancak araçlar ile ders içeriği arasında daha açık bir aşama ve gezinme yapısı yararlı olur.

## Güçlü taraflar

1. **Ürüne özgü, tutarlı görsel dünya:** iki renkli sözlük dili ile kavram haritası alanın kendisini anlatıyor; yeni bir görsel kimliğe gerek yok.
2. **Keşiften analize bağlantı:** komut paleti, kavram bağlantıları ve paylaşılabilir URL araştırma akışını hızlandırıyor.
3. **Araç / Öğrenci ayrımı:** sonuç odaklı kullanım ile ders açıklamalarını aynı hesaplama araçlarında ayırması kullanıcının iki bağlamına da uyuyor.

## Öncelikli bulgular

### 1. [P1] Mobil üst çubukta kip denetimi kesiliyor

- **Kanıt:** 375 px Araç ve Öğrenci ekran görüntülerinde “Araç / Öğrenci” segmentinin ikinci seçeneği sağ kenarda kesiliyor. Sözlük dili segmenti de aynı satırda yer kaplıyor.
- **Neden önemli:** Kip seçimi öğretici içeriğin görünürlüğünü değiştiriyor; mobilde erişilememesi yalnızca kozmetik değil, temel kullanım davranışını etkiliyor.
- **Kaynak:** `static/index.html` üst çubuk öğeleri; `static/css/app.css` mobil üst çubuk kuralları (441–490).
- **Öneri:** Dar görünümde dil ve kip denetimlerine sığan, etiketli bir yerleşim oluştur; gerekli olmayan denetimleri açıkça erişilebilir menüye taşı. Denetimi yalnızca gizleyip erişilemez bırakma.
- **Önerilen komut:** `$impeccable adapt`.

### 2. [P2] 13 görünüm düz bir gezinme listesi

- **Kanıt:** 12–13 görünüm kenar çubuğunda aynı düzeyde; kısa yol düzeni de tek bir uzun görünüm dizisini izliyor.
- **Neden önemli:** Yeni öğrenci doğru aracı bulmak için gezinme listesini ezberlemek zorunda kalıyor; bu, ders sırasını ve konu ilişkilerini yansıtmıyor.
- **Kaynak:** `static/js/ui.js:71` ve `static/index.html:14–16` (sekme kabuğu).
- **Öneri:** Sözcüksel anlam, Lecture 2, Lecture 3, Lecture 5 ve Ders kümelerini görünür başlıklarla gruplandır; aktif görünümün yeri korunurken palet ve kısayol sırasını aynı mantıkta tut.
- **Önerilen komut:** `$impeccable distill`.

### 3. [P2] N-gram ve uzun NLP laboratuvarları ileri kontrolleri erken gösteriyor

- **Kanıt:** N-gram tek ekranda korpus, n, yumuşatma, UNK, küçük harf seçimi, istatistikler, geçmiş sözcükler, sayım / olasılık çıktıları ve sonraki bölümleri sunuyor; N-gram'da sekiz numaralı bölüm var.
- **Neden önemli:** Öğrencinin hangi kontrolün mevcut göreve ait olduğunu ve hangi çıktıyı önce okuyacağını ayırt etmesi zorlaşıyor. Araç kipinde gereksiz açıklama ve tekrar da sonucu gölgeler.
- **Kaynak:** `static/js/ngram.js:110,324–358`; örnek uzun laboratuvarlar `static/js/morph.js`, `static/js/parse.js` ve `static/js/disamb.js`.
- **Öneri:** Temel işlem ve sonucu öne çıkar; yöntem/parametre ayrıntılarını ilgili adıma bağla veya katlanır bölümlere koy. Hiçbir yeteneği kaldırma; araç kipindeki açıklama yoğunluğunu azaltırken `.stu` içeriğini Öğrenci kipinde koru.
- **Önerilen komut:** `$impeccable clarify`.

### 4. [P2] Sunum modunda kabuk hover olmadan kullanılamıyor

- **Kanıt:** Sunum kipinde ray ve üst çubuk saydam ve `pointer-events:none`; yalnızca hover olunca geri geliyor.
- **Neden önemli:** Projeksiyon önünde fare/trackpad hareketi görünümü beklenmedik biçimde açabilir; dokunma ve klavye kullanan sunucu çıkış denetimini fark etmeyebilir.
- **Kaynak:** `static/css/app.css:432–434`; sunum ve sınıf kullanımı ürün bağlamında tanımlı.
- **Öneri:** Sunum denetimlerini dokunma ve klavyeyle açıkça erişilebilir yap; gizlenen kabukla birlikte çıkış yolunu gizleme.
- **Önerilen komut:** `$impeccable layout`.

## Otomatik detector ve tarayıcı kanıtı

Impeccable 0.1.18 detector çıktısı, tasarım incelemesindeki mobil sıkışma ve yoğunluk kaygılarına ek olarak ölçülebilir koyu tema kontrast sorunu gösterdi:

- **Çalışan URL, varsayılan masaüstü:** 4 uyarı — küçük işlevsel metinler (`.rail-sec h2` “İz”, `#omniKbd`, tarihçe içindeki `.kbd`, 10.8 px) ve `#sq` alanı yer tutucusunda **3.9:1** kontrast (`#757575` / `#101626`; normal metin eşiği 4.5:1).
- **Çalışan URL, 390×844:** 3 uyarı — `#gwMid` (“Türkçe · KeNet”, 10.8 px), aynı tarihçe kısayolu ve aynı **3.9:1** yer tutucu kontrastı.
- **Kaynak HTML taraması:** 0 birincil bulgu; `4px` yarıçap için 1 advisory. Bu, tasarım belgesindeki küçük yuvarlatma ölçeğiyle eşleştiğinden bilgi amaçlı; hata değil.
- **Görsel tarayıcı denetimi:** mobil 390×844 görünümde sayfa yatay/dikey taşması yoktu. İncelenen görünür hedefler 24×24 px altına inmedi; bazı hedefler 26–38 px yükseklikteydi. Bir odak örneğinde iki temada da 2 px odak halkası görüldü. Bu, tüm görünümlerin tüm klavye yollarını doğrulamaz.
- **Tema etkisi:** yer tutucu kontrastı karanlık görünümde 3.91:1; açık görünümde 4.56–4.61:1. Bu nedenle bulgu yanlış pozitif değil, koyu temaya özgü.
- **Overlay:** enjeksiyon ön kontrolü başarılı; araç görünür işaretleri harita, benzerlik ve arama sonuçlarında gösterdi. Konsol bulguları sırasıyla 4, 2 ve 10. SPA gezinmesi eski işaretleri bırakabildiğinden yalnızca taze sayfa görüntüleri kanıt sayıldı. Geçici overlay sunucusu durduruldu.

**Detector’ın eklediği bulgu:** küçük metin ve koyu tema yer tutucu kontrastı, görsel eleştiri listesinden ayrı olarak erişilebilirlik geçişinde ele alınmalı.

## Persona kırmızı bayrakları

- **Alex — deneyimli kullanıcı:** Komut paleti ve kısayollar hızlı; fakat 12–13 eş düzeyli görünüm ve N-gram'da çok seçenek, sık kullanılan hedefe ulaşma maliyetini yükseltiyor.
- **Sam — klavye / ekran okuyucu kullanan kişi:** örnek odak halkası olumlu; küçük işlevsel etiketler ve koyu tema yer tutucu kontrastı sorun. Kapsamlı klavye/screen-reader testi henüz yapılmadı.
- **Alper — COMP 451 öğrencisi:** örnekler ve Öğrenci kipi açıklama sağlıyor; uzun laboratuvarda çok sayıda kontrol ve geniş yöntem tabloları ilk adımı belirsizleştirebilir.
- **Derse projeksiyonla sunum yapan hoca:** sunum ölçeği yararlı; görünmez ve hover'a bağlı kabuk, ders sırasında kontrolü zorlaştırabilir.

## Küçük gözlemler

- Açık ve koyu temalar aynı kâğıt/mürekkep karakterini koruyor; kategori renkleri eklemek yerine çizgi biçimi yaklaşımı sürdürülmeli.
- 390 px taşmasız ölçüm olumlu, ancak mobil tıklama hedeflerinin bazısı 40 px hedefinin altında. Tüm sayfa ölçeğinde hedef boyutu denetimi sonraki audit aşamasına bırakılmalı.
- Belirsizlik ve Morfoloji'deki ayrıntı ile açıklama, Öğrenci kipinde değerlidir; sadeleştirme bu içeriği silmemeli, kademeli göstermeli.

## Üzerinde düşünmeye değer sorular

- Yeni bir öğrenciye önce dört gezinme hedefi göstermek gerekse, ders akışında en hızlı faydayı sağlayacak hedefler hangileri olurdu?
- Canlı sunumda hangi denetimler sürekli görünür kalmalı; hangileri yalnızca etkileşimle açılmalı?
- N-gram'da ilk iş olarak hangi tek görev öne çıkmalı: sayım, sonraki sözcük, cümle olasılığı/perplexity, yoksa PMI?
