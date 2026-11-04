# Veri kaynakları ve lisanslar

Bu klasördeki dosyalar açık kaynaklı kaynaklardan alınmıştır. Dosyalar depoda hazır durur; aşağıdaki bağlantılardan yeniden indirilebilir ya da üretilebilir.
Depodaki **kod** MIT, **veri** ise her kaynağın kendi lisansı altındadır (aşağıda). Türetilmiş JSON dosyaları kaynağın lisansını taşır.

## Starlang Software (Türkçe)

| Dosya | Kaynak | Lisans |
|---|---|---|
| `turkish_wordnet.xml` | [StarlangSoftware/TurkishWordNet](https://github.com/StarlangSoftware/TurkishWordNet) · [`src/main/resources/turkish_wordnet.xml`](https://github.com/StarlangSoftware/TurkishWordNet/blob/master/src/main/resources/turkish_wordnet.xml) | CC BY-SA 4.0 (veri), GPL-3.0 (kod) |
| `english_wordnet_version_31.xml` | aynı depo · [`src/main/resources/english_wordnet_version_31.xml`](https://github.com/StarlangSoftware/TurkishWordNet/blob/master/src/main/resources/english_wordnet_version_31.xml) (Princeton WordNet 3.1) | [WordNet lisansı](https://wordnet.princeton.edu/license-and-commercial-use) |
| `turkish1998_wordnet.xml` | aynı depo · [`turkish1998_wordnet.xml`](https://github.com/StarlangSoftware/TurkishWordNet/blob/master/turkish1998_wordnet.xml) | CC BY-SA 4.0 |
| `turkish-propbank.xml` | [StarlangSoftware/TurkishPropBank](https://github.com/StarlangSoftware/TurkishPropBank) · `src/main/resources/turkish-propbank.xml` | depodaki lisansa bakın (GPL-3.0 / CC BY-SA 4.0) |
| `framenet.xml` | [StarlangSoftware/TurkishFrameNet](https://github.com/StarlangSoftware/TurkishFrameNet) · `src/main/resources/framenet.xml` | depodaki lisansa bakın (GPL-3.0 / CC BY-SA 4.0) |

## İngilizce kaynaklar (`scripts/build_srl.py` ile üretilir)

| Dosya | Kaynak | Lisans |
|---|---|---|
| `propbank_en.json` | [propbank/propbank-frames](https://github.com/propbank/propbank-frames) (PropBank 3.4) | CC BY-SA 4.0 |
| `framenet_en.json` | [FrameNet 1.7](https://framenet.icsi.berkeley.edu/) (ICSI), [nltk_data `framenet_v17`](https://github.com/nltk/nltk_data/tree/gh-pages/packages/corpora) üzerinden | CC BY 3.0 |

## NLTK veri deposu (`scripts/build_nltk.py` ile üretilir)

Hepsi [nltk/nltk_data](https://github.com/nltk/nltk_data/tree/gh-pages/packages/corpora) içindeki paketlerdir.

| Dosya | Paket | Orijinal kaynak / lisans |
|---|---|---|
| `wn31_extra.json.gz` | `wordnet31` | [Princeton WordNet 3.1](https://wordnet.princeton.edu/), WordNet lisansı |
| `semcor.json.gz` | `semcor` | SemCor 3.0 (Princeton / Brown Corpus anlam etiketleri); lisans için kaynağa bakın |
| `senseval.json.gz` | `senseval` | SENSEVAL-2 (`hard`, `interest`, `line`, `serve`); lisans için kaynağa bakın |
| `verbnet.json` | `verbnet3` | [VerbNet 3.3](https://verbs.colorado.edu/verbnet/) (CU Boulder), CC BY 4.0 |
| `framenet_lu_ex.json.gz` | `framenet_v17` | FrameNet 1.7 (ICSI), CC BY 3.0 |
| `ud/tr_boun-ud-test.conllu` | `ud/UD_Turkish-BOUN-README.md` | [UD Turkish-BOUN](https://github.com/UniversalDependencies/UD_Turkish-BOUN) test kümesi (Boğaziçi, Universal Dependencies), CC BY-SA 4.0. InClass 4 için bağımlılık ağacı sekmesi |

SemCor ve SENSEVAL için lisans bilgisini bu depoda doğrulamadım; ders amaçlı kullanım için NLTK veri deposundaki dağıtım olduğu gibi alınmıştır.

## Yeniden indirme

    B=https://raw.githubusercontent.com/StarlangSoftware
    curl -L -o data/turkish_wordnet.xml $B/TurkishWordNet/master/src/main/resources/turkish_wordnet.xml
    curl -L -o data/english_wordnet_version_31.xml $B/TurkishWordNet/master/src/main/resources/english_wordnet_version_31.xml
    curl -L -o data/turkish1998_wordnet.xml $B/TurkishWordNet/master/turkish1998_wordnet.xml
    curl -L -o data/turkish-propbank.xml $B/TurkishPropBank/master/src/main/resources/turkish-propbank.xml
    curl -L -o data/framenet.xml $B/TurkishFrameNet/master/src/main/resources/framenet.xml
    curl -L -o data/ud/tr_boun-ud-test.conllu https://raw.githubusercontent.com/UniversalDependencies/UD_Turkish-BOUN/master/tr_boun-ud-test.conllu
    python3 scripts/build_srl.py      # propbank_en.json, framenet_en.json
    python3 scripts/build_nltk.py     # wn31_extra, semcor, senseval, verbnet, framenet_lu_ex
