import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { loadCorpus, tokensOf } from "../lib/corpusdata";
import { buildModel, sample, perplexity } from "../lib/lm";
import { tr } from "../lib/core";

export const NgramView: React.FC = () => {
  const [corpusName, setCorpusName] = useState<"boun" | "brown">("boun");
  const [order, setOrder] = useState<1 | 2 | 3>(2);
  const [smoothing, setSmoothing] = useState<"none" | "laplace" | "interp">("laplace");
  const [model, setModel] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Perplexity evaluator
  const [testSent, setTestSent] = useState(
    "bu güzel günün ardından eve döndük"
  );
  const [ppResult, setPpResult] = useState<any>(null);

  // Generator
  const [generatedText, setGeneratedText] = useState("");
  const [genTemp, setGenTemp] = useState(0.8);
  const [genMaxLen, setGenMaxLen] = useState(15);

  useEffect(() => {
    let active = true;
    setLoading(true);

    loadCorpus(corpusName, 5000)
      .then((c) => {
        if (!active) return;
        const sents = tokensOf(c, { lower: true, punct: false });
        const m = buildModel(sents, order, { unk: 1, eos: true });
        setModel(m);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [corpusName, order]);

  useEffect(() => {
    if (!model || !testSent.trim()) return;
    try {
      const toks = testSent.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const res = perplexity(model, toks, { smooth: smoothing });
      setPpResult(res);
    } catch (_) {
      setPpResult(null);
    }
  }, [model, testSent, smoothing]);

  const handleGenerate = () => {
    if (!model) return;
    try {
      const s = sample(model, {
        temp: genTemp,
        max: genMaxLen,
        smooth: smoothing,
      });
      setGeneratedText(s.join(" "));
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">N-gram Dil Modelleri & Perplexity</h1>
      <p className="lesson-intro">
        İstatistiksel dil modelleme (Lecture 5): N-gram sayımları, Laplace yumuşatma, interpolasyon, perplexity ölçümü ve metin üretimi.
      </p>

      {/* Model configuration */}
      <div className="row" style={{ marginTop: "16px" }}>
        <div className="seg">
          <button
            aria-pressed={corpusName === "boun"}
            onClick={() => setCorpusName("boun")}
          >
            BOUN (Türkçe)
          </button>
          <button
            aria-pressed={corpusName === "brown"}
            onClick={() => setCorpusName("brown")}
          >
            Brown (İngilizce)
          </button>
        </div>

        <div className="seg" style={{ marginLeft: "12px" }}>
          <button aria-pressed={order === 1} onClick={() => setOrder(1)}>
            Unigram
          </button>
          <button aria-pressed={order === 2} onClick={() => setOrder(2)}>
            Bigram
          </button>
          <button aria-pressed={order === 3} onClick={() => setOrder(3)}>
            Trigram
          </button>
        </div>

        <div className="seg" style={{ marginLeft: "12px" }}>
          <button
            aria-pressed={smoothing === "none"}
            onClick={() => setSmoothing("none")}
          >
            MLE (Düz)
          </button>
          <button
            aria-pressed={smoothing === "laplace"}
            onClick={() => setSmoothing("laplace")}
          >
            Laplace (+1)
          </button>
          <button
            aria-pressed={smoothing === "interp"}
            onClick={() => setSmoothing("interp")}
          >
            İnterpolasyon
          </button>
        </div>
      </div>

      {loading ? (
        <div
          className="skeleton"
          style={{ height: "100px", margin: "20px 0" }}
        />
      ) : model ? (
        <div className="ng-stats" style={{ margin: "20px 0" }}>
          <div>
            <b>{tr(model.S)}</b>
            <span>eğitim cümlesi</span>
          </div>
          <div>
            <b>{tr(model.N)}</b>
            <span>toplam token</span>
          </div>
          <div>
            <b>{tr(model.V)}</b>
            <span>sözlük boyutu (V)</span>
          </div>
          <div>
            <b>{order}-gram</b>
            <span>model mertebesi</span>
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Perplexity Calculator */}
        <div className="card-e" style={{ padding: "20px", background: "var(--page)" }}>
          <h3 className="lbl">Perplexity Hesaplayıcı:</h3>
          <p className="lesson-intro" style={{ margin: "4px 0 12px" }}>
            Model test cümlesine ne kadar şaşırıyor? Düşük perplexity = daha iyi tahmin.
          </p>

          <label className="field" style={{ width: "100%" }}>
            <input
              type="text"
              placeholder="Test cümlesi yaz…"
              value={testSent}
              onChange={(e) => setTestSent(e.target.value)}
            />
          </label>

          <div className="chips" style={{ marginTop: "10px" }}>
            {[
              "bu güzel günün ardından eve döndük",
              "çocuk bahçede oyun oynuyor",
              "the quick brown fox jumps",
            ].map((s) => (
              <button key={s} className="chip" onClick={() => setTestSent(s)}>
                {s}
              </button>
            ))}
          </div>

          {ppResult && (
            <div style={{ marginTop: "20px" }}>
              <div className="ng-stats">
                <div>
                  <b style={{ color: "var(--spot)" }}>
                    {ppResult.pp === Infinity
                      ? "∞"
                      : ppResult.pp.toFixed(2)}
                  </b>
                  <span>Perplexity (PP)</span>
                </div>
                <div>
                  <b>{ppResult.logp?.toFixed(2)}</b>
                  <span>Log-olabilirlik (log P)</span>
                </div>
                <div>
                  <b>{ppResult.n}</b>
                  <span>token sayısı</span>
                </div>
              </div>

              {ppResult.steps && (
                <div
                  className="ck-scroll"
                  role="region"
                  tabIndex={0}
                  style={{ maxHeight: "200px", overflowY: "auto", marginTop: "14px" }}
                >
                  <table className="ng-tbl">
                    <thead>
                      <tr>
                        <th>Token</th>
                        <th>Bağlam</th>
                        <th>Olasılık P</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ppResult.steps.map((st: any, idx: number) => (
                        <tr key={idx}>
                          <td>
                            <b>{st.w}</b>
                          </td>
                          <td className="muted">{st.hist?.join(" ") || "<s>"}</td>
                          <td>
                            {st.p > 0 ? (
                              <span>{(st.p * 100).toFixed(2)}%</span>
                            ) : (
                              <span style={{ color: "var(--bad)" }}>0 (Sıfır olasılık)</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Text Generator */}
        <div className="card-e" style={{ padding: "20px", background: "var(--page)" }}>
          <h3 className="lbl">N-gram ile Rastgele Cümle Üret:</h3>
          <p className="lesson-intro" style={{ margin: "4px 0 12px" }}>
            Modelin öğrendiği geçiş olasılıklarına göre sıradaki sözcüğü örnekler.
          </p>

          <div className="row" style={{ alignItems: "center" }}>
            <label className="chk">
              Sıcaklık (Temp):
              <input
                type="number"
                step={0.1}
                min={0.1}
                max={2.0}
                value={genTemp}
                onChange={(e) => setGenTemp(+e.target.value)}
                style={{ width: "56px", marginLeft: "6px" }}
              />
            </label>
            <label className="chk">
              Maks Uzunluk:
              <input
                type="number"
                min={5}
                max={40}
                value={genMaxLen}
                onChange={(e) => setGenMaxLen(+e.target.value)}
                style={{ width: "56px", marginLeft: "6px" }}
              />
            </label>
            <button className="btn pri" onClick={handleGenerate}>
              Üret
            </button>
          </div>

          <div
            style={{
              marginTop: "20px",
              padding: "16px",
              background: "var(--sunk)",
              borderRadius: "var(--r)",
              minHeight: "100px",
              fontSize: "1.15rem",
              lineHeight: "1.7",
              fontStyle: generatedText ? "normal" : "italic",
              color: generatedText ? "var(--ink)" : "var(--ink-3)",
            }}
          >
            {generatedText || "Henüz cümle üretilmedi. “Üret” düğmesine basın."}
          </div>
        </div>
      </div>
    </div>
  );
};
