import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import {
  api,
  FUNC,
  CASEL,
  esc,
  tr,
} from "../lib/core";
import { Icon } from "../lib/icons";

const SL_EX = [
  "Ahmet kapıyı açtı.",
  "Çocuk topu arkadaşına attı.",
  "Ali İstanbul'a otobüsle gitti.",
  "Öğretmen öğrencilere kitabı verdi.",
  "Babam kadına yaklaştı.",
];

const EXAMPLES: Record<string, string[]> = {
  en: ["agree", "break", "fall", "give", "say", "take", "run"],
  tr: ["açmak", "vermek", "gitmek", "kırmak", "yazmak", "almak", "bakmak"],
  vn: ["agree", "break", "give", "hit", "run"],
};

const FIELDS: Record<string, [string, string][]> = {
  en: [
    ["lemma", "Fiil (lemma)"],
    ["name", "Roleset adı"],
    ["role", "Rol tanımı"],
    ["fn", "FrameNet çerçevesi"],
    ["vn", "VerbNet sınıfı"],
    ["id", "Roleset ID"],
  ],
  tr: [
    ["verb", "Fiil"],
    ["role", "Rol tanımı"],
    ["def", "Synset tanımı"],
    ["id", "Synset ID"],
  ],
  vn: [
    ["member", "Fiil (üye)"],
    ["class", "Sınıf ID"],
    ["role", "Tematik rol"],
    ["pred", "Anlam yüklemi"],
    ["pb", "PropBank roleset"],
    ["frame", "Sözdizimi kalıbı"],
  ],
};

export const RolesView: React.FC = () => {
  const { state, updateRolesParams, openConcept, act } = useApp();
  const rp = state.rolesParams;

  const [subTab, setSubTab] = useState<"dict" | "label" | "quiz">(
    rp.sub || "dict"
  );
  const [lang, setLang] = useState<"en" | "tr" | "vn">(rp.lang || "en");
  const [q, setQ] = useState(rp.q || "");
  const [field, setField] = useState(rp.field || "lemma");
  const [mode, setMode] = useState(rp.mode || "exact");
  const [func, setFunc] = useState(rp.func || "");
  const [cs, setCs] = useState(rp.cs || "");
  const [fnOnly, setFnOnly] = useState(rp.fn);

  // Dict results
  const [dictResults, setDictResults] = useState<any[]>([]);
  const [dictTotal, setDictTotal] = useState(0);
  const [facets, setFacets] = useState<any>({});
  const [loading, setLoading] = useState(false);

  // Labeler
  const [labelText, setLabelText] = useState(rp.text || "Ahmet kapıyı açtı.");
  const [labelResult, setLabelResult] = useState<any>(null);
  const [selectedCand, setSelectedCand] = useState(0);
  const [caseOverrides, setCaseOverrides] = useState<Record<string, string>>({});

  // Quiz
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState<number | null>(null);

  useEffect(() => {
    if (subTab === "dict") {
      runDict();
    } else if (subTab === "label") {
      runSrl();
    }
  }, [subTab, lang, q, field, mode, func, cs, fnOnly]);

  const runDict = async (more = false) => {
    if (!q && !func && !cs && !fnOnly) {
      setDictResults([]);
      setDictTotal(0);
      return;
    }
    setLoading(true);
    updateRolesParams({
      sub: "dict",
      lang,
      q,
      field,
      mode,
      func,
      cs,
      fn: fnOnly,
    });

    try {
      const endpoint = lang === "vn" ? "/api/vn" : "/api/pb";
      const res = await api(endpoint, {
        lang,
        q,
        field,
        mode,
        func,
        case: cs,
        fn: fnOnly ? 1 : 0,
        fold: 1,
        offset: more ? dictResults.length : 0,
        limit: 30,
      });

      setDictResults((prev) => (more ? [...prev, ...res.results] : res.results));
      setDictTotal(res.total);
      setFacets(res.facets || {});
    } catch (_) {
      setDictResults([]);
    } finally {
      setLoading(false);
    }
  };

  const runSrl = async (textToRun = labelText, predIndex = rp.pred) => {
    if (!textToRun.trim()) return;
    setLoading(true);
    updateRolesParams({ sub: "label", text: textToRun, pred: predIndex });

    const overrideStr = Object.entries(caseOverrides)
      .map(([k, v]) => `${k}:${v}`)
      .join(",");

    try {
      const res = await api("/api/srl", {
        text: textToRun,
        pred: predIndex,
        cases: overrideStr,
      });
      setLabelResult(res);
      setSelectedCand(0);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = async () => {
    setLoading(true);
    try {
      const res = await api("/api/pbquiz", { n: 5 });
      setQuizQuestions(res.questions || []);
      setQuizIndex(0);
      setQuizScore(0);
      setQuizAnswered(null);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  const handleQuizAnswer = (k: number) => {
    if (quizAnswered !== null) return;
    setQuizAnswered(k);
    if (k === quizQuestions[quizIndex].answer) {
      setQuizScore((s) => s + 1);
    }
  };

  const fields = FIELDS[lang] || FIELDS.en;

  return (
    <div className="page">
      <h1 className="page-title">Fiil kimin neyle ne yaptığını söyler</h1>

      <div className="row roles-switches">
        <div className="seg" id="rSub" role="group" aria-label="Rol aracı">
          <button
            data-v="dict"
            aria-pressed={subTab === "dict"}
            onClick={() => {
              setSubTab("dict");
              updateRolesParams({ sub: "dict" });
            }}
          >
            Çerçeve sözlüğü
          </button>
          <button
            data-v="label"
            aria-pressed={subTab === "label"}
            onClick={() => {
              setSubTab("label");
              updateRolesParams({ sub: "label" });
            }}
          >
            Cümle etiketle · TR
          </button>
          <button
            data-v="quiz"
            className="stu"
            aria-pressed={subTab === "quiz"}
            onClick={() => {
              setSubTab("quiz");
              updateRolesParams({ sub: "quiz" });
            }}
          >
            Rol sınavı · EN
          </button>
        </div>

        {subTab === "dict" && (
          <div className="seg" id="rLang" role="group" aria-label="Rol kaynağı">
            <button
              data-v="en"
              aria-pressed={lang === "en"}
              onClick={() => {
                setLang("en");
                setField(FIELDS.en[0][0]);
              }}
            >
              English PropBank
            </button>
            <button
              data-v="tr"
              aria-pressed={lang === "tr"}
              onClick={() => {
                setLang("tr");
                setField(FIELDS.tr[0][0]);
              }}
            >
              Türkçe PropBank
            </button>
            <button
              data-v="vn"
              aria-pressed={lang === "vn"}
              onClick={() => {
                setLang("vn");
                setField(FIELDS.vn[0][0]);
              }}
            >
              VerbNet 3.3
            </button>
          </div>
        )}
      </div>

      {/* DICTIONARY TAB */}
      {subTab === "dict" && (
        <div id="rDict">
          <div className="row" style={{ marginTop: "18px" }}>
            <label className="field" style={{ flex: 1, minWidth: "240px" }}>
              <Icon name="search" />
              <input
                id="pbq"
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder={
                  lang === "en"
                    ? "Fiil, rol ya da çerçeve ara · örn. agree, break"
                    : lang === "tr"
                    ? "Fiil ara · örn. açmak, vermek"
                    : "Fiil, sınıf ya da rol ara · örn. break, agree"
                }
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <select
              className="sel"
              id="pbField"
              value={field}
              onChange={(e) => setField(e.target.value)}
            >
              {fields.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <select
              className="sel"
              id="pbMode"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="exact">Tam eşleşme</option>
              <option value="prefix">ile başlar</option>
              <option value="suffix">ile biter</option>
              <option value="contains">içerir</option>
            </select>
          </div>

          <div className="filters" id="pbFilters">
            {lang === "en" && (
              <div className="fbar">
                <label className="chk">
                  <input
                    type="checkbox"
                    id="pbFn"
                    checked={fnOnly}
                    onChange={(e) => setFnOnly(e.target.checked)}
                  />
                  Sadece FrameNet bağlantısı olanlar
                </label>
              </div>
            )}

            {lang !== "vn" && (
              <div className="fbar">
                <span className="lbl" style={{ width: "64px" }}>
                  İşlev
                </span>
                <div className="chips" id="pbFunc">
                  {["pag", "ppt", "gol", "dir", "loc", "src", "com", "tmp"].map(
                    (k) => (
                      <button
                        key={k}
                        className="chip"
                        aria-pressed={func === k}
                        title={FUNC[k] || ""}
                        onClick={() => setFunc(func === k ? "" : k)}
                      >
                        {k}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {lang === "tr" && (
              <div className="fbar">
                <span className="lbl" style={{ width: "64px" }}>
                  Durum eki
                </span>
                <div className="chips" id="pbCase">
                  {["nom", "acc", "dat", "abl", "loc", "ins", "gen"].map((k) => (
                    <button
                      key={k}
                      className="chip"
                      aria-pressed={cs === k}
                      onClick={() => setCs(cs === k ? "" : k)}
                    >
                      {CASEL[k]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div id="pbOut">
            {!q && !func && !cs && !fnOnly ? (
              <div className="guide-home">
                <h2>Örnek fiiller</h2>
                <div className="big-chips" style={{ marginTop: "12px" }}>
                  {EXAMPLES[lang].map((w) => (
                    <button
                      key={w}
                      onClick={() => {
                        setQ(w);
                        setField(
                          lang === "en"
                            ? "lemma"
                            : lang === "tr"
                            ? "verb"
                            : "member"
                        );
                      }}
                    >
                      {w}
                    </button>
                  ))}
                </div>
                <p className="lesson-intro" style={{ marginTop: "20px" }}>
                  {lang === "vn"
                    ? "VerbNet fiilleri sınıflara ayırır; her sınıfın tematik rolleri, üyeleri, sözdizimi çerçeveleri ve anlam yüklemleri var."
                    : lang === "en"
                    ? "Her roleset bir fiil anlamıdır; ARG0–ARG5 argümanları fiile özgü, işlev etiketleri (pag, ppt…) genel rol türleridir."
                    : "Her fiil synset'inin argümanları anlamsal işlevi ve Türkçe durum ekleriyle birlikte."}
                </p>
              </div>
            ) : loading && dictResults.length === 0 ? (
              <div
                className="skeleton"
                style={{ height: "140px", marginTop: "20px" }}
              />
            ) : dictResults.length === 0 ? (
              <div className="empty" style={{ marginTop: "24px" }}>
                Sonuç bulunamadı.
              </div>
            ) : (
              <div style={{ marginTop: "20px" }}>
                <div className="entry-head" style={{ borderBottomWidth: "1px" }}>
                  <span className="lbl">
                    {tr(dictTotal)} {lang === "vn" ? "sınıf" : "roleset"}
                  </span>
                </div>

                {dictResults.map((r, i) => (
                  <article
                    key={r.id || i}
                    className="card-e"
                    style={{ margin: "16px 0" }}
                  >
                    <div className="entry-head">
                      <h3 style={{ fontSize: "1.4rem" }}>
                        <b>{r.lemma || r.id}</b>
                        {r.name && <small> · {r.name}</small>}
                      </h3>
                      {r.id && (
                        <button
                          className="tag"
                          style={{ marginLeft: "auto" }}
                          onClick={() => openConcept(r.id, "kenet")}
                        >
                          {r.id}
                        </button>
                      )}
                    </div>

                    {r.def && <p className="def">{r.def}</p>}

                    {/* Roles Table */}
                    {r.args && r.args.length > 0 && (
                      <table className="argtbl" style={{ marginTop: "12px" }}>
                        <thead>
                          <tr>
                            <th>Rol</th>
                            <th>İşlev</th>
                            <th>Açıklama</th>
                            {lang === "tr" && <th>Durum eki</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {r.args.map((a: any, ai: number) => (
                            <tr key={ai}>
                              <td>
                                <span className="rl-a u1">{a.n}</span>
                              </td>
                              <td>
                                <span className="tag">{a.f}</span>{" "}
                                <span className="vt">{FUNC[a.f] || ""}</span>
                              </td>
                              <td>{a.d}</td>
                              {lang === "tr" && (
                                <td>
                                  {(a.c || []).map((c: string) => (
                                    <span key={c} className="tag">
                                      {CASEL[c] || c}
                                    </span>
                                  )) || "—"}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {/* VerbNet specifics */}
                    {lang === "vn" && (
                      <div style={{ marginTop: "12px" }}>
                        {r.roles && (
                          <div className="chips">
                            <span className="muted">Roller:</span>
                            {r.roles.map((ro: any, ri: number) => (
                              <span key={ri} className="tag">
                                {ro.t}
                              </span>
                            ))}
                          </div>
                        )}
                        {r.members && (
                          <div className="chips" style={{ marginTop: "8px" }}>
                            <span className="muted">Üyeler:</span>
                            {r.members.slice(0, 16).map((m: any, mi: number) => (
                              <button
                                key={mi}
                                className="chip"
                                onClick={() => setQ(m.n)}
                              >
                                {m.n}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* LABELER TAB */}
      {subTab === "label" && (
        <div id="rLabel">
          <p className="lesson-intro" style={{ margin: "16px 0 0" }}>
            Yüklemi bulur, TRopBank çerçevelerinden aday anlamlar çıkarır ve durum
            eklerine bakarak ARG0, ARG1'i yerleştirir.
          </p>

          <div className="row" style={{ marginTop: "16px" }}>
            <label className="field" style={{ flex: 1 }}>
              <Icon name="search" />
              <input
                id="slText"
                type="text"
                placeholder="Bir Türkçe cümle yaz…"
                autoComplete="off"
                spellCheck={false}
                value={labelText}
                onChange={(e) => setLabelText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSrl(labelText)}
              />
            </label>
            <button
              className="btn pri"
              id="slGo"
              style={{ height: "46px" }}
              onClick={() => runSrl(labelText)}
            >
              Etiketle
            </button>
          </div>

          <div className="chips" id="slEx" style={{ marginTop: "12px" }}>
            {SL_EX.map((s, idx) => (
              <button
                key={idx}
                className="chip"
                onClick={() => {
                  setLabelText(s);
                  runSrl(s);
                }}
              >
                {s}
              </button>
            ))}
          </div>

          <div id="slOut">
            {labelResult && labelResult.toks && (
              <div className="entry" style={{ marginTop: "24px" }}>
                <h3 className="lbl">Anotasyonlu Cümle:</h3>
                <div
                  className="card-e"
                  style={{
                    padding: "16px 20px",
                    fontSize: "1.2rem",
                    lineHeight: 2,
                    margin: "12px 0",
                  }}
                >
                  {labelResult.toks.map((t: any, i: number) => {
                    const isPred = i === labelResult.pred;
                    const assignedArg =
                      labelResult.cands?.[selectedCand]?.assign?.[i];

                    return (
                      <span key={i} style={{ marginRight: "10px" }}>
                        {assignedArg ? (
                          <span
                            className="rl-a u1"
                            title={`Argüman: ${assignedArg}`}
                          >
                            {t.w} <sub>{assignedArg}</sub>
                          </span>
                        ) : isPred ? (
                          <span
                            className="rl-p"
                            style={{
                              background: "var(--wash-2)",
                              padding: "2px 6px",
                              borderRadius: "var(--r-sm)",
                              fontWeight: "700",
                            }}
                          >
                            {t.w} <sub>YÜKLEM</sub>
                          </span>
                        ) : (
                          t.w
                        )}
                      </span>
                    );
                  })}
                </div>

                {/* Candidate senses */}
                {labelResult.cands && labelResult.cands.length > 0 && (
                  <div style={{ marginTop: "20px" }}>
                    <h4 className="lbl">Aday TRopBank Çerçeveleri:</h4>
                    {labelResult.cands.map((c: any, ci: number) => (
                      <div
                        key={ci}
                        className={`card-e ${
                          ci === selectedCand ? "selected" : ""
                        }`}
                        style={{
                          margin: "10px 0",
                          border:
                            ci === selectedCand
                              ? "2px solid var(--spot)"
                              : "1px solid var(--rule)",
                          cursor: "pointer",
                        }}
                        onClick={() => setSelectedCand(ci)}
                      >
                        <div className="entry-head">
                          <b>{c.verb || c.id}</b>
                          {c.def && <small> · {c.def}</small>}
                          <button
                            className="tag"
                            style={{ marginLeft: "auto" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              openConcept(c.id, "kenet");
                            }}
                          >
                            {c.id}
                          </button>
                        </div>

                        {c.args && (
                          <table
                            className="argtbl"
                            style={{ marginTop: "10px" }}
                          >
                            <thead>
                              <tr>
                                <th>Rol</th>
                                <th>İşlev</th>
                                <th>Açıklama</th>
                                <th>Cümledeki Öğe</th>
                              </tr>
                            </thead>
                            <tbody>
                              {c.args.map((a: any, ai: number) => (
                                <tr key={ai}>
                                  <td>
                                    <span className="rl-a u1">{a.n}</span>
                                  </td>
                                  <td>{a.f}</td>
                                  <td>{a.d}</td>
                                  <td>
                                    <b>
                                      {c.assign?.[a.n] != null
                                        ? labelResult.toks[c.assign[a.n]]?.w
                                        : "—"}
                                    </b>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* QUIZ TAB */}
      {subTab === "quiz" && (
        <div id="rQuiz">
          <p className="lesson-intro" style={{ margin: "16px 0 14px" }}>
            PropBank'in altın anotasyonlu örnek cümlelerinden: işaretli öbek
            hangi argüman rolünü taşıyor?
          </p>

          <button className="btn pri" id="pqGo" onClick={startQuiz}>
            Başlat · 5 soru
          </button>

          <div id="pqOut" style={{ marginTop: "20px" }}>
            {quizQuestions.length > 0 && quizIndex < quizQuestions.length ? (
              (() => {
                const q = quizQuestions[quizIndex];
                return (
                  <div className="card-e" style={{ padding: "20px" }}>
                    <div className="entry-head">
                      <span className="lbl">
                        Soru {quizIndex + 1} / {quizQuestions.length}
                      </span>
                      <span className="muted" style={{ marginLeft: "auto" }}>
                        Puan: {quizScore}
                      </span>
                    </div>

                    <p
                      style={{
                        fontSize: "1.2rem",
                        lineHeight: 1.8,
                        margin: "16px 0",
                      }}
                      dangerouslySetInnerHTML={{ __html: q.text }}
                    />

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      {q.options.map((opt: any, oi: number) => {
                        const isChosen = quizAnswered === oi;
                        const isCorrect = oi === q.answer;
                        let btnClass = "btn";
                        if (quizAnswered !== null) {
                          if (isCorrect) btnClass += " pri";
                          else if (isChosen) btnClass += " ghost";
                        }
                        return (
                          <button
                            key={oi}
                            className={btnClass}
                            style={{ textAlign: "left", justifyContent: "flex-start" }}
                            onClick={() => handleQuizAnswer(oi)}
                          >
                            <b>{opt.label}</b>: {opt.desc}
                          </button>
                        );
                      })}
                    </div>

                    {quizAnswered !== null && (
                      <div style={{ marginTop: "16px" }}>
                        <button
                          className="btn pri"
                          id="pqNext"
                          onClick={() => {
                            setQuizIndex((idx) => idx + 1);
                            setQuizAnswered(null);
                          }}
                        >
                          Sonraki soru
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : quizQuestions.length > 0 && quizIndex >= quizQuestions.length ? (
              <div className="card-e" style={{ padding: "24px" }}>
                <h2>Sınav Tamamlandı!</h2>
                <p style={{ fontSize: "1.1rem", margin: "12px 0" }}>
                  Skorunuz: <b>{quizScore}</b> / {quizQuestions.length}
                </p>
                <button className="btn pri" onClick={startQuiz}>
                  Yeniden dene
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
