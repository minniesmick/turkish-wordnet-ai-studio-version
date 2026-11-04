import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import {
  api,
  esc,
  tr,
} from "../lib/core";
import {
  SUF,
  CURATED,
  generate,
  analyze,
  nextOptions,
  stateName,
} from "../lib/turkish";
import { trace, stepStates, STATE_NAME, POOL } from "../lib/fsm";

export const MorphView: React.FC = () => {
  const { state } = useApp();

  const [tab, setTab] = useState<"analyze" | "generate" | "quiz">("analyze");
  const [word, setWord] = useState("okullarım");
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);
  const [udResults, setUdResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Generator state
  const [stem, setStem] = useState("okul");
  const [pos, setPos] = useState<"N" | "V">("N");
  const [selectedSufIds, setSelectedSufIds] = useState<string[]>([]);
  const [genSurface, setGenSurface] = useState("");
  const [genTrace, setGenTrace] = useState<any[]>([]);

  // Quiz state
  const [quizWord, setQuizWord] = useState("uyu+Verb+Prog1+A3sg+Cop");
  const [userPath, setUserPath] = useState("");
  const [quizFeedback, setQuizFeedback] = useState<any>(null);

  useEffect(() => {
    runAnalyze(word);
  }, [word]);

  const runAnalyze = async (w = word) => {
    const trimmed = w.toLocaleLowerCase("tr").trim();
    if (!trimmed) {
      setAnalysisResults([]);
      setUdResults([]);
      return;
    }
    setLoading(true);

    try {
      const res = analyze(trimmed, CURATED);
      setAnalysisResults(res);

      const ud = await api("/api/ud", { w: trimmed });
      setUdResults(ud.results || []);
    } catch (_) {
      setAnalysisResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Recompute generation
    try {
      const res = generate({ w: stem, pos }, selectedSufIds);
      setGenSurface(res.surface);
      setGenTrace(res.trace || []);
    } catch (_) {}
  }, [stem, pos, selectedSufIds]);

  const handleQuizCheck = () => {
    const t = trace(quizWord);
    if (!t.ok) {
      setQuizFeedback({ ok: false, msg: t.reason });
      return;
    }
    const targetStates = stepStates(t).join(" ");
    const userClean = userPath.trim().replace(/,/g, " ").replace(/\s+/g, " ");
    if (userClean === targetStates) {
      setQuizFeedback({ ok: true, msg: "Tebrikler! FSM yolu doğru." });
    } else {
      setQuizFeedback({
        ok: false,
        msg: `Yanlış yol. Beklenen yol: ${targetStates}`,
      });
    }
  };

  const handleQuizNew = () => {
    const picked = POOL[Math.floor(Math.random() * POOL.length)];
    setQuizWord(picked);
    setUserPath("");
    setQuizFeedback(null);
  };

  const availableNextSufs = nextOptions({ w: stem, pos }, selectedSufIds);

  return (
    <div className="page">
      <h1 className="page-title">Türkçe Morfoloji & FSM</h1>

      <div className="row">
        <div className="seg">
          <button
            aria-pressed={tab === "analyze"}
            onClick={() => setTab("analyze")}
          >
            Çözümleme
          </button>
          <button
            aria-pressed={tab === "generate"}
            onClick={() => setTab("generate")}
          >
            Sözcük Üretimi
          </button>
          <button
            aria-pressed={tab === "quiz"}
            className="stu"
            onClick={() => setTab("quiz")}
          >
            FSM Alıştırması
          </button>
        </div>
      </div>

      {/* ANALYZE TAB */}
      {tab === "analyze" && (
        <div style={{ marginTop: "20px" }}>
          <div className="row">
            <label className="field" style={{ flex: 1 }}>
              <input
                type="text"
                placeholder="Bir sözcük yaz… (örn. okullarım, kitapçılar, başladık)"
                value={word}
                onChange={(e) => setWord(e.target.value)}
              />
            </label>
          </div>

          <div className="chips" style={{ marginTop: "10px" }}>
            {["okullarım", "kitapçılar", "başladık", "evlerimizden", "gözlükçü"].map(
              (w) => (
                <button key={w} className="chip" onClick={() => setWord(w)}>
                  {w}
                </button>
              )
            )}
          </div>

          {loading ? (
            <div
              className="skeleton"
              style={{ height: "100px", marginTop: "20px" }}
            />
          ) : (
            <div style={{ marginTop: "24px" }}>
              {analysisResults.length === 0 ? (
                <div className="empty">
                  <b>{word}</b> kural motorunda çözümlenemedi.
                </div>
              ) : (
                analysisResults.map((a, i) => (
                  <article key={i} className="mp-card" style={{ margin: "16px 0" }}>
                    <div className="mp-lex">{a.lex}</div>

                    <div className="mp-segs">
                      {a.segs.map((s: any, idx: number) => (
                        <React.Fragment key={idx}>
                          {idx > 0 && <i>+</i>}
                          <span className={`mp-seg ${idx === 0 ? "root" : ""}`}>
                            <b>{s.text}</b>
                            <small>{s.name || s.id}</small>
                          </span>
                        </React.Fragment>
                      ))}
                    </div>

                    <p className="mp-meta" style={{ marginTop: "10px" }}>
                      kök: <b>{a.stem.w}</b> ({a.stem.pos}) · ekler:{" "}
                      {a.ids?.map((id: string) => (
                        <span key={id} className="tag" style={{ marginRight: "4px" }}>
                          {SUF[id]?.name || id}
                        </span>
                      ))}
                    </p>

                    {/* Rule trace */}
                    {a.trace && (
                      <div className="stu mp-trace" style={{ marginTop: "14px" }}>
                        <h4>Kural İzi (Morfofonemik)</h4>
                        <ol>
                          {a.trace.map((t: any, ti: number) => (
                            <li key={ti}>
                              <b>{t.id === "STEM" ? t.out : "+" + (t.tmpl || "")}</b>
                              {t.id !== "STEM" && (
                                <> → <span className="ng-t">{t.out}</span></>
                              )}
                              {t.notes && t.notes.length > 0 && (
                                <span className="muted">
                                  {" "}· {t.notes.join(" · ")}
                                </span>
                              )}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </article>
                ))
              )}

              {/* BOUN treebank real usages */}
              {udResults.length > 0 && (
                <div style={{ marginTop: "28px" }}>
                  <h3 className="ng-h3">
                    BOUN Treebank İstatistikleri (Gerçek Kullanım)
                  </h3>
                  <div
                    className="ck-scroll"
                    role="region"
                    tabIndex={0}
                    aria-label="BOUN çözümlemeleri tablosu"
                  >
                    <table className="ng-tbl">
                      <thead>
                        <tr>
                          <th>Lemma</th>
                          <th>UPOS</th>
                          <th>Özellikler (FEATS)</th>
                          <th>Sıklık</th>
                        </tr>
                      </thead>
                      <tbody>
                        {udResults.map((r, ri) => (
                          <tr key={ri}>
                            <td>
                              <b>{r.lemma}</b>
                            </td>
                            <td>{r.upos}</td>
                            <td className="muted" style={{ fontSize: ".85rem" }}>
                              {r.feats}
                            </td>
                            <td>{r.n}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* GENERATE TAB */}
      {tab === "generate" && (
        <div style={{ marginTop: "20px" }}>
          <div className="row">
            <label className="field" style={{ width: "200px" }}>
              <input
                type="text"
                placeholder="Kök sözcük"
                value={stem}
                onChange={(e) => setStem(e.target.value)}
              />
            </label>
            <div className="seg">
              <button
                aria-pressed={pos === "N"}
                onClick={() => {
                  setPos("N");
                  setSelectedSufIds([]);
                }}
              >
                İsim
              </button>
              <button
                aria-pressed={pos === "V"}
                onClick={() => {
                  setPos("V");
                  setSelectedSufIds([]);
                }}
              >
                Fiil
              </button>
            </div>
          </div>

          <div
            className="card-e"
            style={{
              padding: "20px",
              margin: "20px 0",
              background: "var(--page)",
            }}
          >
            <span className="lbl">Üretilen Sözcük:</span>
            <div
              style={{
                fontSize: "2rem",
                fontWeight: 800,
                color: "var(--spot)",
                marginTop: "6px",
              }}
            >
              {genSurface || stem}
            </div>

            <div className="chips" style={{ marginTop: "12px" }}>
              <span className="tag">kök: {stem}</span>
              {selectedSufIds.map((id, idx) => (
                <span key={idx} className="tag" style={{ background: "var(--wash)" }}>
                  +{SUF[id]?.name || id}
                  <button
                    style={{
                      border: 0,
                      background: "none",
                      marginLeft: "6px",
                      cursor: "pointer",
                    }}
                    onClick={() =>
                      setSelectedSufIds(selectedSufIds.slice(0, idx))
                    }
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="lbl">Eklenebilecek Sonraki Ekler:</h4>
            <div className="chips" style={{ marginTop: "10px" }}>
              {availableNextSufs.map((id) => (
                <button
                  key={id}
                  className="chip"
                  onClick={() => setSelectedSufIds([...selectedSufIds, id])}
                >
                  +{SUF[id]?.name || id}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* QUIZ TAB */}
      {tab === "quiz" && (
        <div style={{ marginTop: "20px" }}>
          <p className="lesson-intro">
            Verilen morfolojik çözümlemenin Oflazer durum makinesindeki durum
            numaralarını boşlukla ayırarak yazın (örn. 2 3 4 5).
          </p>

          <div
            className="card-e"
            style={{ padding: "20px", margin: "16px 0", background: "var(--page)" }}
          >
            <div className="entry-head">
              <span className="lbl">Hedef Çözümleme:</span>
              <button className="btn sm" style={{ marginLeft: "auto" }} onClick={handleQuizNew}>
                Yeni Soru
              </button>
            </div>

            <h3 style={{ fontSize: "1.4rem", margin: "10px 0" }}>
              <code>{quizWord}</code>
            </h3>

            <div className="row" style={{ marginTop: "16px" }}>
              <label className="field" style={{ flex: 1 }}>
                <input
                  type="text"
                  placeholder="Durum numaraları (örn. 2 3 4 6)"
                  value={userPath}
                  onChange={(e) => setUserPath(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleQuizCheck()}
                />
              </label>
              <button className="btn pri" onClick={handleQuizCheck}>
                Kontrol Et
              </button>
            </div>

            {quizFeedback && (
              <div
                className={`notice ${quizFeedback.ok ? "ok" : "warn"}`}
                style={{ marginTop: "16px" }}
              >
                {quizFeedback.msg}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
