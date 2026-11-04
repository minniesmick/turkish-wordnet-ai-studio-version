---
version: 2
slug: "static-index-html"
primary_target: "static/index.html"
related_targets:
  - "static/css/app.css"
  - "static/js/ui.js"
  - "static/js/core.js"
  - "static/js/search.js"
  - "static/js/graph.js"
  - "static/js/relate.js"
  - "static/js/wsd.js"
  - "static/js/roles.js"
  - "static/js/frames.js"
  - "static/js/morph.js"
  - "static/js/disamb.js"
  - "static/js/parse.js"
  - "static/js/deps.js"
  - "static/js/corpus.js"
  - "static/js/ngram.js"
  - "static/js/learn.js"
---

# Surface brief: Türkçe WordNet çalışma alanı (Operate)

Scope: tek sayfalık yerel NLP çalışma alanının tüm kabuğu ve 13 görünümü: Ara, Harita, Benzerlik, Anlam seçimi, Roller, Çerçeveler, Morfoloji, Belirsizlik, Ayrıştırma, Bağımlılık, Korpus, N-gram ve Ders. Sunum katmanıyla sınırlı; hesaplama, veri ve sunucu davranışı kapsam dışı.
Visitor mode: Operate. Günlük çalışma ile sınıf projeksiyonu eşit derecede birinci sınıf kullanım bağlamlarıdır.
Audience/job: COMP 451 öğrencisi; Türkçe sözcük anlamı ve WordNet ilişkilerinden morfoloji, belirsizlik, ayrıştırma, bağımlılık, korpus ve n-gram çalışmalarına geçer. Öğrenci, Araç kipinde yalın sonuçları; Öğrenci kipinde ders açıklamalarını ve alıştırmaları kullanır. Hoca aynı arayüzü sınıfta yansıtır.
Constraints: Türkçe arayüz (`lang="tr"`); mevcut API, `?v=`, `?mode=student`, `?theme=`, `wn:*` ve `wn:p:theme` durumu çalışır kalır; yeni bağımlılık, CDN, uzak font, telemetri veya ağ isteği yoktur. `server.py` ve saf hesap modüllerine dokunulmaz. `.stu` içerikleri Araç kipinde görünmez. Ultramarin tek etkileşim/odak rengidir; kategoriler çizgi biçimiyle ayrılır.
Unresolved: yok.

## Direction contract

THESIS: İki Renkli Sözlük dili, baskı sözlüğü metaforunu tek tip şablona zorlamadan NLP çalışma alanına taşır: anlam yüzeylerinde sözlük maddesi, laboratuvarlarda ölçülü çalışma tezgâhı, Ders'te okunabilir ders notu.
OWN-WORLD: Soğuk ince kâğıt (#f5f7fb), mavi-siyah mürekkep (#0d1220), ultramarin (#2b3bd6) yalnızca etkileşim/odak için; koyu temada aynı roller terslenir. Schibsted Grotesk arayüz ve sözcükleri, Spectral tanım ve ders metnini, JetBrains Mono kod/etiket/sayıları taşır. Kıl çizgi, satır biçimi, kutulu numara, 6px yüzey yarıçapı; renkli kategori kodlaması, kart yığını ve sert gölge yoktur.
STORY: Kullanıcı ders akışına göre beş gezinme grubundan bir görünüm seçer. WordNet'te sözcük ve kavram ilişkilerini izler; NLP laboratuvarında girdi, yöntemi ve sonucu aynı bağlamda çalışır. Araç/Öğrenci anahtarı yalnızca öğretici açıklama ve alıştırmaları açar/kapatır, hesabı değiştirmez. Sunum modu kabuk erişimini ve çıkış yolunu korur.
FIRST VIEWPORT: Masaüstünde solda ders bağlamına göre gruplanmış sekmeler; üstte arama, yalnızca ilgili WordNet görünümlerinde dil seçimi, açık etiketli Araç/Öğrenci seçimi ve tema/sunum/kısayol eylemleri; içerik alanında görünümün adı, tek birincil görev ve sonuç. Mobilde arama ayrı ilk satırda, kip/dil/tema denetimleri görünür ikinci satırda; tablo ve diyagramlar yalnızca kendi kaydırma alanlarında taşar.
FORM: Mevcut İki Renkli Sözlük görsel dili korunur; işlevsel hiyerarşi, bölüm içi gezinme, aşamalı açıklama, klavye/dokunma ve iki kip/tema için sağlam durum tasarımıyla olgunlaştırılır. Yeni görsel kimlik veya bağımlılık eklenmez.
FINISH: Tüm 13 görünümün Araç/Öğrenci, açık/koyu, dar/geniş ve temel klavye yolları gözlemlenmiş olmalı. Yatay sayfa taşması, görünür `.stu` sızıntısı, karşılıksız yükleme/hata durumu veya açıklanmamış detector bulgusu kalmamalı; ölçülmeyen cihaz/erişilebilirlik iddiaları açıkça sınırlandırılmalı.
