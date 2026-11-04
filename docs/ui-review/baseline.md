# Aşama 0 — taban çizgisi

Tarih: 2026-11-03  
Dal: `ui/impeccable`  
Kapsam: mevcut arayüz; bu aşamada uygulama kodu değiştirilmedi.

## Testler ve çalışma durumu

Yedi test betiği başlangıçta geçti:

| Betik | Sonuç |
|---|---:|
| `node scripts/test_turkish.mjs` | geçti — üretim 43/43, ek denetimi 54/54 |
| `node scripts/test_fsm.mjs` | geçti — Sample.pdf yolları 4/4, alıştırma havuzu 25 çözümleme |
| `node scripts/test_lm.mjs` | geçti — 41/41 |
| `node scripts/test_mle.mjs` | geçti — 19/19 |
| `node scripts/test_parsers.mjs` | geçti — 13/13 |
| `node scripts/test_md.mjs` | geçti — 34/34 |
| `node scripts/test_zmap.mjs` | geçti — 36/36 |

`python server.py` ile açılan `http://127.0.0.1:8770/` yanıtı HTTP 200 verdi. `lib/zemberek-full.jar` ve Java bulundu. Morfoloji görünümünde hem Zemberek hem küçük kural motoru seçildi; Belirsizlik görünümünde Zemberek karşılaştırması çalıştırılıp sonuçları kaydedildi. Bu, küçük motorun kullanımını doğrular; JAR'sız sunucu başlatma durumu henüz ayrı doğrulanmadı.

Test çalıştırmalarında `C:\Users\alper\package.json` kaynaklı Node `MODULE_TYPELESS_PACKAGE_JSON` uyarıları görüldü; yedi test de başarılı çıkış koduyla tamamlandı. Tarayıcı konsolu bu aşamada ayrıca denetlenmedi.

## Ekran görüntüleri

[before/](./before/) altında 102 PNG var; toplam 9,82 MiB, sıfır bayt dosya yok:

- 100 görünüm ekranı: 12 araç sekmesinin Araç ve Öğrenci kipleri ile Ders'in Öğrenci kipi; açık / koyu tema ve 1280×900 / 375×812 görünüm alanları. Dosya adı: `<görünüm>-<kip>-<tema>-<genişlik>.png`.
- N-gram görüntülerinde BOUN · Türkçe kaynağı seçildi; Belirsizlik, Ayrıştırma, Bağımlılık, Korpus, Morfoloji ve Ders ekranları yüklü örnek içerikle yakalandı.
- İki ek tam sayfa karşılaştırma: [Zemberek açıkken Belirsizlik](./before/belirsizlik-arac-acik-1280-zemberek.png) ve [küçük kural motoruyla Morfoloji](./before/morfoloji-arac-acik-1280-kucuk-motor.png).

Örnek önizlemeler: [Morfoloji / Araç / açık / 1280](./before/morfoloji-arac-acik-1280.png), [Belirsizlik / Araç / açık / 1280](./before/belirsizlik-arac-acik-1280.png), [N-gram / Araç / açık / 375](./before/ngram-arac-acik-375.png), [Ders / Öğrenci / açık / 375](./before/ders-ogrenci-acik-375.png).

## Bağlam yenilemesi

`PRODUCT.md` 13 görünüm, iki kullanım kipi ve Lecture 1–5 laboratuvarlarını kapsayacak biçimde güncellendi. `DESIGN.md`, “İki Renkli Sözlük” dilini koruyarak aynı görsel sistemi NLP görünümlerine, kip anahtarına, tablolara ve diyagramlara genişletiyor.

Impeccable skill kurulu ve yönergeleri okundu. Skill'in `document` akışı izlendi; ancak bu makinedeki 0.1.18 launcher `document` komutunu sunmuyor (yalnızca `detect` ve `ignores` destekleniyor), bu nedenle bağlam belgeleri okunan referanslara göre elle güncellendi. `.impeccable/design.json` yan dosyasının son uyumu Aşama 6'da yapılacak.
