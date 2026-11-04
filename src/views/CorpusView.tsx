import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { CORPORA, loadCorpus, tokensOf, CorpusData } from "../lib/corpusdata";
import { tr, esc } from "../lib/core";
import { Icon } from "../lib/icons";

export const CorpusView: React.FC = () => {
  const [corpusName, setCorpusName] = useState<"boun" | "brown">("boun");
  const [corpusData, setCorpusData] = useState<CorpusData | null>(null);
  const [unit, setUnit] = useState<"form" | "lemma">("form");
  const [lowerCase, setLowerCase] = useState(true);
  const [punct, setPunct] = useState(false);
  const [ngramOrder, setNgramOrder] = useState<1 | 2 | 3>(1);
  const [selectedUpos, setSelectedUpos] = useState("");
  const [kwicWord, setKwicWord] = useState("");
  const [kwicWindow, setKwicWindow] = useState(5);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);

    loadCorpus(corpusName, 5000)
      .then((c) => {
        if (!active) return;
        setCorpusData(c);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [corpusName]);

  // Compute stats
  const tokens = corpusData
    ? tokensOf(corpusData, {
        lemma: unit === "lemma" && corpusName === "boun",
        lower: lowerCase,
        punct,
        upos: selectedUpos,
      })
    : [];

  const allWords = tokens.flat();
  const N = allWords.length;

  const freqMap = new Map<string, number>();
  if (ngramOrder === 1) {
    allWords.forEach((w) => freqMap.set(w, (freqMap.get(w) || 0) + 1));
  } else {
    tokens.forEach((s) => {
      for (let i = 0; i + ngramOrder <= s.length; i++) {
        const gram = s.slice(i, i + ngramOrder).join(" ");
        freqMap.set(gram, (freqMap.get(gram) || 0) + 1);
      }
    });
  }

  const sortedFreq = Array.from(freqMap.entries()).sort((a, b) => b[1] - a[1]);
  const V = freqMap.size;
  const hapax = sortedFreq.filter(([, c]) => c === 1).length;
  const ttr = N > 0 ? (V / N).toFixed(4) : "0";
  const avgSentLen = tokens.length > 0 ? (N / tokens.length).toFixed(1) : "0";

  // UPOS counts
  const uposCounts = new Map<string, number>();
  if (corpusData?.name === "boun") {
    corpusData.sents.forEach((s) => {
      s.p?.forEach((p) => {
        if (p) uposCounts.set(p, (uposCounts.get(p) || 0) + 1);
      });
    });
  }

  // KWIC lines
  const kwicLines: { left: string; target: string; right: string }[] = [];
  if (kwicWord.trim()) {
    const kw = kwicWord.trim().toLowerCase();
    tokens.forEach((s) => {
      s.forEach((w, idx) => {
        if (w.toLowerCase() === kw) {
          const l = s.slice(Math.max(0, idx - kwicWindow), idx).join(" ");
          const r = s.slice(idx + 1, idx + 1 + kwicWindow).join(" ");
          if (kwicLines.length < 50) {
            kwicLines.push({ left: l, target: w, right: r });
          }
        }
      });
    });
  }

  return (
    <div className="page">
      <h1 className="page-title">Korpus İstatistikleri & Zipf Yasası</h1>
      <p className="lesson-intro">
        Doğal dil işleme ve korpus dilbilimi (Lecture 5): Sıklık dağılımı, Type-Token Oranı (TTR), Hapax legomena ve KWIC dizinleyici.
      </p>

      {/* Corpus selector */}
      <div className="row" style={{ marginTop: "16px" }}>
        <div className="seg">
          <button
            aria-pressed={corpusName === "boun"}
            onClick={() => {
              setCorpusName("boun");
              setSelectedUpos("");
            }}
          >
            BOUN (Türkçe UD Test)
          </button>
          <button
            aria-pressed={corpusName === "brown"}
            onClick={() => {
              setCorpusName("brown");
              setSelectedUpos("");
            }}
          >
            Brown (İngilizce SemCor)
          </button>
        </div>

        <div className="seg" style={{ marginLeft: "12px" }}>
          <button
            aria-pressed={ngramOrder === 1}
            onClick={() => setNgramOrder(1)}
          >
            1-gram (Kelime)
          </button>
          <button
            aria-pressed={ngramOrder === 2}
            onClick={() => setNgramOrder(2)}
          >
            2-gram (Bigram)
          </button>
          <button
            aria-pressed={ngramOrder === 3}
            onClick={() => setNgramOrder(3)}
          >
            3-gram (Trigram)
          </button>
        </div>
      </div>

      {/* UPOS chips for BOUN */}
      {corpusName === "boun" && uposCounts.size > 0 && (
        <div className="chips" style={{ marginTop: "14px" }}>
          <span className="muted" style={{ alignSelf: "center", fontSize: ".85rem" }}>
            UPOS Filtresi:
          </span>
          <button
            className="chip"
            aria-pressed={!selectedUpos}
            onClick={() => setSelectedUpos("")}
          >
            Tümü
          </button>
          {Array.from(uposCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([p, cnt]) => (
              <button
                key={p}
                className="chip"
                aria-pressed={selectedUpos === p}
                onClick={() => setSelectedUpos(selectedUpos === p ? "" : p)}
              >
                {p} <small>{tr(cnt)}</small>
              </button>
            ))}
        </div>
      )}

      {/* Summary stats */}
      {loading ? (
        <div className="skeleton" style={{ height: "90px", margin: "20px 0" }} />
      ) : (
        <div className="ng-stats" style={{ margin: "20px 0" }}>
          <div>
            <b>{tr(tokens.length)}</b>
            <span>cümle</span>
          </div>
          <div>
            <b>{tr(N)}</b>
            <span>sözcük (token)</span>
          </div>
          <div>
            <b>{tr(V)}</b>
            <span>farklı sözcük (type)</span>
          </div>
          <div>
            <b>{ttr}</b>
            <span>TTR (Type/Token Oranı)</span>
          </div>
          <div>
            <b>{tr(hapax)}</b>
            <span>tek geçen (%{V > 0 ? ((100 * hapax) / V).toFixed(0) : 0})</span>
          </div>
          <div>
            <b>{avgSentLen}</b>
            <span>cümle başı sözcük</span>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Frequency Table */}
        <div>
          <h3 className="lbl">En Sık Geçen {ngramOrder}-gramlar:</h3>
          <div
            className="ck-scroll"
            role="region"
            tabIndex={0}
            style={{ maxHeight: "400px", overflowY: "auto" }}
          >
            <table className="ng-tbl">
              <thead>
                <tr>
                  <th>Sıra</th>
                  <th>Birim</th>
                  <th>Frekans</th>
                  <th>Oran</th>
                </tr>
              </thead>
              <tbody>
                {sortedFreq.slice(0, 30).map(([w, cnt], i) => (
                  <tr key={w}>
                    <td>{i + 1}</td>
                    <td>
                      <b
                        style={{ cursor: "pointer", color: "var(--spot)" }}
                        onClick={() => setKwicWord(w)}
                        title="KWIC'te ara"
                      >
                        {w}
                      </b>
                    </td>
                    <td>{tr(cnt)}</td>
                    <td>{N > 0 ? ((100 * cnt) / N).toFixed(2) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Zipf Law Chart */}
        <div>
          <h3 className="lbl">Zipf Yasası Grafiği (Log Frekans vs Log Sıra):</h3>
          <div
            className="card-e"
            style={{ padding: "16px", background: "var(--page)", height: "400px" }}
          >
            <svg width="100%" height="100%" viewBox="0 0 360 300">
              {/* Axes */}
              <line x1="40" y1="20" x2="40" y2="260" stroke="var(--rule-2)" />
              <line x1="40" y1="260" x2="340" y2="260" stroke="var(--rule-2)" />
              <text x="30" y="25" textAnchor="end" fontSize="10" fill="var(--ink-3)">
                log f
              </text>
              <text x="340" y="275" textAnchor="end" fontSize="10" fill="var(--ink-3)">
                log r
              </text>

              {/* Data curve */}
              {sortedFreq.length > 0 && (() => {
                const maxF = Math.log(sortedFreq[0][1] + 1);
                const maxR = Math.log(Math.min(500, sortedFreq.length) + 1);

                const points = sortedFreq
                  .slice(0, 300)
                  .map(([_, f], r) => {
                    const logR = Math.log(r + 1);
                    const logF = Math.log(f + 1);
                    const x = 40 + (logR / maxR) * 280;
                    const y = 260 - (logF / maxF) * 230;
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(" ");

                return (
                  <>
                    <polyline
                      fill="none"
                      stroke="var(--spot)"
                      strokeWidth="2.2"
                      points={points}
                    />
                    {/* Theoretical Zipf line (slope = -1) */}
                    <line
                      x1="40"
                      y1="30"
                      x2="320"
                      y2="260"
                      stroke="var(--rule-2)"
                      strokeDasharray="4,4"
                      strokeWidth="1.5"
                    />
                  </>
                );
              })()}
            </svg>
          </div>
        </div>
      </div>

      {/* KWIC Concordancer */}
      <div style={{ marginTop: "34px" }}>
        <h3 className="lbl">KWIC (Key Word In Context) Dizinleyici:</h3>
        <div className="row" style={{ marginTop: "10px" }}>
          <label className="field" style={{ flex: 1 }}>
            <Icon name="search" />
            <input
              type="text"
              placeholder="Bağlamını görmek istediğin sözcük…"
              value={kwicWord}
              onChange={(e) => setKwicWord(e.target.value)}
            />
          </label>
          <label className="chk">
            Pencere:
            <input
              type="number"
              min={2}
              max={15}
              value={kwicWindow}
              onChange={(e) => setKwicWindow(+e.target.value)}
              style={{ width: "50px", marginLeft: "6px" }}
            />
          </label>
        </div>

        {kwicLines.length > 0 && (
          <div
            className="ck-scroll"
            role="region"
            tabIndex={0}
            style={{ marginTop: "14px", background: "var(--page)", padding: "16px", borderRadius: "var(--r)" }}
          >
            {kwicLines.map((row, idx) => (
              <div
                key={idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto 1fr",
                  gap: "12px",
                  padding: "4px 0",
                  fontFamily: "var(--font-mono)",
                  fontSize: ".9rem",
                }}
              >
                <div style={{ textAlign: "right", color: "var(--ink-2)" }}>{row.left}</div>
                <div>
                  <b style={{ color: "var(--spot)", background: "var(--wash)", padding: "1px 6px", borderRadius: "3px" }}>
                    {row.target}
                  </b>
                </div>
                <div style={{ color: "var(--ink-2)" }}>{row.right}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
