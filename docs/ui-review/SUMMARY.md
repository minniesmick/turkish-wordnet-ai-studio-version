# Arayüz iyileştirme özeti

**Tarih:** 2026-11-03
**Dal:** `ui/impeccable`
**Kapsam:** sunum katmanı ve tasarım belgeleri; hesaplama modülleri ile sunucu değişmedi.

## Sonuç

“İki Renkli Sözlük” görsel dili korundu; 13 görünüm, iki kullanım kipi ve açık/koyu temalar aynı yerel, bağımlılıksız arayüz içinde tutarlı hale getirildi. Ders sırasına göre gezinme, mobil kabuk ve laboratuvarlardaki bölüm içi gezinme geliştirildi. Dar ekranda dokunma hedefleri 40 px'e çıkarıldı; Harita araçları artık diyagramın üstüne binmiyor.

## Yapılanlar

- **Kabuk:** 13 görünüm ders bağlamına göre gruplandı; komut paleti ve kısayol penceresi aynı sıralamayı izliyor. İz/çalışma listesi WordNet dışı görünümlerde gizleniyor; kip açıklamaları ve sunumdan çıkış keşfedilebilir.
- **Görünümler:** Belirsizlik, Morfoloji, Ayrıştırma, Bağımlılık, N-gram, Korpus ve Ders'te hiyerarşi, bölüm gezinmesi, kaydırılabilir sonuçlar ve durum anlatımı iyileştirildi; WordNet görünümleri ortak tasarım diline uyarlandı.
- **Mobil ve erişilebilirlik:** form alanları, seçimler, düğmeler, bölüm bağlantıları ve onay kutusu etiketleri için 40 px hedef alanı; görünür klavye odağı ve tablo kaydırma bölgeleri korundu. Morfoloji ilk açılışındaki otomatik odak/kaydırma kaldırıldı. Harita araç çubuğu diyagramdan ayrıldı.
- **Tasarım sistemi:** `DESIGN.md`, `.impeccable/design.json`, `.impeccable/config.json` ve surface brief güncellendi; detector istisnaları karar gerekçeleriyle yenilendi.
- **Raporlama:** başlangıç değerlendirmesi [critique.md](./critique.md), teknik ölçüm ve kapanış durumu [audit.md](./audit.md), kabuk yönü [shell.md](./shell.md) içinde.

## Ölçülen doğrulama

- **100 ekran görüntüsü** [after/](./after/) içinde: 13 görünüm (Ders yalnızca Öğrenci kipi), Araç/Öğrenci, açık/koyu, 375/1280 px.
- **139 DOM durumu:** ana matris ve ek 320/768/1920 px kontrollerinde sayfa yatay taşması yok; Araç kipinde `.stu` sızıntısı yok; sayfa hatası yok.
- **375 px dokunma hedefi taraması:** 13 görünümde görünür etkileşim hedeflerinde 40×40 px altı bulgu yok.
- Koyu arama yer tutucusu kontrastı: **6,33:1**. Sistem koyu teması ve `prefers-reduced-motion` emülasyonu; `P` ile sunum kipine giriş ve `Esc` ile çıkış doğrulandı.
- Ayrıştırma, Bağımlılık ve Zipf yüzeylerinde SVG/PNG indirmeleri çalıştı. Koyu tema kaynaklı dışa aktarma da açık renk arka plan ve doğru PNG imzasıyla doğrulandı.
- Yedi test geçti: `test_turkish`, `test_fsm`, `test_lm`, `test_mle`, `test_parsers`, `test_md`, `test_zmap`. Değişen JS modüllerinde `node --check` ve tüm diff'te `git diff --check` temiz.
- Son Impeccable detector taraması bulgusuz.

## Değişen yüzeyler

`static/index.html`, `static/css/app.css`, görünüm JS modülleri (`corpus`, `deps`, `disamb`, `frames`, `fsmquiz`, `graph`, `learn`, `morph`, `ngram`, `parse`, `relate`, `roles`), `DESIGN.md`, `.impeccable/` tasarım dosyaları, `docs/ui-review/` ve `TODO.md`.

`server.py`, saf hesaplama/içerik modülleri ve bağımlılık manifestleri değiştirilmedi; yeni bağımlılık veya dış istek eklenmedi.

## Kalan sınırlar

- Fiziksel telefon ve gerçek dokunma hareketleri; ekran okuyucu; bütün görevler için klavye ile uçtan uca test; 200% zoom ve cihaz performans profili ölçülmedi.
- Java 25 ve Zemberek JAR mevcut olduğundan JAR/JDK bulunmayan ortam ayrı bir makinede sınanmadı.
- Impeccable CLI bu kurulumda `audit` komutunu sunmuyor; son teknik kontrol detector ve DOM/viewport ölçümleriyle yapıldı.
