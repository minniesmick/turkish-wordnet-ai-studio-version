import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { loadCorpus } from "../lib/corpusdata";
import {
  split,
  train,
  evaluate,
  analyze,
  sentTags,
  tagOf,
  uposOf,
  featsOf,
  lc,
} from "../lib/md";
import { tr, esc } from "../lib/core";

const UPOS_TR: Record<string, string> = {
  NOUN: "isim",
  VERB: "fiil",
  PUNCT: "noktalama",
  ADJ: "sıfat",
  PROPN: "özel ad",
  DET: "belirleyici",
  ADV: "zarf",
  CCONJ: "bağlaç",
  PRON: "zamir",
  NUM: "sayı",
  ADP: "ilgeç",
  AUX: "yardımcı fiil",
  PART: "parçacık",
  SCONJ: "yan cümle bağlacı",
  INTJ: "ünlem",
};

export const DisambView: React.FC = () => {
  const [corpusData, setCorpusData] = useState<any>(null);
  const [models, setModels] = useState<any>(null);
  const [evalResult, setEvalResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [testSentIndex, setTestSentIndex] = useState(0);
  const [customText, setCustomText] = useState("Gözleri yaşlı bir adam bana baktı.");
  const [mode, setMode] = useState<"corpus" | "custom">("corpus");
  const [granularity, setGranularity] = useState<"tag" | "upos">("tag");

  useEffect(() => {
    let active = true;
    loadCorpus("boun")
      .then((c) => {
        if (!active) return;
        setCorpusData(c);
        const sp = split(c.sents);
        const m = train(sp.train);
        const r = evaluate(m, sp.test);
        setModels(m);
        setEvalResult(r);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const curSent =
    corpusData && corpusData.sents && corpusData.sents[testSentIndex];

  // Evaluate current sentence
  const predictSentence = (tokens: string[]) => {
    if (!models) return [];
    const predBase: string[] = [];
    const predDl: string[] = [];
    const predAp: string[] = [];

    // Analyze candidates
    const candsList = tokens.map((w, i) => analyze(models.lex, tokens, i));

    // Base prediction
    candsList.forEach((c) => predBase.push(c[0]?.tag || "NOUN _"));

    // Predict with Decision List
    let prev = "<S>";
    tokens.forEach((w, i) => {
      const best = models.dl.predict(models.lex, tokens, i, prev, candsList[i]);
      predDl.push(best);
      prev = best;
    });

    // Predict with Perceptron
    let p1 = "<S>",
      p2 = "<S>";
    tokens.forEach((w, i) => {
      const best = models.ap.predict(models.lex, tokens, i, p1, p2, candsList[i]);
      predAp.push(best);
      p2 = p1;
      p1 = best;
    });

    return tokens.map((w, i) => ({
      word: w,
      cands: candsList[i],
      base: predBase[i],
      dl: predDl[i],
      ap: predAp[i],
    }));
  };

  const sentencePredictions = curSent ? predictSentence(curSent.f) : [];

  return (
    <div className="page">
      <h1 className="page-title">Morfolojik Belirsizlik Giderme</h1>
      <p className="lesson-intro">
        Bir sözcüğün birden çok morfolojik çözümlemesi varken (örn. <i>koyun</i> =
        isim / fiil, <i>bir</i> = sayı / belirteç), cümlenin bağlamına bakarak doğru
        olanı seçme problemi (Lecture 2).
      </p>

      {/* Model accuracy cards */}
      {loading ? (
        <div
          className="skeleton"
          style={{ height: "120px", margin: "20px 0" }}
        />
      ) : evalResult ? (
        <div className="ng-stats" style={{ margin: "20px 0" }}>
          <div>
            <b>{(evalResult.base.tag * 100).toFixed(1)}%</b>
            <span>Taban Çizgisi (En Sık Etiket)</span>
          </div>
          <div>
            <b>{(evalResult.dl.tag * 100).toFixed(1)}%</b>
            <span>Karar Listesi (Decision List)</span>
          </div>
          <div>
            <b>{(evalResult.ap.tag * 100).toFixed(1)}%</b>
            <span>Ortalama Perceptron (Averaged Perceptron)</span>
          </div>
        </div>
      ) : null}

      <div className="row" style={{ marginTop: "16px" }}>
        <div className="seg">
          <button
            aria-pressed={mode === "corpus"}
            onClick={() => setMode("corpus")}
          >
            BOUN Test Kümesi
          </button>
          <button
            aria-pressed={mode === "custom"}
            onClick={() => setMode("custom")}
          >
            Kendi Cümlen
          </button>
        </div>

        {mode === "corpus" && corpusData && (
          <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
            <button
              className="btn sm"
              onClick={() =>
                setTestSentIndex((i) => Math.max(0, i - 1))
              }
              disabled={testSentIndex <= 0}
            >
              Önceki Cümle
            </button>
            <span
              className="muted"
              style={{ alignSelf: "center", fontSize: ".85rem" }}
            >
              {testSentIndex + 1} / {corpusData.sents.length}
            </span>
            <button
              className="btn sm"
              onClick={() =>
                setTestSentIndex((i) =>
                  Math.min(corpusData.sents.length - 1, i + 1)
                )
              }
              disabled={testSentIndex >= corpusData.sents.length - 1}
            >
              Sonraki Cümle
            </button>
          </div>
        )}
      </div>

      {mode === "custom" && (
        <div style={{ marginTop: "16px" }}>
          <label className="field">
            <input
              type="text"
              placeholder="Bir Türkçe cümle yaz…"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
            />
          </label>
        </div>
      )}

      {/* Tokens Table */}
      <div style={{ marginTop: "24px" }}>
        {curSent && (
          <div
            className="card-e"
            style={{
              padding: "16px 20px",
              background: "var(--page)",
              marginBottom: "16px",
              fontSize: "1.2rem",
            }}
          >
            <b>Cümle:</b> {curSent.f.join(" ")}
          </div>
        )}

        <div
          className="ck-scroll"
          role="region"
          tabIndex={0}
          aria-label="Belirsizlik giderme tablosu"
        >
          <table className="ng-tbl">
            <thead>
              <tr>
                <th>Sözcük</th>
                <th>Doğru (Gold)</th>
                <th>Taban Çizgisi</th>
                <th>Karar Listesi</th>
                <th>Perceptron</th>
                <th>Adaylar</th>
              </tr>
            </thead>
            <tbody>
              {sentencePredictions.map((row, i) => {
                const gold = curSent ? tagOf(curSent.p[i], curSent.x?.[i]) : null;
                const isBaseOk = gold ? row.base === gold : true;
                const isDlOk = gold ? row.dl === gold : true;
                const isApOk = gold ? row.ap === gold : true;

                return (
                  <tr key={i}>
                    <td>
                      <b style={{ fontSize: "1.05rem" }}>{row.word}</b>
                    </td>
                    <td>
                      {gold ? (
                        <span className="tag">
                          <b>{uposOf(gold)}</b> ({UPOS_TR[uposOf(gold)] || ""})
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <span className={`tag ${isBaseOk ? "ok" : "bad"}`}>
                        {uposOf(row.base)}
                      </span>
                    </td>
                    <td>
                      <span className={`tag ${isDlOk ? "ok" : "bad"}`}>
                        {uposOf(row.dl)}
                      </span>
                    </td>
                    <td>
                      <span className={`tag ${isApOk ? "ok" : "bad"}`}>
                        {uposOf(row.ap)}
                      </span>
                    </td>
                    <td>
                      <small className="muted">
                        {row.cands.length} aday:{" "}
                        {row.cands.slice(0, 3).map((c: any) => uposOf(c.tag)).join(", ")}
                      </small>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
