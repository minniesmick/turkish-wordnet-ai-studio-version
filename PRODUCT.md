# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Alper, MEF Üniversitesi Veri Bilimi öğrencisi; COMP 451 (Doğal Dil İşlemeye Giriş, Dr. Seniz Demir, Güz 2026) dersini çalışırken ve sınıf içi ödevlerini yaparken kullanıyor. Aynı arayüz derste hocaya ve sınıf arkadaşlarına gösteriliyor. İkincil kitle, uygulama paylaşılırsa aynı dersi alan öğrenciler. Arayüz dili Türkçe; veriler Türkçe ve İngilizce.

## Product Purpose
Türkçe ve İngilizce sözcüksel kaynakları ile doğal dil işleme laboratuvarlarını tek yerde çalıştırmak; COMP 451 Lecture 1–5 kavramlarını canlı örnekler ve alıştırmalarla incelemek. Başarı: bir kavramdan ilgili anlamlara ve kaynaklara dağılmadan geçebilmek, NLP yöntemlerini gözle görülür çıktılarla deneyebilmek ve ders sırasında bunları sınıfa gösterebilmek.

## Positioning
Türkçe ve İngilizce WordNet, PropBank / TRopBank, VerbNet ve FrameNet aynı kavram çevresinde bağlanır. Aynı yerel çalışma alanı; sözcüksel anlamı, morfolojik belirsizliği, CKY ve bağımlılık çözümlemesini, korpus istatistiklerini ve n-gram modellerini ders sırasına uygun laboratuvarlarla birleştirir.

## Operating Context
Yerel çalışır: Python standart kütüphane sunucusu (`server.py`, 8770) ve derleme adımı olmayan tek sayfalık HTML / vanilla ES modül arayüzü. Sunucu yalnızca yerel arabirimlerde dinler. Veriler `data/` altındadır (~117 MB): Starlang TurkishWordNet, TurkishPropBank ve TurkishFrameNet; PropBank 3.4, FrameNet 1.7, VerbNet 3.3, SemCor, SENSEVAL-2 ve UD Turkish-BOUN. Laptopta günlük çalışma ve derste projeksiyon kullanımı hedeflenir; açık / koyu tema ile masaüstü ve mobil ekranlar desteklenir. Görünüm, arama ve kip durumu paylaşılabilir URL'lerle korunur.

## Capabilities and Constraints
- 13 görünüm: Ara, Harita, Benzerlik, Anlam seçimi, Roller, Çerçeveler, Morfoloji, Belirsizlik, Ayrıştırma, Bağımlılık, Korpus, N-gram ve Ders.
- Sözcüksel çalışmalar: KeNet, Princeton WordNet 3.1 ve 1998 sözlüğünde arama; kavram haritası; yol / bilgi içeriği tabanlı benzerlik; Lesk ve Naive Bayes ile anlam seçimi; PropBank, TRopBank, VerbNet ve FrameNet gezgini; Türkçe rol etiketleme ve alıştırması.
- NLP laboratuvarları: Zemberek veya sınırlı çevrimdışı kural motoruyla Türkçe morfoloji; BOUN üzerinde morfolojik belirsizlik giderme; CFG / PCFG, CKY, adım adım ayrıştırma ve MLE; UD Turkish-BOUN cümlelerinden bağımlılık ağacı; BOUN / Brown verileriyle korpus ve n-gram çalışmaları.
- Ders görünümü, Lecture 1–5 içeriklerini ilgili araçlara hazır örneklerle bağlar. Araç kipi yalnızca sonuçları; Öğrenci kipi açıklama, formül, kural izi, alıştırma, sınav ve Ders görünümünü sunar. Öğretici içerik `.stu` ile işaretlenir; `learn` yalnızca Öğrenci kipinde bulunur.
- Terimler: synset, lemma, sense, hypernym / hyponym, meronym / holonym, LU, FE, roleset, ARG0–ARG4, UPOS, FEATS, CFG, CKY, perplexity ve durum ekleri.
- Kullanıcıya özel kayıtlar (favoriler, iz, notlar ve tercihler) tarayıcıda tutulur; hesap veya sunucu taraflı kullanıcı profili yoktur. Var olan API, `?v=`, `?mode=student`, `?theme=` ve `wn:*` yerel depolama anahtarları geriye dönük çalışmalıdır.
- Bağımlılık eklenmez; arayüz mevcut HTML, tek CSS dosyası ve vanilla ES modülleriyle kalır. Arayüz işi sunucunun yerel dinleme adreslerini değiştirmez.
- Zemberek (`lib/zemberek-full.jar` ve JDK) isteğe bağlıdır. Olmadığında morfoloji ve belirsizlik görünümleri küçük yerel motora düşer; bu motor gerçek bir çözümleyici değildir ve kapsamı sınırlıdır.
- Veri / yöntem sınırları görünür tutulur: Lesk ve kural tabanlı etiketleme yaklaşık sonuç verir; BOUN alt kümeleri, sabit eğitim / sınama ayrımları, UD etiket eşlemeleri ve n-gram yaklaşıkları doğruluk iddiası gibi sunulmaz. FOL, CCG ve söylem semantiği uygulamada yoktur.

## Evidence on Hand
Gerçek kaynaklar: KeNet 78.327 synset, PWN 3.1 117.791 synset, TRopBank 17.526 fiil çerçevesi, PropBank 3.4 11.198 roleset, FrameNet 1.7 1.221 çerçeve, VerbNet 594 sınıf, SemCor 224.149 anlam etiketi ve SENSEVAL-2 interest 2.368 örnek. NLP laboratuvarlarında BOUN eğitim / sınama verileri ve SemCor cümlelerinden oluşturulan Brown örnekleri kullanılır. Ders slaytları ve InClass PDF'leri ders eşlemesinin kaynağıdır. Müşteri, kullanıcı sayısı ya da ölçülmemiş başarı oranı iddiası uydurulmaz.

## Product Principles
1. Bağlantılı kavram: sözcük, anlam, hiyerarşi, rol, çerçeve ve çeviri arasında bağlam kaybetmeden geçilir.
2. İki kullanım amacı: Araç kipi hızlı ve sade sonuç verir; Öğrenci kipi yöntemleri ve ders alıştırmalarını görünür kılar.
3. Veri dürüstlüğü: yöntem sınırları saklanmaz; doğruluk ve istatistikler ölçümden gelir.
4. Ders ve bireysel çalışma: aynı araçlar gündelik keşfi ve projeksiyonda anlaşılır canlı anlatımı destekler.
5. Bağlam korunur: görünüm ve paylaşılabilir bağlantı sonraki adıma geçerken durumu taşır.

## Accessibility & Inclusion
Türkçe karakterler (İ/ı, ç ğ ö ş ü) ve Türkçe yerel büyük / küçük harf işlemleri doğru olmalıdır. Arayüz Türkçe; iki tema, klavye ile kullanım, görünür odak ve yeterli kontrast sağlamalıdır. İçerik hem mobil ekranda hem projeksiyonda okunabilir kalmalıdır.
