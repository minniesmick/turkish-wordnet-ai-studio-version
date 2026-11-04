import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { api, esc, tr } from "../lib/core";
import { Icon } from "../lib/icons";

interface UDToken {
  id: number;
  form: string;
  lemma: string;
  upos: string;
  xpos: string;
  feats: string;
  head: number;
  deprel: string;
}

export const DepsView: React.FC = () => {
  const [query, setQuery] = useState("");
  const [minLen, setMinLen] = useState(3);
  const [maxLen, setMaxLen] = useState(15);
  const [sentences, setSentences] = useState<any[]>([]);
  const [selectedSent, setSelectedSent] = useState<any>(null);
  const [tokens, setTokens] = useState<UDToken[]>([]);
  const [selectedToken, setSelectedToken] = useState<UDToken | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    searchSentences();
  }, []);

  const searchSentences = async () => {
    setLoading(true);
    try {
      const res = await api("/api/ud", {
        q: query,
        min: minLen,
        max: maxLen,
        limit: 20,
      });
      setSentences(res.results || []);
      if (res.results?.[0]) {
        loadSentence(res.results[0].id);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  const loadSentence = async (id: string) => {
    try {
      const res = await api("/api/ud", { id });
      setSelectedSent(res);
      parseCoNLLU(res.conllu);
    } catch (_) {}
  };

  const parseCoNLLU = (raw: string) => {
    const list: UDToken[] = [];
    const lines = raw.split("\n");
    for (const line of lines) {
      if (!line || line.startsWith("#")) continue;
      const parts = line.split("\t");
      if (parts.length >= 8 && /^\d+$/.test(parts[0])) {
        list.push({
          id: +parts[0],
          form: parts[1],
          lemma: parts[2],
          upos: parts[3],
          xpos: parts[4],
          feats: parts[5],
          head: +parts[6],
          deprel: parts[7],
        });
      }
    }
    setTokens(list);
    setSelectedToken(null);
  };

  const W_STEP = 110;
  const svgWidth = Math.max(600, (tokens.length + 1) * W_STEP);

  return (
    <div className="page">
      <h1 className="page-title">Bağımlılık Ayrıştırma (Universal Dependencies)</h1>
      <p className="lesson-intro">
        UD Turkish-BOUN treebank cümleleri üzerinde bağımlılık ağaçları: sözcükler arasındaki baş-bağımlı (head-dependent) ilişkileri ve dilbilgisel işlevler (Lecture 3).
      </p>

      {/* Search / filter controls */}
      <div className="row" style={{ marginTop: "16px" }}>
        <label className="field" style={{ flex: 1 }}>
          <Icon name="search" />
          <input
            type="text"
            placeholder="Cümle içinde ara…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchSentences()}
          />
        </label>
        <label className="chk">
          Uzunluk:
          <input
            type="number"
            min={1}
            max={50}
            value={minLen}
            onChange={(e) => setMinLen(+e.target.value)}
            style={{ width: "50px", marginLeft: "4px" }}
          />
          {" - "}
          <input
            type="number"
            min={1}
            max={50}
            value={maxLen}
            onChange={(e) => setMaxLen(+e.target.value)}
            style={{ width: "50px" }}
          />
        </label>
        <button className="btn pri" onClick={searchSentences}>
          Ara
        </button>
      </div>

      {/* Sentence selection chips */}
      <div className="chips" style={{ marginTop: "14px" }}>
        {sentences.map((s) => (
          <button
            key={s.id}
            className="chip"
            aria-pressed={selectedSent?.id === s.id}
            onClick={() => loadSentence(s.id)}
          >
            {s.text.length > 36 ? s.text.slice(0, 34) + "…" : s.text}
            <small>{s.n} sözcük</small>
          </button>
        ))}
      </div>

      {/* Tree Visualization */}
      {selectedSent && (
        <div style={{ marginTop: "24px" }}>
          <div
            className="card-e"
            style={{
              padding: "16px 20px",
              background: "var(--page)",
              marginBottom: "16px",
              fontSize: "1.2rem",
            }}
          >
            <b>Cümle:</b> {selectedSent.text}
          </div>

          <div
            className="card-e"
            style={{
              padding: "20px 0",
              background: "var(--page)",
              overflowX: "auto",
            }}
          >
            <svg width={svgWidth} height="220" style={{ display: "block" }}>
              <defs>
                <marker
                  id="arr"
                  viewBox="0 0 10 10"
                  refX="5"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--rule-2)" />
                </marker>
              </defs>

              {/* Curved arcs */}
              {tokens.map((t) => {
                if (t.head === 0) {
                  // Root pointer
                  const x = t.id * W_STEP;
                  return (
                    <g key={`root-${t.id}`}>
                      <line
                        x1={x}
                        y1={40}
                        x2={x}
                        y2={130}
                        stroke="var(--spot)"
                        strokeWidth="2"
                        markerEnd="url(#arr)"
                      />
                      <text
                        x={x}
                        y={32}
                        textAnchor="middle"
                        fill="var(--spot)"
                        fontSize="12"
                        fontWeight="700"
                      >
                        root
                      </text>
                    </g>
                  );
                }

                const headToken = tokens.find((h) => h.id === t.head);
                if (!headToken) return null;

                const x1 = headToken.id * W_STEP;
                const x2 = t.id * W_STEP;
                const dist = Math.abs(x1 - x2);
                const height = Math.min(100, 30 + dist * 0.22);
                const cy = 135 - height;
                const midX = (x1 + x2) / 2;

                return (
                  <g key={`arc-${t.id}`}>
                    <path
                      d={`M ${x1} 135 Q ${midX} ${cy} ${x2} 135`}
                      fill="none"
                      stroke="var(--rule-2)"
                      strokeWidth="1.6"
                      markerEnd="url(#arr)"
                    />
                    <text
                      x={midX}
                      y={cy - 4}
                      textAnchor="middle"
                      fill="var(--ink-2)"
                      fontSize="11"
                      fontFamily="var(--font-mono)"
                    >
                      {t.deprel}
                    </text>
                  </g>
                );
              })}

              {/* Word Tokens */}
              {tokens.map((t) => {
                const x = t.id * W_STEP;
                const isSelected = selectedToken?.id === t.id;

                return (
                  <g
                    key={`tok-${t.id}`}
                    transform={`translate(${x}, 150)`}
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedToken(t)}
                  >
                    <rect
                      x={-45}
                      y={-10}
                      width={90}
                      height={46}
                      rx={6}
                      fill={isSelected ? "var(--wash-2)" : "var(--page)"}
                      stroke={isSelected ? "var(--spot)" : "var(--rule)"}
                      strokeWidth={isSelected ? "2" : "1"}
                    />
                    <text
                      x={0}
                      y={10}
                      textAnchor="middle"
                      fontWeight="700"
                      fontSize="14"
                      fill="var(--ink)"
                    >
                      {t.form}
                    </text>
                    <text
                      x={0}
                      y={26}
                      textAnchor="middle"
                      fontSize="10"
                      fill="var(--ink-3)"
                    >
                      {t.upos}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Token inspector drawer */}
          {selectedToken && (
            <div
              className="card-e"
              style={{
                marginTop: "16px",
                padding: "16px 20px",
                background: "var(--page)",
              }}
            >
              <div className="entry-head">
                <h3 style={{ fontSize: "1.3rem" }}>
                  <b>{selectedToken.form}</b> <small>· {selectedToken.lemma}</small>
                </h3>
                <span className="tag" style={{ marginLeft: "auto" }}>
                  {selectedToken.upos}
                </span>
              </div>
              <p style={{ marginTop: "8px" }}>
                <b>İlişki:</b> <code>{selectedToken.deprel}</code> → Baş sözcük ID:{" "}
                {selectedToken.head}
              </p>
              <p style={{ marginTop: "4px" }}>
                <b>Özellikler (FEATS):</b>{" "}
                <span className="muted">
                  {selectedToken.feats === "_" ? "Yok" : selectedToken.feats}
                </span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
