import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import {
  api,
  FN_POS,
  FRAME_REL,
  tr,
  esc,
} from "../lib/core";
import { Icon } from "../lib/icons";

export const FramesView: React.FC = () => {
  const { state, updateFramesParams, openConcept, act } = useApp();
  const fp = state.framesParams;

  const [lang, setLang] = useState<"en" | "tr">(fp.lang || "en");
  const [q, setQ] = useState(fp.q || "");
  const [field, setField] = useState(fp.field || "name");
  const [mode, setMode] = useState(fp.mode || "contains");
  const [lupos, setLupos] = useState(fp.lupos || "");

  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [expandedFrame, setExpandedFrame] = useState<number | null>(null);
  const [frameDetails, setFrameDetails] = useState<Record<string, any>>({});
  const [selectedLuEx, setSelectedLuEx] = useState<{ lu: string; exs: any[] } | null>(null);

  useEffect(() => {
    runSearch();
  }, [lang, q, field, mode, lupos]);

  const runSearch = async (more = false) => {
    if (!q && !lupos) {
      setResults([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    updateFramesParams({ lang, q, field, mode, lupos });

    try {
      const res = await api("/api/fn", {
        lang,
        q,
        field,
        mode,
        lupos,
        fold: 1,
        offset: more ? results.length : 0,
        limit: 30,
      });

      setResults((prev) => (more ? [...prev, ...res.results] : res.results));
      setTotal(res.total);
      setFacets(res.facets || {});
    } catch (_) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleDetail = async (index: number, name: string) => {
    if (expandedFrame === index) {
      setExpandedFrame(null);
      setSelectedLuEx(null);
      return;
    }

    setExpandedFrame(index);
    setSelectedLuEx(null);

    if (!frameDetails[name]) {
      try {
        const d = await api("/api/frame", { name });
        setFrameDetails((prev) => ({ ...prev, [name]: d }));
      } catch (_) {}
    }
  };

  const fields =
    lang === "en"
      ? [
          ["name", "Çerçeve adı"],
          ["lu", "Sözcük (LU)"],
          ["fe", "Eleman (FE)"],
          ["def", "Tanım"],
        ]
      : [
          ["name", "Çerçeve adı"],
          ["verb", "Fiil"],
          ["fe", "Eleman (FE)"],
        ];

  const examples =
    lang === "en"
      ? [
          ["Make_agreement_on_action", "name"],
          ["agree.v", "lu"],
          ["Commerce_buy", "name"],
          ["Motion", "name"],
          ["Obligation", "fe"],
          ["Cooking_creation", "name"],
        ]
      : [
          ["Motion", "name"],
          ["açmak", "verb"],
          ["Commerce_buy", "name"],
          ["Time", "fe"],
        ];

  return (
    <div className="page">
      <h1 className="page-title">Bir durumu kim, neyle yaşar?</h1>

      <div className="row">
        <div className="seg" id="fLang">
          <button
            data-v="en"
            aria-pressed={lang === "en"}
            onClick={() => {
              setLang("en");
              setField("name");
              setLupos("");
            }}
          >
            English FrameNet 1.7
          </button>
          <button
            data-v="tr"
            aria-pressed={lang === "tr"}
            onClick={() => {
              setLang("tr");
              setField("name");
              setLupos("");
            }}
          >
            Türkçe FrameNet
          </button>
        </div>
      </div>

      <div className="row" style={{ marginTop: "16px" }}>
        <label className="field" style={{ flex: 1, minWidth: "240px" }}>
          <Icon name="search" />
          <input
            id="fq"
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder={
              field === "lu"
                ? "Sözcük ara · örn. agree, agree.v"
                : field === "verb"
                ? "Türkçe fiil ara · örn. açmak"
                : "Çerçeve, sözcük ya da eleman ara…"
            }
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        {field !== "def" && (
          <select
            className="sel"
            id="fMode"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="contains">içerir</option>
            <option value="exact">Tam eşleşme</option>
            <option value="prefix">ile başlar</option>
            <option value="suffix">ile biter</option>
          </select>
        )}
      </div>

      <div className="tabs-u" id="fField">
        {fields.map(([v, l]) => (
          <button
            key={v}
            data-v={v}
            aria-pressed={field === v}
            onClick={() => {
              setField(v);
              setLupos("");
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {lang === "en" && field === "lu" && (
        <div className="filters" id="fPosRow">
          <div className="fbar">
            <span className="lbl" style={{ width: "84px" }}>
              Sözcük türü
            </span>
            <div className="chips" id="fPos">
              {Object.entries(facets)
                .sort((a, b) => b[1] - a[1])
                .map(([k, n]) => (
                  <button
                    key={k}
                    className="chip"
                    aria-pressed={lupos === k}
                    onClick={() => setLupos(lupos === k ? "" : k)}
                  >
                    {FN_POS[k] || k} <small>{n}</small>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      <div id="fOut">
        {!q && !lupos ? (
          <div className="guide-home">
            <h2>Örnek aramalar</h2>
            <div className="big-chips" style={{ marginTop: "12px" }}>
              {examples.map(([w, f], i) => (
                <button
                  key={i}
                  onClick={() => {
                    setQ(w);
                    setField(f);
                    setMode(f === "name" ? "exact" : "contains");
                  }}
                >
                  {w}
                </button>
              ))}
            </div>
            <p className="lesson-intro" style={{ marginTop: "20px" }}>
              {lang === "en"
                ? "Çerçeve bir durum ya da olay şemasıdır; çerçeve elemanları (FE) katılımcı rollerdir (Core = zorunlu), sözcük birimleri (LU) çerçeveyi çağrıştıran sözcüklerdir (agree.v)."
                : "Türkçe FrameNet: 809 çerçeve; sözcük birimleri KeNet synset'leri. Tanım ve elemanlar İngilizce FrameNet ile eşleşir."}
            </p>
          </div>
        ) : loading && results.length === 0 ? (
          <div
            className="skeleton"
            style={{ height: "120px", marginTop: "20px" }}
          />
        ) : results.length === 0 ? (
          <div className="empty" style={{ marginTop: "20px" }}>
            Sonuç bulunamadı.
          </div>
        ) : (
          <div style={{ marginTop: "18px" }}>
            <div className="entry-head" style={{ borderBottomWidth: "1px" }}>
              <span className="lbl">{tr(total)} çerçeve</span>
            </div>

            {results.map((f, i) => {
              const isTr = lang === "tr";
              const isExpanded = expandedFrame === i;
              const detail = frameDetails[f.name];

              return (
                <article
                  key={f.name}
                  className="card-e"
                  style={{ margin: "16px 0" }}
                >
                  <h3>
                    <button
                      className="toggler"
                      style={{
                        font: "800 1.5rem var(--font-ui)",
                        letterSpacing: "-.025em",
                        color: "var(--ink)",
                      }}
                      onClick={() => toggleDetail(i, f.name)}
                    >
                      {f.name}
                    </button>
                    {isTr
                      ? f.en && <span className="tag">EN eşleşmesi var</span>
                      : f.tr && (
                          <span className="tag">TR · {f.ntr} LU</span>
                        )}
                    <small>
                      {f.nfe} eleman · {f.nlu} sözcük birimi
                    </small>
                  </h3>

                  {f.d && <p className="def">{f.d}</p>}

                  <div className="chips" style={{ marginTop: "8px" }}>
                    {isTr
                      ? f.fes?.map((x: string) => (
                          <span key={x} className="feper">
                            {x}
                          </span>
                        ))
                      : f.core?.map((x: string) => (
                          <span key={x} className="fecore">
                            {x}
                          </span>
                        ))}
                  </div>

                  <div style={{ marginTop: "10px" }}>
                    <button
                      className="toggler"
                      aria-expanded={isExpanded}
                      onClick={() => toggleDetail(i, f.name)}
                    >
                      {isExpanded ? "Kapat" : "Ayrıntı"}
                    </button>
                  </div>

                  {isExpanded && (
                    <div
                      className="detail"
                      style={{
                        marginTop: "16px",
                        paddingTop: "16px",
                        borderTop: "1px solid var(--rule)",
                      }}
                    >
                      {!detail ? (
                        <div
                          className="skeleton"
                          style={{ height: "80px" }}
                        />
                      ) : (
                        <>
                          {detail.en && (
                            <>
                              <p className="def">{detail.en.d}</p>

                              {/* Frame Elements Table */}
                              <h4
                                className="lbl"
                                style={{ margin: "18px 0 6px" }}
                              >
                                Çerçeve elemanları
                              </h4>
                              <div
                                className="ck-scroll"
                                role="region"
                                tabIndex={0}
                                aria-label="Çerçeve elemanları tablosu"
                              >
                                <table className="argtbl">
                                  <thead>
                                    <tr>
                                      <th>Eleman</th>
                                      <th>Tür</th>
                                      <th>Tanım</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {detail.en.fes?.map((fe: any, k: number) => (
                                      <tr key={k}>
                                        <td>
                                          <span
                                            className={`rl-a u${k % 5}`}
                                          >
                                            {fe.n}
                                          </span>
                                        </td>
                                        <td>
                                          <span
                                            className={
                                              fe.c === "Core"
                                                ? "fecore"
                                                : "feper"
                                            }
                                          >
                                            {fe.c}
                                          </span>
                                        </td>
                                        <td>{fe.d}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {/* Lexical Units */}
                              <h4
                                className="lbl"
                                style={{ margin: "18px 0 6px" }}
                              >
                                Sözcük birimleri (LU)
                              </h4>
                              {Object.entries(detail.en.lus || {}).map(
                                ([p, lus]: [string, any]) => (
                                  <div key={p} style={{ margin: "6px 0" }}>
                                    <span
                                      className="muted"
                                      style={{
                                        font: "italic .9rem var(--font-text)",
                                        marginRight: "8px",
                                      }}
                                    >
                                      {FN_POS[p] || p}
                                    </span>
                                    {lus.map((x: string) => (
                                      <button
                                        key={x}
                                        className="lu"
                                        style={{ marginRight: "4px" }}
                                        onClick={() => {
                                          if (detail.lux?.[x]) {
                                            setSelectedLuEx({
                                              lu: x,
                                              exs: detail.lux[x],
                                            });
                                          }
                                        }}
                                      >
                                        {x}
                                      </button>
                                    ))}
                                  </div>
                                )
                              )}

                              {selectedLuEx && (
                                <div
                                  className="luxbox"
                                  style={{
                                    marginTop: "12px",
                                    padding: "12px",
                                    background: "var(--sunk)",
                                    borderRadius: "var(--r)",
                                  }}
                                >
                                  <h4 className="lbl">
                                    {selectedLuEx.lu} · Örnekler
                                  </h4>
                                  {selectedLuEx.exs.map((e, ei) => (
                                    <div
                                      key={ei}
                                      className="fx"
                                      style={{ margin: "6px 0" }}
                                    >
                                      {e.t}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Relations */}
                              {detail.en.rels && detail.en.rels.length > 0 && (
                                <div style={{ marginTop: "18px" }}>
                                  <h4
                                    className="lbl"
                                    style={{ margin: "0 0 8px" }}
                                  >
                                    Çerçeve ilişkileri
                                  </h4>
                                  <div className="chips">
                                    {detail.en.rels.map((rel: any, ri: number) => (
                                      <button
                                        key={ri}
                                        className="frm"
                                        onClick={() => setQ(rel.o)}
                                      >
                                        {rel.t}: {rel.o}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                          {detail.tr && (
                            <div style={{ marginTop: "18px" }}>
                              <h4
                                className="lbl"
                                style={{ margin: "0 0 8px" }}
                              >
                                Türkçe FrameNet · {detail.tr.nlu} sözcük birimi
                              </h4>
                              <div className="chips">
                                {detail.tr.lus?.map((b: any) => (
                                  <button
                                    key={b.id}
                                    className="rel"
                                    onClick={() => openConcept(b.id, "kenet")}
                                  >
                                    {b.lits?.map((l: any) => l.w).join(", ")}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
