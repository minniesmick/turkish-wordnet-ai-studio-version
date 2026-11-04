import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { api, REL, w1, esc, tr } from "../lib/core";
import { Icon } from "../lib/icons";

const EX: Record<string, [string, string][]> = {
  en: [
    ["vacation", "holiday"],
    ["couch", "sofa"],
    ["dog", "animal"],
    ["mango", "fruit"],
    ["polar bear", "animal"],
    ["remove", "eliminate"],
    ["hot", "cold"],
    ["car", "bicycle"],
    ["car", "gasoline"],
    ["snore", "sleep"],
    ["walk", "stroll"],
    ["dog", "cat"],
    ["nickel", "dime"],
  ],
  kenet: [
    ["köpek", "hayvan"],
    ["elma", "meyve"],
    ["sıcak", "soğuk"],
    ["araba", "bisiklet"],
    ["kanepe", "koltuk"],
    ["tatil", "izin"],
  ],
};

const RL: Record<string, string> = {
  synonym: "eş anlamlı",
  antonym: "zıt anlamlı",
  a_hypo_b: "alt kavram",
  a_hyper_b: "üst kavram",
  cousin: "ortak üst kavram",
};

export const RelateView: React.FC = () => {
  const { state, updateRelateParams, openConcept, setView } = useApp();
  const rp = state.relateParams;

  const [inputA, setInputA] = useState(rp.a || "");
  const [inputB, setInputB] = useState(rp.b || "");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setInputA(rp.a || "");
    setInputB(rp.b || "");
    if (rp.a && rp.b) {
      runCompare(rp.a, rp.b);
    }
  }, [rp.a, rp.b, state.ds]);

  const runCompare = async (a = inputA, b = inputB) => {
    const wordA = a.trim();
    const wordB = b.trim();
    if (!wordA || !wordB) return;

    updateRelateParams({ a: wordA, b: wordB });
    setLoading(true);

    try {
      const res = await api("/api/relate", {
        ds: state.ds,
        a: wordA,
        b: wordB,
      });
      setData(res);
    } catch (_) {
      setData({ error: true });
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = () => {
    const nextA = inputB;
    const nextB = inputA;
    setInputA(nextA);
    setInputB(nextB);
    if (nextA && nextB) runCompare(nextA, nextB);
  };

  const examples = EX[state.ds] || EX.kenet;

  const sentence = (r: any, A: string, B: string) => {
    switch (r.rel) {
      case "synonym":
        return `${A} ve ${B} eş anlamlı: aynı synset'in üyeleri.`;
      case "a_hypo_b":
        return `${A}, ${B} sözcüğünün alt kavramı: ${A} bir ${B}.`;
      case "a_hyper_b":
        return `${A}, ${B} sözcüğünün üst kavramı.`;
      case "antonym":
        return `${A} ve ${B} zıt anlamlı.`;
      case "cousin":
        return `Doğrudan bağ yok; ikisi de ${w1(r.lcs)} altında.`;
      default:
        return `${A} → ${B}: ${REL[r.rel] || r.rel} ilişkisi.`;
    }
  };

  const simWord = (s: number) =>
    s >= 0.33
      ? "yakın: benzer sözcükler"
      : s >= 0.15
      ? "orta: ilişkili olabilir"
      : "uzak: ilişkili olsa bile benzer değil";

  const renderFork = (b: any) => {
    const p = b.path;
    const k = b.lcs_at;
    if (!p || k == null) return null;

    const left = p.slice(0, k).reverse();
    const right = p.slice(k + 1);
    const lcs = p[k];

    return (
      <div className="fork" aria-label="Ortak üst kavram şeması">
        <div className="top">
          <button
            className="fnode lcs"
            title={lcs.d}
            onClick={() => openConcept(lcs.id, state.ds)}
          >
            <b>{lcs.lits.map((l: any) => l.w).join(" / ")}</b>
            <small>
              {b.rel === "synonym" ? "aynı synset" : "ortak üst kavram"}
            </small>
          </button>
        </div>

        {right.length > 0 ? (
          <div
            style={{
              gridColumn: "1/-1",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "calc(50% + 28px)",
                height: "20px",
                border: "1px solid var(--ink-2)",
                borderBottom: 0,
              }}
            />
          </div>
        ) : (
          <div
            style={{
              gridColumn: "1/-1",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <span className="fstem" />
          </div>
        )}

        <div className="col l">
          {left.map((n: any, i: number) => (
            <React.Fragment key={n.id}>
              {i > 0 && <span className="fstem" />}
              <button
                className={`fnode ${i === left.length - 1 ? "end" : ""}`}
                title={n.d}
                onClick={() => openConcept(n.id, state.ds)}
              >
                <b>{n.lits.map((l: any) => l.w).join(" / ")}</b>
                <small>{i === left.length - 1 ? "1. sözcük" : ""}</small>
              </button>
            </React.Fragment>
          ))}
        </div>

        <div className="col r">
          {right.map((n: any, i: number) => (
            <React.Fragment key={n.id}>
              {i > 0 && <span className="fstem" />}
              <button
                className={`fnode ${i === right.length - 1 ? "end" : ""}`}
                title={n.d}
                onClick={() => openConcept(n.id, state.ds)}
              >
                <b>{n.lits.map((l: any) => l.w).join(" / ")}</b>
                <small>{i === right.length - 1 ? "2. sözcük" : ""}</small>
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const b = data?.best;

  return (
    <div className="page">
      <h1 className="page-title">İki sözcük ne kadar yakın?</h1>
      <p className="lesson-intro" style={{ margin: 0 }}>
        Eş anlamlı mı, zıt mı, biri ötekinin alt kavramı mı, yoksa yalnızca
        ortak bir üst kavramı mı paylaşıyorlar?
      </p>

      <div className="pair">
        <label className="field">
          <Icon name="search" />
          <input
            id="ra"
            type="text"
            placeholder="1. sözcük"
            autoComplete="off"
            spellCheck={false}
            value={inputA}
            onChange={(e) => setInputA(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runCompare()}
          />
        </label>
        <button
          className="iconbtn"
          id="rSwap"
          aria-label="Yer değiştir"
          title="Yer değiştir"
          onClick={handleSwap}
        >
          <Icon name="swap" />
        </button>
        <label className="field">
          <Icon name="search" />
          <input
            id="rb"
            type="text"
            placeholder="2. sözcük"
            autoComplete="off"
            spellCheck={false}
            value={inputB}
            onChange={(e) => setInputB(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runCompare()}
          />
        </label>
        <button
          className="btn pri"
          id="rGo"
          style={{ height: "46px" }}
          onClick={() => runCompare()}
        >
          Karşılaştır
        </button>
      </div>

      <div className="chips" id="rEx" style={{ marginTop: "14px" }}>
        {examples.map(([a, b], idx) => (
          <button
            key={idx}
            className="chip"
            onClick={() => {
              setInputA(a);
              setInputB(b);
              runCompare(a, b);
            }}
          >
            {a} <Icon name="swap" /> {b}
          </button>
        ))}
      </div>

      <div id="rOut" aria-live="polite">
        {loading ? (
          <div
            className="skeleton"
            style={{ height: "120px", marginTop: "30px" }}
          />
        ) : data?.error ? (
          <div className="empty" style={{ marginTop: "30px" }}>
            <b>{data.missing?.join(", ") || "Sözcük"}</b> bu sözlükte yok.
            <br />
            <span style={{ fontSize: ".92rem" }}>
              {state.ds === "kenet"
                ? "Türkçe sözcüğü yalın hâlde yaz."
                : "Sözcüğü yalın biçimde yaz (örn. run)."}
            </span>
          </div>
        ) : b ? (
          <div style={{ marginTop: "30px" }}>
            <p className="verdict">{sentence(b, inputA, inputB)}</p>
            {b.d != null && (
              <p className="lesson-intro" style={{ margin: 0 }}>
                {simWord(b.sim)}.
              </p>
            )}

            {/* Metrics table */}
            <div
              className="ck-scroll"
              role="region"
              tabIndex={0}
              aria-label="Benzerlik ölçüleri tablosu"
              style={{ marginTop: "20px" }}
            >
              <table className="ledger">
                <thead>
                  <tr>
                    <th>Ölçü</th>
                    <th>Değer</th>
                    <th className="stu">Formül</th>
                    <th style={{ width: "30%" }}>Görsel</th>
                  </tr>
                </thead>
                <tbody>
                  {b.d != null && (
                    <>
                      <tr>
                        <th>Yol uzunluğu</th>
                        <td className="v">{b.d}</td>
                        <td className="f stu">hiyerarşide kenar sayısı</td>
                        <td />
                      </tr>
                      <tr>
                        <th>Path benzerliği</th>
                        <td className="v">{b.sim.toFixed(2)}</td>
                        <td className="f stu">1 / (yol + 1)</td>
                        <td>
                          <div className="meter">
                            <i>
                              <b
                                style={{
                                  width: `${Math.min(1, b.sim) * 100}%`,
                                }}
                              />
                            </i>
                          </div>
                        </td>
                      </tr>
                      {b.wup != null && (
                        <tr>
                          <th>Wu-Palmer</th>
                          <td className="v">{b.wup.toFixed(2)}</td>
                          <td className="f stu">
                            2·derinlik(LCS) / (2·derinlik(LCS)+yol)
                          </td>
                          <td>
                            <div className="meter">
                              <i>
                                <b
                                  style={{
                                    width: `${Math.min(1, b.wup) * 100}%`,
                                  }}
                                />
                              </i>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )}

                  {b.ic && (
                    <>
                      <tr>
                        <th>Resnik (IC)</th>
                        <td className="v">{b.ic.res.toFixed(2)}</td>
                        <td className="f stu">IC(LCS) · {w1(b.ic.lcs)}</td>
                        <td />
                      </tr>
                      <tr>
                        <th>Lin (IC)</th>
                        <td className="v">{b.ic.lin.toFixed(2)}</td>
                        <td className="f stu">
                          2·IC(LCS) / (IC(a)+IC(b))
                        </td>
                        <td>
                          <div className="meter">
                            <i>
                              <b
                                style={{
                                  width: `${Math.min(1, b.ic.lin) * 100}%`,
                                }}
                              />
                            </i>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <th>Jiang-Conrath</th>
                        <td className="v">
                          {b.ic.jcn == null ? "∞" : b.ic.jcn.toFixed(2)}
                        </td>
                        <td className="f stu">
                          1 / (IC(a)+IC(b)−2·IC(LCS))
                        </td>
                        <td />
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Fork schema */}
            {renderFork(b)}

            {/* Action buttons */}
            <div className="row" style={{ marginTop: "16px" }}>
              <button
                className="btn pri sm"
                onClick={() =>
                  setView("graph", { graph: { id: b.a.id, ds: state.ds } })
                }
              >
                <Icon name="graph" />
                {w1(b.a)} haritada
              </button>
              <button
                className="btn sm"
                onClick={() =>
                  setView("graph", { graph: { id: b.b.id, ds: state.ds } })
                }
              >
                <Icon name="graph" />
                {w1(b.b)} haritada
              </button>
            </div>

            {/* Alternative sense pairs */}
            {data.rows && data.rows.length > 1 && (
              <div style={{ marginTop: "34px" }}>
                <h3 className="lbl" style={{ margin: "0 0 10px" }}>
                  Diğer anlam çiftleri · {data.nA} × {data.nB} denendi
                </h3>
                <div
                  className="ck-scroll"
                  role="region"
                  tabIndex={0}
                  aria-label="Diğer anlam çiftleri tablosu"
                >
                  <table className="argtbl">
                    <thead>
                      <tr>
                        <th>1. sözcük anlamı</th>
                        <th>2. sözcük anlamı</th>
                        <th>İlişki</th>
                        <th>Benzerlik</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((r: any, idx: number) => (
                        <tr key={idx}>
                          <td>
                            <button
                              className="rel"
                              onClick={() => openConcept(r.a.id, state.ds)}
                            >
                              {w1(r.a)}
                            </button>{" "}
                            <span className="vt">
                              {r.a.d.slice(0, 54)}
                            </span>
                          </td>
                          <td>
                            <button
                              className="rel"
                              onClick={() => openConcept(r.b.id, state.ds)}
                            >
                              {w1(r.b)}
                            </button>{" "}
                            <span className="vt">
                              {r.b.d.slice(0, 54)}
                            </span>
                          </td>
                          <td>
                            <span className="tag">
                              {RL[r.rel] || REL[r.rel] || r.rel}
                            </span>
                          </td>
                          <td>{r.sim.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
