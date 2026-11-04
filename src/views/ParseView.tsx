import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { parseTrees, learn, toGrammar } from "../lib/mle";
import { topDown, shiftReduce } from "../lib/parsers";

const PRESETS: Record<string, { label: string; sent: string; grammar: string }> = {
  inclass2: {
    label: "InClass 2 · PCFG",
    sent: "Alice said the scientist that believed the student proved the experiment",
    grammar: `S -> NP VP [0.6] | S Conj S [0.15] | Adv S [0.25]
NP -> Det N [0.25] | Det Adj N [0.15] | NP RC [0.20] | ProperN [0.20] | NP PP [0.20]
VP -> V NP [0.4] | V S [0.35] | V [0.2] | Adv VP [0.05]
RC -> Rel VP [1.0]
V -> said [0.3] | believed [0.4] | proved [0.3]
N -> scientist [0.4] | student [0.3] | experiment [0.3]
Det -> the [0.6] | a [0.4]
Adj -> young [0.6] | curious [0.4]
Adv -> quietly [0.5] | sincerely [0.5]
Conj -> and [0.6] | but [0.4]
ProperN -> Alice [1.0]
Rel -> that [1.0]`,
  },
  inclass3: {
    label: "InClass 3 · CKY",
    sent: "the open position may require quick response time",
    grammar: `S -> NP VP | VP NP
NP -> D NP | N | ADJ NP | ADJ N
VP -> V NP | V N | N V | V ADV | AUX VP | AUX V
N -> quick | position | open | time | response
V -> help | position | open | time | require
D -> the | a | some
ADJ -> good | quick | open
ADV -> fast | quick
AUX -> may | can`,
  },
  pp: {
    label: "Örnek · PP bağlanması",
    sent: "kids saw birds with binoculars",
    grammar: `S -> NP VP
NP -> N | NP PP
VP -> V NP | VP PP
PP -> P NP
N -> kids | birds | binoculars | fish
V -> saw
P -> with`,
  },
};

export const ParseView: React.FC = () => {
  const [preset, setPreset] = useState("inclass2");
  const [grammarText, setGrammarText] = useState(PRESETS.inclass2.grammar);
  const [sentence, setSentence] = useState(PRESETS.inclass2.sent);
  const [activeTab, setActiveTab] = useState<"chart" | "trees" | "steps" | "mle">("chart");

  // CKY chart state
  const [chart, setChart] = useState<any[][]>([]);
  const [words, setWords] = useState<string[]>([]);
  const [trees, setTrees] = useState<any[]>([]);
  const [parseError, setParseError] = useState("");

  // Step parser
  const [stepMethod, setStepMethod] = useState<"td" | "sr">("sr");
  const [stepHistory, setStepHistory] = useState<any[]>([]);

  // MLE state
  const [treebankText, setTreebankText] = useState(
    `(S (NP (Det the) (N dog)) (VP (V barks)))\n(S (NP (Det the) (N cat)) (VP (V saw) (NP (Det the) (N dog))))`
  );

  const parseGrammarRules = (text: string) => {
    const rules: any[] = [];
    text.split("\n").forEach((line) => {
      const clean = line.replace(/#.*$/, "").trim();
      if (!clean) return;
      const m = clean.match(/^(\S+)\s*(?:->|→|=>)\s*(.*)$/);
      if (!m) return;
      const lhs = m[1];
      for (const alt of m[2].split("|")) {
        const toks = alt.trim().split(/\s+/).filter(Boolean);
        let p = 1.0;
        const pm = toks.length && toks[toks.length - 1].match(/^[\[(]\s*([0-9]*\.?[0-9]+)\s*[\])]$/);
        if (pm) {
          p = +pm[1];
          toks.pop();
        }
        if (toks.length) rules.push({ lhs, rhs: toks, p });
      }
    });
    return rules;
  };

  const runCKY = () => {
    const toks = sentence.trim().split(/\s+/).filter(Boolean);
    setWords(toks);
    setParseError("");
    const n = toks.length;
    if (n === 0) return;

    const rules = parseGrammarRules(grammarText);

    // Initialize n+1 by n+1 table
    const table: any[][] = Array.from({ length: n + 1 }, () =>
      Array.from({ length: n + 1 }, () => ({}))
    );

    // Length 1 (terminals)
    for (let i = 0; i < n; i++) {
      const w = toks[i].toLowerCase();
      rules.forEach((r) => {
        if (r.rhs.length === 1 && r.rhs[0].toLowerCase() === w) {
          table[i][i + 1][r.lhs] = {
            prob: r.p,
            rule: r,
            left: null,
            right: null,
            span: [i, i + 1],
          };
        }
      });
    }

    // Length 2 to n
    for (let len = 2; len <= n; len++) {
      for (let i = 0; i <= n - len; i++) {
        const j = i + len;
        for (let k = i + 1; k < j; k++) {
          const leftCell = table[i][k];
          const rightCell = table[k][j];

          rules.forEach((r) => {
            if (r.rhs.length === 2) {
              const B = r.rhs[0];
              const C = r.rhs[1];
              if (leftCell[B] && rightCell[C]) {
                const prob = r.p * leftCell[B].prob * rightCell[C].prob;
                if (!table[i][j][r.lhs] || prob > table[i][j][r.lhs].prob) {
                  table[i][j][r.lhs] = {
                    prob,
                    rule: r,
                    left: leftCell[B],
                    right: rightCell[C],
                    span: [i, j],
                  };
                }
              }
            }
          });
        }
      }
    }

    setChart(table);

    // Check top level S
    if (table[0][n]["S"]) {
      setTrees([table[0][n]["S"]]);
    } else {
      setTrees([]);
      setParseError("Bu cümle verilen gramerle ayrıştırılamadı.");
    }
  };

  useEffect(() => {
    runCKY();
  }, [grammarText, sentence]);

  const handleLearnFromTrees = () => {
    try {
      const parsed = parseTrees(treebankText);
      const learned = learn(parsed);
      const g = toGrammar(learned);
      setGrammarText(g);
      setActiveTab("chart");
    } catch (err: any) {
      alert("Ağaç ayrıştırma hatası: " + err.message);
    }
  };

  const renderTreeSVG = (node: any, x = 200, y = 30, w = 180): React.ReactNode => {
    if (!node) return null;
    const isLeaf = !node.left && !node.right;

    return (
      <g key={`${node.span?.[0]}-${node.span?.[1]}-${node.rule?.lhs}`}>
        <circle cx={x} cy={y} r={16} fill="var(--page)" stroke="var(--spot)" strokeWidth="1.8" />
        <text x={x} y={y + 5} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--ink)">
          {node.rule?.lhs}
        </text>

        {node.left && (
          <>
            <line x1={x} y1={y + 16} x2={x - w / 2} y2={y + 60} stroke="var(--rule-2)" />
            {renderTreeSVG(node.left, x - w / 2, y + 60, w / 2)}
          </>
        )}

        {node.right && (
          <>
            <line x1={x} y1={y + 16} x2={x + w / 2} y2={y + 60} stroke="var(--rule-2)" />
            {renderTreeSVG(node.right, x + w / 2, y + 60, w / 2)}
          </>
        )}

        {isLeaf && (
          <text x={x} y={y + 36} textAnchor="middle" fontSize="12" fill="var(--ink-2)">
            {node.rule?.rhs?.[0]}
          </text>
        )}
      </g>
    );
  };

  return (
    <div className="page">
      <h1 className="page-title">CFG, PCFG & CKY Ayrıştırma</h1>
      <p className="lesson-intro">
        Sözdizimsel çözümleme (Lecture 3): CKY tablosu, ayrıştırma ağaçları, olasılıklar ve adım adım ayrıştırıcılar.
      </p>

      {/* Preset pills */}
      <div className="chips" style={{ margin: "14px 0" }}>
        <span className="muted" style={{ alignSelf: "center", fontSize: ".85rem" }}>
          Hazır Örnekler:
        </span>
        {Object.entries(PRESETS).map(([k, p]) => (
          <button
            key={k}
            className="chip"
            aria-pressed={preset === k}
            onClick={() => {
              setPreset(k);
              setGrammarText(p.grammar);
              setSentence(p.sent);
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div>
          <label className="lbl">Gramer (CFG / PCFG):</label>
          <textarea
            className="ta"
            rows={8}
            style={{ fontFamily: "var(--font-mono)", fontSize: ".9rem" }}
            value={grammarText}
            onChange={(e) => setGrammarText(e.target.value)}
          />
        </div>
        <div>
          <label className="lbl">Ayrıştırılacak Cümle:</label>
          <textarea
            className="ta"
            rows={3}
            style={{ fontSize: "1.05rem" }}
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
          />
          <button className="btn pri" style={{ marginTop: "12px" }} onClick={runCKY}>
            CKY ile Ayrıştır
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-u" style={{ marginTop: "24px" }}>
        <button aria-pressed={activeTab === "chart"} onClick={() => setActiveTab("chart")}>
          CKY Tablosu
        </button>
        <button aria-pressed={activeTab === "trees"} onClick={() => setActiveTab("trees")}>
          Ayrıştırma Ağaçları ({trees.length})
        </button>
        <button aria-pressed={activeTab === "mle"} className="stu" onClick={() => setActiveTab("mle")}>
          Treebank MLE Öğrenici
        </button>
      </div>

      {/* TAB CONTENT: CHART */}
      {activeTab === "chart" && (
        <div style={{ marginTop: "20px" }}>
          {parseError && <div className="notice warn">{parseError}</div>}

          <h3 className="lbl">Üçgen CKY Çizelgesi:</h3>
          <div className="ck-scroll" role="region" tabIndex={0} aria-label="CKY Çizelgesi">
            <table
              className="ng-tbl"
              style={{ tableLayout: "fixed", textAlign: "center", borderCollapse: "collapse" }}
            >
              <thead>
                <tr>
                  <th style={{ width: "40px" }} />
                  {words.map((w, idx) => (
                    <th key={idx} style={{ padding: "8px" }}>
                      <b>{w}</b>
                      <br />
                      <small className="muted">{idx + 1}</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {words.map((_, i) => (
                  <tr key={i}>
                    <th>{i}</th>
                    {words.map((_, j) => {
                      if (j < i) return <td key={j} style={{ background: "var(--sunk)" }} />;
                      const cell = chart[i]?.[j + 1] || {};
                      const nonTerminals = Object.keys(cell);

                      return (
                        <td
                          key={j}
                          style={{
                            padding: "10px",
                            border: "1px solid var(--rule)",
                            background: nonTerminals.length > 0 ? "var(--wash)" : "var(--page)",
                          }}
                        >
                          {nonTerminals.length > 0 ? (
                            <div>
                              {nonTerminals.map((nt) => (
                                <span key={nt} className="tag" style={{ margin: "2px" }}>
                                  <b>{nt}</b>
                                  {cell[nt]?.prob < 1.0 && (
                                    <small> {cell[nt].prob.toFixed(3)}</small>
                                  )}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: TREES */}
      {activeTab === "trees" && (
        <div style={{ marginTop: "20px" }}>
          {trees.length === 0 ? (
            <div className="empty">Geçerli bir ağaç bulunamadı.</div>
          ) : (
            trees.map((t, i) => (
              <div key={i} className="card-e" style={{ padding: "20px", background: "var(--page)" }}>
                <div className="entry-head">
                  <span className="lbl">Ağaç {i + 1}</span>
                  {t.prob < 1.0 && (
                    <span className="tag" style={{ marginLeft: "auto" }}>
                      Olasılık: {t.prob.toExponential(4)} (log: {Math.log(t.prob).toFixed(2)})
                    </span>
                  )}
                </div>

                <div style={{ overflowX: "auto", padding: "20px 0" }}>
                  <svg width="600" height="240">
                    {renderTreeSVG(t, 300, 30, 240)}
                  </svg>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB CONTENT: MLE */}
      {activeTab === "mle" && (
        <div style={{ marginTop: "20px" }}>
          <p className="lesson-intro">
            Ayrıştırılmış ağaçlardan (treebank) Maksimum Olabilirlik (MLE) ile PCFG grameri ve kural olasılıklarını öğrenir.
          </p>

          <textarea
            className="ta"
            rows={5}
            style={{ fontFamily: "var(--font-mono)", fontSize: ".9rem" }}
            value={treebankText}
            onChange={(e) => setTreebankText(e.target.value)}
          />

          <button className="btn pri" style={{ marginTop: "12px" }} onClick={handleLearnFromTrees}>
            Ağaçlardan Gramer Üret
          </button>
        </div>
      )}
    </div>
  );
};
