# Türkçe WordNet · React & TypeScript NLP Workspace

A production-grade React application for exploring lexical semantics and computational linguistics resources: Turkish and English WordNet (KeNet & Princeton WordNet 3.1), PropBank & TRopBank, FrameNet 1.7, and VerbNet 3.3.

Built for **COMP 451 – Introduction to Natural Language Processing** (MEF University, Fall 2026).

## Stack & Architecture

- **Frontend**: React 18, TypeScript, Vite SPA, Tailwind/modern CSS design system with light/dark theme support.
- **Backend**: Node.js Express server (`server.ts`) proxying and coordinating background NLP services (`server.py`) for high-performance in-memory dataset searches across 200,000+ synsets.
- **Port**: Runs on port 3000 (`0.0.0.0:3000`).

## Key Features

1. **Ara (Search)**: Search across Turkish KeNet, Princeton WordNet 3.1, and 1998 dictionaries. Filter by POS, sense, categories, example sentences, and diacritics. Interactive concept sheet drawer with definition, synonyms, hierarchy paths, and cross-lingual counterparts.
2. **Harita (Graph)**: Interactive concept map and relational tree explorer. Pan, zoom, depth controls, sibling toggle, and click-to-sheet or double-click to re-center.
3. **Benzerlik (Similarity & Distance)**: Compare semantic similarity between two concepts. Path distance, Wu-Palmer, Resnik IC, Lin IC, Jiang-Conrath, and Lowest Common Subsumer (LCS) fork diagram.
4. **Anlam Seçimi (WSD)**: Word Sense Disambiguation using knowledge-based Lesk and supervised Naive Bayes (trained on SemCor & SENSEVAL-2 with 5-fold cross-validation).
5. **Roller (Roles)**: English PropBank, Turkish PropBank (TRopBank), and VerbNet 3.3 dictionary. Interactive Turkish Semantic Role Labeler with case-marker analysis and argument assignments. Multiple-choice role quiz.
6. **Çerçeveler (Frames)**: FrameNet 1.7 and Turkish FrameNet explorer with Core/Peripheral Frame Elements, Lexical Units, Frame Relations, and annotated sentence examples.
7. **Morfoloji (Morphology)**: Turkish morphological analysis, suffix generation, Finite State Machine (FSM) state transition trace, and FSM path quiz.
8. **Belirsizlik (Disambiguation)**: Morphological disambiguation evaluated on UD Turkish-BOUN treebank (Baseline, Decision List, Averaged Perceptron).
9. **Ayrıştırma (Parsing)**: CFG and PCFG syntactic parsing. Interactive triangular CKY chart table, parse tree diagrams, step-by-step parser simulator, and Treebank MLE learner.
10. **Bağımlılık (Dependencies)**: Universal Dependencies (UD Turkish-BOUN) treebank viewer with dependency arcs (`nsubj`, `obj`, `obl`, `root`, etc.) and morphological token inspection.
11. **Korpus (Corpus)**: Corpus statistics, Zipf's law log-log frequency chart, Type-Token Ratio (TTR), Hapax legomena, and KWIC (Key Word In Context) concordancer for BOUN and Brown corpora.
12. **N-gram**: Statistical language modeling (Unigram, Bigram, Trigram) with Laplace smoothing, linear interpolation, perplexity calculation, and temperature-controlled text generation.
13. **Ders (Course Companion)**: COMP 451 Lectures 1–5 slides, live interactive example chips, and self-test quizzes.

## Getting Started

```bash
npm install
npm run dev
```

App will listen on `http://0.0.0.0:3000`.

## Building for Production

```bash
npm run build
npm start
```
