import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { api, POS, sub, esc, w1 } from "../lib/core";

const WSD_EX: Record<string, [string, string, string][]> = {
  en: [
    ["She pays 3% interest on the loan.", "interest", "S4 faiz"],
    ["He showed a lot of interest in the painting.", "interest", "S1 ilgi"],
    [
      "Microsoft purchased a controlling interest in Google.",
      "interest",
      "S6 hisse",
    ],
    [
      "It is in the national interest to invade the Bahamas.",
      "interest",
      "S3 çıkar",
    ],
    ["Playing chess is one of my interests.", "interests", "S5 uğraş"],
    ["Business interests lobbied for the legislation.", "interests", "S7 grup"],
    ["I withdrew the money from the bank.", "bank", "para bankası"],
    ["The bank is constructed from red brick.", "bank", "bina"],
  ],
  kenet: [
    ["Banka kredi faizini yükseltti.", "faiz", ""],
    ["Kuş uçmak istedi ama kanadı kırıktı.", "kanadı", "kanat"],
    ["Binanın doğu kanadı yıkıldı.", "kanadı", "kanat"],
    ["Kalemle deftere yazı yazdı.", "kalem", ""],
    ["Bu bakanlığın yazı işleri kalemi çok yoğun.", "kalem", ""],
  ],
};

const NB_EX: [string, string][] = [
  ["She pays 3% interest on the loan.", "faiz (6)"],
  ["He showed a lot of interest in the painting.", "ilgi (1)"],
  ["Microsoft purchased a controlling interest in Google.", "hisse (5)"],
  ["It is in the national interest to invade the Bahamas.", "çıkar (4)"],
  ["I only have your best interest in mind.", "çıkar (4)"],
  ["Playing chess is one of my interests.", "uğraş (3)"],
  ["Business interests lobbied for the legislation.", "grup"],
];

export const WsdView: React.FC = () => {
  const { state, updateWsdParams, openConcept } = useApp();
  const wp = state.wsdParams;

  const [text, setText] = useState(wp.text || "");
  const [target, setTarget] = useState(wp.target || "");
  const [lemma, setLemma] = useState(wp.lemma || "");
  const [ext, setExt] = useState(wp.ext);
  const [method, setMethod] = useState<"lesk" | "nb">(wp.method || "lesk");

  // NB params
  const [nbCorpus, setNbCorpus] = useState(wp.corpus || "senseval");
  const [nbLemma, setNbLemma] = useState(
    wp.lemma || (wp.corpus === "semcor" ? "interest" : "interest-n")
  );
  const [nbBag, setNbBag] = useState(wp.bag);
  const [nbPos, setNbPos] = useState(wp.pos);
  const [nbWin, setNbWin] = useState(wp.win || 10);
  const [nbLemmasList, setNbLemmasList] = useState<any[]>([]);

  const [leskData, setLeskData] = useState<any>(null);
  const [nbData, setNbData] = useState<any>(null);
  const [evalData, setEvalData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Tokens of current text
  const tokens = Array.from(
    new Set(text.match(/\p{L}+/gu) || [])
  );

  useEffect(() => {
    if (method === "nb") {
      api("/api/nblemmas", { corpus: nbCorpus })
        .then((j) => setNbLemmasList(j.lemmas?.slice(0, 24) || []))
        .catch(() => {});
    }
  }, [method, nbCorpus]);

  const runLesk = async (t = text, tgt = target, lem = lemma) => {
    if (!t.trim() || !tgt.trim()) return;
    setLoading(true);
    setEvalData(null);
    updateWsdParams({
      method: "lesk",
      text: t,
      target: tgt,
      lemma: lem,
      ext,
    });

    try {
      const res = await api("/api/wsd", {
        ds: state.ds,
        text: t,
        target: tgt,
        lemma: lem,
        ext: ext ? 1 : 0,
      });
      setLeskData(res);
    } catch (_) {
      setLeskData({ error: true });
    } finally {
      setLoading(false);
    }
  };

  const runNb = async (t = text, lem = nbLemma) => {
    if (!t.trim()) return;
    setLoading(true);
    setEvalData(null);
    updateWsdParams({
      method: "nb",
      corpus: nbCorpus,
      lemma: lem,
      text: t,
      bag: nbBag,
      pos: nbPos,
      win: nbWin,
    });

    const feats = [nbBag ? "bag" : "", nbPos ? "pos" : ""]
      .filter(Boolean)
      .join(",");

    try {
      const res = await api("/api/nb", {
        corpus: nbCorpus,
        lemma: lem,
        text: t,
        feat: feats,
        win: nbWin,
      });
      setNbData(res);
    } catch (_) {
      setNbData({ error: true });
    } finally {
      setLoading(false);
    }
  };

  const runNbEval = async () => {
    setLoading(true);
    const feats = [nbBag ? "bag" : "", nbPos ? "pos" : ""]
      .filter(Boolean)
      .join(",");
    try {
      const res = await api("/api/nbeval", {
        corpus: nbCorpus,
        lemma: nbLemma,
        feat: feats,
        win: nbWin,
      });
      setEvalData(res);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  const examples = WSD_EX[state.ds] || WSD_EX.kenet;

  return (
    <div className="page">
      <h1 className="page-title">Bu cümlede hangi anlam?</h1>

      <div className="row">
        <div className="seg" id="wMethod">
          <button
            data-v="lesk"
            aria-pressed={method === "lesk"}
            onClick={() => setMethod("lesk")}
          >
            Lesk · bilgi tabanlı
          </button>
          <button
            data-v="nb"
            aria-pressed={method === "nb"}
            onClick={() => setMethod("nb")}
          >
            Naive Bayes · denetimli
          </button>
        </div>
      </div>

      <p className="lesson-intro" id="wHint" style={{ margin: "14px 0 0" }}>
        {method === "lesk"
          ? "Bilgi tabanlı yöntem: bağlam sözcükleri ile tanım ve örnek sözcüklerinin örtüşmesi. Cümledeki bir sözcüğe tıklayarak hedefi seç. Örtüşme yoksa karar veremez; sınırı bu."
          : "Denetimli yöntem: anlam etiketli gerçek cümlelerden Naive Bayes öğrenir. Özellikler bağlam torbası ve hedefin çevresindeki sözcükler. Yalnızca İngilizce veri var (SemCor, SENSEVAL-2)."}
      </p>

      <textarea
        className="ta"
        id="wText"
        rows={2}
        placeholder="Bir cümle yaz…"
        style={{ marginTop: "16px" }}
        spellCheck={false}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {method === "lesk" ? (
        <div id="wLesk">
          {tokens.length > 0 && (
            <div id="wTokens" className="chips" style={{ marginTop: "12px" }}>
              {tokens.map((tk) => {
                const isSelected =
                  tk.toLowerCase() === target.trim().toLowerCase();
                return (
                  <button
                    key={tk}
                    className="tk"
                    aria-pressed={isSelected}
                    onClick={() => {
                      setTarget(tk);
                      runLesk(text, tk, lemma);
                    }}
                  >
                    {tk}
                  </button>
                );
              })}
            </div>
          )}

          <div className="row" style={{ marginTop: "12px" }}>
            <label className="field sm" style={{ width: "190px" }}>
              <input
                id="wTarget"
                type="text"
                placeholder="hedef sözcük"
                spellCheck={false}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </label>
            <label
              className="field sm"
              style={{ width: "190px" }}
              title="Ekli biçimden kök bulunamazsa elle yaz (örn. kanadı → kanat)"
            >
              <input
                id="wLemma"
                type="text"
                placeholder="kök (isteğe bağlı)"
                spellCheck={false}
                value={lemma}
                onChange={(e) => setLemma(e.target.value)}
              />
            </label>
            <label className="chk">
              <input
                type="checkbox"
                id="wExt"
                checked={ext}
                onChange={(e) => setExt(e.target.checked)}
              />
              ilişkili synset tanımlarını da kat
            </label>
            <button
              className="btn pri"
              id="wGo"
              onClick={() => runLesk()}
            >
              Anlamı bul
            </button>
          </div>

          <div className="chips" id="wEx" style={{ marginTop: "14px" }}>
            {examples.map(([t, w, l], i) => (
              <button
                key={i}
                className="chip"
                onClick={() => {
                  setText(t);
                  setTarget(w);
                  const lem = state.ds === "kenet" && l ? l : "";
                  setLemma(lem);
                  runLesk(t, w, lem);
                }}
              >
                {t.length > 40 ? t.slice(0, 38) + "…" : t}
                <small>{l || w}</small>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div id="wNb">
          <div className="row" style={{ marginTop: "12px" }}>
            <select
              className="sel"
              id="nbCorpus"
              value={nbCorpus}
              onChange={(e) => {
                const c = e.target.value;
                setNbCorpus(c);
                setNbLemma(c === "senseval" ? "interest-n" : "interest");
              }}
            >
              <option value="senseval">
                SENSEVAL-2 (hard, interest, line, serve)
              </option>
              <option value="semcor">SemCor (WordNet anlamları)</option>
            </select>
            <label className="field sm" style={{ width: "150px" }}>
              <input
                id="nbLemma"
                type="text"
                placeholder="sözcük"
                spellCheck={false}
                value={nbLemma}
                onChange={(e) => setNbLemma(e.target.value)}
              />
            </label>
            <label className="chk">
              <input
                type="checkbox"
                id="nbBag"
                checked={nbBag}
                onChange={(e) => setNbBag(e.target.checked)}
              />
              bağlam torbası
            </label>
            <label className="chk">
              <input
                type="checkbox"
                id="nbPos"
                checked={nbPos}
                onChange={(e) => setNbPos(e.target.checked)}
              />
              yan sözcükler (±2)
            </label>
            <label className="chk">
              pencere{" "}
              <input
                type="number"
                id="nbWin"
                min={0}
                max={40}
                value={nbWin}
                onChange={(e) => setNbWin(+e.target.value)}
                style={{
                  width: "56px",
                  height: "30px",
                  border: "1px solid var(--rule-2)",
                  borderRadius: "var(--r)",
                  background: "var(--page)",
                  padding: "0 6px",
                }}
              />
            </label>
          </div>

          <div className="row" style={{ marginTop: "12px" }}>
            <button className="btn pri" id="nbGo" onClick={() => runNb()}>
              Anlamı bul
            </button>
            <button className="btn" id="nbEval" onClick={runNbEval}>
              Doğruluğu ölç · 5-kat
            </button>
          </div>

          <div className="chips" id="nbLemmas" style={{ marginTop: "14px" }}>
            {nbLemmasList.map((l) => (
              <button
                key={l.lemma}
                className="chip"
                aria-pressed={l.lemma === nbLemma}
                onClick={() => {
                  setNbLemma(l.lemma);
                  runNb(text, l.lemma);
                }}
              >
                {l.lemma}
                <small>
                  {l.n} örnek · {l.senses} anlam
                </small>
              </button>
            ))}
          </div>

          <div className="chips" id="nbEx" style={{ marginTop: "10px" }}>
            {NB_EX.map(([t, l], i) => (
              <button
                key={i}
                className="chip"
                onClick={() => {
                  setText(t);
                  setNbCorpus("senseval");
                  setNbLemma("interest-n");
                  runNb(t, "interest-n");
                }}
              >
                {t.length > 40 ? t.slice(0, 38) + "…" : t}
                <small>{l}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Outputs */}
      <div id="wOut" aria-live="polite">
        {loading ? (
          <div
            className="skeleton"
            style={{ height: "110px", marginTop: "26px" }}
          />
        ) : method === "lesk" && leskData ? (
          leskData.error ? (
            <div className="empty" style={{ marginTop: "30px" }}>
              <b>{target}</b> için sözlükte kayıt yok.
              <br />
              <span style={{ fontSize: ".92rem" }}>
                Ekli biçimse <b>kök</b> alanına yalın hâlini yaz.
              </span>
            </div>
          ) : (
            <div className="entry" style={{ marginTop: "30px" }}>
              <div className="entry-head">
                <h2
                  className="headword"
                  style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
                >
                  {leskData.lemma}
                </h2>
                <div className="entry-meta">{leskData.n} aday anlam</div>
              </div>

              <p className="up" style={{ margin: "8px 0 0" }}>
                bağlam sözcükleri:{" "}
                {leskData.ctx?.join(" · ") || "—"}
              </p>

              {!leskData.best && (
                <div className="notice warn" style={{ marginTop: "12px" }}>
                  Bağlam sözcükleriyle hiçbir aday tanımı örtüşmedi; Lesk karar
                  veremedi (varsayılan: ilk aday). Bu yöntemin tipik sınırı:
                  ortak sözcük yoksa sinyal yok.
                </div>
              )}

              {leskData.results?.map((s: any) => {
                const isBest = s.id === leskData.best;
                const maxScore = Math.max(
                  ...leskData.results.map((r: any) => r.score),
                  0.0001
                );
                const frac = s.score / maxScore;

                return (
                  <div
                    key={s.id}
                    className={`cand ${isBest ? "best" : ""}`}
                  >
                    <div className="sense-line">
                      <span className="pos-l">
                        {(POS[s.pos] || s.pos).toLocaleLowerCase("tr")}
                      </span>
                      <span className="syn">
                        {s.lits?.slice(0, 5).map((l: any, idx: number) => (
                          <React.Fragment key={idx}>
                            {idx > 0 && <i>·</i>}
                            <button
                              onClick={() => openConcept(s.id, state.ds)}
                            >
                              {l.w}
                              {l.s > 0 && <sub>{l.s}</sub>}
                            </button>
                          </React.Fragment>
                        ))}
                      </span>
                      {isBest && <span className="badge">seçilen anlam</span>}
                    </div>

                    <p className="def">{s.def}</p>
                    {s.ex && s.ex.length > 0 && (
                      <p className="ex">{s.ex[0].t}</p>
                    )}

                    <div className="prob">
                      <span>skor {s.score.toFixed(2)}</span>
                      <div className="meter">
                        <i>
                          <b style={{ width: `${frac * 100}%` }} />
                        </i>
                      </div>
                      <span>
                        {s.overlap?.length > 0 && (
                          <>
                            ortak:{" "}
                            <b style={{ color: "var(--ink)" }}>
                              {s.overlap.join(" · ")}
                            </b>
                          </>
                        )}
                        {s.overlap_rel?.length > 0 && (
                          <> · ilişkili: {s.overlap_rel.join(" · ")}</>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : method === "nb" && nbData ? (
          nbData.error ? (
            <div className="empty" style={{ marginTop: "30px" }}>
              Hedef sözcük cümlede bulunamadı ya da veri yetersiz.
            </div>
          ) : (
            <div className="entry" style={{ marginTop: "30px" }}>
              <div className="entry-head">
                <h2 className="headword">{nbLemma}</h2>
                <div className="entry-meta">
                  {nbData.n} eğitim örneği · {nbData.k} olası anlam
                </div>
              </div>

              <div style={{ marginTop: "16px" }}>
                <h3 className="lbl">Sınıf Olasılıkları (Naive Bayes):</h3>
                {nbData.results?.map((r: any) => (
                  <div
                    key={r.label}
                    className={`cand ${
                      r.label === nbData.winner ? "best" : ""
                    }`}
                    style={{ margin: "10px 0" }}
                  >
                    <div className="sense-line">
                      <b>{r.label}</b>
                      {r.syn && (
                        <span className="syn">
                          <button
                            onClick={() => openConcept(r.syn.id, "en")}
                          >
                            {w1(r.syn)}
                          </button>
                        </span>
                      )}
                      {r.label === nbData.winner && (
                        <span className="badge">tahmin edilen anlam</span>
                      )}
                    </div>
                    {r.gloss && <p className="def">{r.gloss}</p>}
                    {r.syn?.def && <p className="def">{r.syn.def}</p>}

                    <div className="prob" style={{ marginTop: "8px" }}>
                      <span>p = {(r.p * 100).toFixed(1)}%</span>
                      <div className="meter">
                        <i>
                          <b style={{ width: `${r.p * 100}%` }} />
                        </i>
                      </div>
                      <span className="muted">
                        eğitimde {r.n} kez geçti
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {nbData.top && nbData.top.length > 0 && (
                <div style={{ marginTop: "20px" }}>
                  <h4 className="lbl">Ayırt Edici Özellikler (log-odds farkı):</h4>
                  <div className="chips" style={{ marginTop: "8px" }}>
                    {nbData.top.map((x: any, i: number) => (
                      <span key={i} className="chip">
                        {x.f} <small>{x.d > 0 ? `+${x.d}` : x.d}</small>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        ) : null}

        {evalData && (
          <div
            className="card-e"
            style={{
              marginTop: "24px",
              padding: "18px 24px",
              background: "var(--page)",
              borderRadius: "var(--r)",
              border: "1px solid var(--rule)",
            }}
          >
            <h3>5-Kat Çapraz Doğrulama Değerlendirmesi</h3>
            <p className="lesson-intro" style={{ margin: "6px 0 16px" }}>
              {nbLemma} için {evalData.n} örnekte test edildi ({evalData.k} farklı anlam).
            </p>
            <div className="ng-stats">
              <div>
                <b>{(evalData.nb * 100).toFixed(1)}%</b>
                <span>Naive Bayes doğruluğu</span>
              </div>
              <div>
                <b>{(evalData.mfs * 100).toFixed(1)}%</b>
                <span>Most Frequent Sense (MFS) tabanı</span>
              </div>
              {evalData.lesk != null && (
                <div>
                  <b>{(evalData.lesk * 100).toFixed(1)}%</b>
                  <span>Bilgi-tabanlı Lesk doğruluğu</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
