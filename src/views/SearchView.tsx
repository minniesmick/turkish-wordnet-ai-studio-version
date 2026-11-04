import React, { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "../context/AppContext";
import {
  api,
  POS,
  DSNAME,
  store,
  itemOf,
  toast,
  tr,
  lower,
  other,
  hl,
  sub,
  w1,
  FavItem,
} from "../lib/core";
import { Icon } from "../lib/icons";

const POS_ORDER: Record<string, number> = {
  n: 0,
  v: 1,
  a: 2,
  s: 2,
  b: 3,
  r: 4,
  p: 5,
  c: 6,
  i: 7,
};

const EX: Record<string, string[]> = {
  kenet: [
    "yüz",
    "çıkmak",
    "kalem",
    "el",
    "açmak",
    "kara",
    "göz",
    "at",
    "ağız",
  ],
  en: ["bank", "bat", "interest", "run", "dog", "spring"],
  "1998": ["kalem", "yüz", "göz"],
};

export const SearchView: React.FC = () => {
  const {
    state,
    updateSearchParams,
    openConcept,
    setView,
    act,
    refreshTrail,
  } = useApp();
  const sp = state.searchParams;

  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<Record<string, number>>({});
  const [lexf, setLexf] = useState<Record<string, number>>({});
  const [ms, setMs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isRandom, setIsRandom] = useState(false);

  const abortCtrlRef = useRef<AbortController | null>(null);

  const isEmpty =
    !sp.q && !sp.sense && !sp.pos.size && !sp.example && !sp.lex && !isRandom;

  const fetchSearch = useCallback(
    async (more = false) => {
      if (isEmpty) {
        setResults([]);
        setTotal(0);
        setFacets({});
        return;
      }

      if (abortCtrlRef.current) abortCtrlRef.current.abort();
      abortCtrlRef.current = new AbortController();

      setLoading(true);

      try {
        const offset = more ? results.length : 0;
        const res = await api(
          "/api/search",
          {
            ds: state.ds,
            q: sp.q,
            field: sp.field,
            mode: sp.mode,
            sense: sp.sense,
            pos: [...sp.pos].join(","),
            example: sp.example ? "1" : "0",
            fold: sp.fold ? "1" : "0",
            lex: sp.lex,
            offset,
            limit: 30,
          },
          abortCtrlRef.current.signal
        );

        setResults((prev) => (more ? [...prev, ...res.results] : res.results));
        setTotal(res.total);
        setFacets(res.facets || {});
        setLexf(res.lexf || {});
        setMs(res.ms || 0);
        setIsRandom(false);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error(err);
        }
      } finally {
        setLoading(false);
      }
    },
    [state.ds, sp, isEmpty, results.length]
  );

  useEffect(() => {
    fetchSearch();
  }, [state.ds, sp.q, sp.field, sp.mode, sp.sense, sp.pos, sp.example, sp.fold, sp.lex]);

  const handleRandom = async () => {
    setLoading(true);
    try {
      const j = await api("/api/random", { ds: state.ds, n: 10 });
      setResults(j.results || []);
      setTotal(j.results?.length || 0);
      setIsRandom(true);
      updateSearchParams({ q: "", focus: "" });
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFav = (s: any) => {
    const on = store.toggleFav(itemOf(state.ds, s));
    toast(on ? "Çalışma listesine eklendi" : "Listeden çıkarıldı");
    refreshTrail();
  };

  const activeFiltersCount =
    sp.pos.size +
    (sp.sense ? 1 : 0) +
    (sp.lex ? 1 : 0) +
    (sp.example ? 1 : 0) +
    (sp.fold ? 1 : 0);

  // Grouping
  const groupResults = () => {
    if (sp.field !== "word" || isRandom) {
      return [
        {
          head: null,
          items: results.map((s) => ({
            s,
            l: s.lits?.find((x: any) => x.m) || s.lits?.[0],
          })),
        },
      ];
    }
    const map = new Map<string, { head: string; items: any[] }>();
    for (const s of results) {
      const l = s.lits?.find((x: any) => x.m) || s.lits?.[0];
      const key = lower(l?.w || s.id);
      if (!map.has(key)) map.set(key, { head: l?.w || s.id, items: [] });
      map.get(key)!.items.push({ s, l });
    }
    for (const g of map.values()) {
      g.items.sort(
        (a, b) =>
          (POS_ORDER[a.s.pos] ?? 9) - (POS_ORDER[b.s.pos] ?? 9) ||
          (a.l?.s || 99) - (b.l?.s || 99)
      );
    }
    return [...map.values()];
  };

  const groups = groupResults();
  const rest = total - results.length;
  const flat = groups.length === 1 && !groups[0].head;
  const exampleChips = EX[state.ds] || EX.kenet;
  const hist = store.hist().slice(0, 5);
  const favs = store.favs().slice(0, 4);

  return (
    <div className="page">
      <div className="runhead">
        <span className="gw" id="gwL">
          {groups[0]?.head ? lower(groups[0].head) : ""}
        </span>
        <span className="mid" id="gwMid">
          {DSNAME[state.ds] || ""}
        </span>
        <span className="gw" id="gwR">
          {groups.length > 1 && groups[groups.length - 1]?.head
            ? lower(groups[groups.length - 1].head)
            : ""}
        </span>
      </div>

      <div className="row nowrap-sm" style={{ marginTop: "18px" }}>
        <label className="field" style={{ flex: 1 }}>
          <Icon name="search" />
          <input
            id="sq"
            type="text"
            placeholder="Sözcük, tanım ya da kimlik yaz…"
            autoComplete="off"
            spellCheck={false}
            aria-label="Sözlükte ara"
            value={sp.q}
            onChange={(e) => updateSearchParams({ q: e.target.value, focus: "" })}
          />
          {sp.q && (
            <button
              className="iconbtn"
              id="sClear"
              aria-label="Temizle"
              style={{ height: "28px", minWidth: "28px" }}
              onClick={() => updateSearchParams({ q: "", focus: "" })}
            >
              <Icon name="x" />
            </button>
          )}
        </label>
        <button
          className="btn"
          id="sRandom"
          title="Rastgele örnekler"
          onClick={handleRandom}
        >
          <Icon name="dice" />
          <span className="hide-sm">Rastgele</span>
        </button>
        <button
          className="btn"
          id="sFilt"
          aria-expanded={showFilters}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Icon name="filter" />
          <span>Süzgeçler</span>
          {activeFiltersCount > 0 && (
            <span
              className="chip"
              id="sFiltN"
              style={{ padding: "0 7px" }}
            >
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      <div className="tabs-u" id="sField">
        {["word", "def", "example", "id"].map((f) => (
          <button
            key={f}
            data-v={f}
            aria-pressed={sp.field === f}
            onClick={() => updateSearchParams({ field: f, focus: "" })}
          >
            {f === "word"
              ? "Kelime"
              : f === "def"
              ? "Tanım"
              : f === "example"
              ? "Örnek"
              : "ID"}
          </button>
        ))}
        {sp.field === "word" && (
          <span style={{ marginLeft: "auto" }}>
            <select
              className="sel"
              id="sMode"
              aria-label="Eşleşme türü"
              value={sp.mode}
              onChange={(e) => updateSearchParams({ mode: e.target.value })}
            >
              <option value="exact">Tam eşleşme</option>
              <option value="prefix">ile başlar</option>
              <option value="suffix">ile biter</option>
              <option value="contains">içerir</option>
              <option value="token">ifade içinde sözcük</option>
            </select>
          </span>
        )}
      </div>

      {showFilters && (
        <div className="filters" id="sFilters">
          <div className="fbar">
            <span className="lbl" style={{ width: "64px" }}>
              Tür
            </span>
            <div className="chips" id="sPos">
              {Object.entries(POS)
                .filter(([k]) => k !== "s")
                .map(([k, v]) => {
                  const active = sp.pos.has(k);
                  return (
                    <button
                      key={k}
                      className="chip"
                      aria-pressed={active}
                      onClick={() => {
                        const newPos = new Set(sp.pos);
                        if (active) newPos.delete(k);
                        else newPos.add(k);
                        updateSearchParams({ pos: newPos });
                      }}
                    >
                      {v}
                      {facets[k] != null && <small>{tr(facets[k])}</small>}
                    </button>
                  );
                })}
            </div>
          </div>
          <div className="fbar">
            <span className="lbl" style={{ width: "64px" }}>
              Anlam
            </span>
            <select
              className="sel"
              id="sSense"
              aria-label="Anlam numarası"
              value={sp.sense}
              onChange={(e) => updateSearchParams({ sense: e.target.value })}
            >
              <option value="">Tümü</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
              <option value="6+">6 ve üstü</option>
            </select>

            {state.ds === "en" && (
              <select
                className="sel"
                id="sLex"
                aria-label="Kategori"
                value={sp.lex}
                onChange={(e) => updateSearchParams({ lex: e.target.value })}
              >
                <option value="">Kategori: tümü</option>
                {Object.entries(lexf)
                  .sort((a, b) => b[1] - a[1])
                  .map(([k, n]) => (
                    <option key={k} value={k}>
                      {k} ({n})
                    </option>
                  ))}
              </select>
            )}

            <label className="chk">
              <input
                type="checkbox"
                id="sEx"
                checked={sp.example}
                onChange={(e) =>
                  updateSearchParams({ example: e.target.checked })
                }
              />
              Sadece örnek cümlesi olanlar
            </label>
            <label className="chk">
              <input
                type="checkbox"
                id="sFold"
                checked={sp.fold}
                onChange={(e) => updateSearchParams({ fold: e.target.checked })}
              />
              ç ğ ı ö ş ü farkını yok say
            </label>
          </div>
        </div>
      )}

      <div id="sOut" aria-live="polite">
        {isEmpty ? (
          <div className="guide-home">
            <h2>Bir sözcükle başla</h2>
            <p className="lesson-intro" style={{ margin: "6px 0 16px" }}>
              Çok anlamlı bir sözcük en iyi örnek:
            </p>
            <div className="big-chips">
              {exampleChips.map((w) => (
                <button
                  key={w}
                  onClick={() =>
                    updateSearchParams({
                      q: w,
                      field: "word",
                      mode: "exact",
                      focus: "",
                    })
                  }
                >
                  {w}
                </button>
              ))}
            </div>
            <ul className="guide-list">
              <li>
                <span className="k">Odak</span>
                <span>
                  Bir anlama tıkla: diğer anlamlar sönükleşir, sağda kâğıt açılır
                  ve o kavramın üst yolu, alt kavramları, ilişkileri ile karşıt
                  dildeki karşılığı görünür.
                </span>
              </li>
              <li>
                <span className="k">Harita</span>
                <span>
                  Kâğıttaki <b>Haritada aç</b> ile kavram, hiyerarşisi ve
                  bağlarıyla bir ağaç olarak açılır; bir düğüme tıklayınca nasıl
                  bağlı olduğu ve ne kadar yakın olduğu görünür.
                </span>
              </li>
              <li>
                <span className="k">Komut paleti</span>
                <span>
                  <span className="kbd">⌘K</span> ile her yerden sözcük,
                  çerçeve, roleset ve bölümlere atla.
                </span>
              </li>
              <li>
                <span className="k">Aynalı dikiş</span>
                <span>
                  Her anlamın sağ sütunu Türkçe ↔ İngilizce karşılığıdır;
                  tıklayınca öbür dile geçersin.
                </span>
              </li>
            </ul>
            {hist.length > 0 && (
              <>
                <h3 className="lbl" style={{ margin: "26px 0 6px" }}>
                  Son bakılanlar
                </h3>
                <div className="big-chips">
                  {hist.map((x) => (
                    <button
                      key={x.id}
                      onClick={() => openConcept(x.id, x.ds)}
                    >
                      {x.w}
                    </button>
                  ))}
                </div>
              </>
            )}
            {favs.length > 0 && (
              <>
                <h3 className="lbl" style={{ margin: "22px 0 6px" }}>
                  Çalışma listemden
                </h3>
                <div className="big-chips">
                  {favs.map((x) => (
                    <button
                      key={x.id}
                      onClick={() => openConcept(x.id, x.ds)}
                    >
                      {x.w}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : loading && results.length === 0 ? (
          <div className="entry">
            <div className="skeleton" style={{ height: "64px", width: "38%" }} />
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="skeleton"
                style={{ height: "70px", marginTop: "18px" }}
              />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="empty">
            Sonuç bulunamadı.
            <br />
            <span style={{ fontSize: ".92rem" }}>
              Eşleşme türünü “içerir” yap ya da <b>ç ğ ı ö ş ü</b> farkını yok
              say.
            </span>
          </div>
        ) : (
          <>
            {isRandom && (
              <p className="lesson-intro" style={{ marginTop: "28px" }}>
                Rastgele örnekler
              </p>
            )}
            {groups.map((g, gi) => {
              const counts: Record<string, number> = {};
              g.items.forEach(
                (x) => (counts[x.s.pos] = (counts[x.s.pos] || 0) + 1)
              );
              const meta = `${g.items.length} anlam${
                Object.keys(counts).length > 0 && g.head
                  ? ` · ${Object.entries(counts)
                      .map(
                        ([k, n]) =>
                          `${n} ${(POS[k] || k).toLocaleLowerCase("tr")}`
                      )
                      .join(", ")}`
                  : ""
              }`;

              return (
                <article key={gi} className="entry">
                  {g.head ? (
                    <div className="entry-head">
                      <h2 className="headword">{g.head}</h2>
                      <div className="entry-meta">{meta}</div>
                    </div>
                  ) : (
                    <div
                      className="entry-head"
                      style={{ borderBottomWidth: "1px" }}
                    >
                      <span className="lbl">
                        {tr(total)} sonuç · {ms} ms
                      </span>
                    </div>
                  )}

                  <div className="seam-head">
                    <span>Anlamlar</span>
                    <span>
                      {state.ds === "kenet"
                        ? "İngilizce karşılık"
                        : state.ds === "en"
                        ? "Türkçe karşılık"
                        : ""}
                    </span>
                  </div>

                  <ol
                    className={`senses ${sp.focus ? "has-focus" : ""}`}
                  >
                    {g.items.map(({ s, l }, i) => {
                      const isFocused = sp.focus === s.id;
                      const isFav = store.isFav(s.id);
                      const num = l?.s > 0 ? l.s : i + 1;
                      const xds = other(state.ds);
                      const xlab = state.ds === "kenet" ? "EN" : "TR";

                      return (
                        <li
                          key={s.id}
                          className={`sense ${isFocused ? "is-focus" : ""}`}
                          data-id={s.id}
                        >
                          <button
                            className="hit-area"
                            aria-label={`Bu anlamı odakla: ${w1(s)}`}
                            onClick={() => {
                              if (isFocused) {
                                updateSearchParams({ focus: "" });
                              } else {
                                updateSearchParams({ focus: s.id });
                                openConcept(s.id, state.ds);
                              }
                            }}
                          />
                          <span className="num" aria-hidden="true">
                            {num}
                          </span>
                          <div className="sense-main">
                            <div className="sense-line">
                              {flat && (
                                <b
                                  style={{
                                    font: "800 1.25rem var(--font-ui)",
                                    letterSpacing: "-.02em",
                                  }}
                                >
                                  {l?.w}
                                </b>
                              )}
                              <span className="pos-l">
                                {(POS[s.pos] || s.pos).toLocaleLowerCase(
                                  "tr"
                                )}
                              </span>
                              {s.lx && (
                                <span className="lex-l">{s.lx}</span>
                              )}
                              {(s.lits.length > 1 || flat) && (
                                <span className="syn">
                                  {s.lits.map((x: any, xi: number) => (
                                    <React.Fragment key={xi}>
                                      {xi > 0 && <i>·</i>}
                                      <button
                                        className={x.m ? "hit" : ""}
                                        title={`Bu sözcüğü ara${
                                          x.c
                                            ? " · SemCor etiket sayısı: " + x.c
                                            : ""
                                        }`}
                                        onClick={() =>
                                          updateSearchParams({
                                            q: x.w,
                                            field: "word",
                                            mode: "exact",
                                            focus: "",
                                          })
                                        }
                                        dangerouslySetInnerHTML={{
                                          __html:
                                            (x.m
                                              ? hl(x.w, [x.m])
                                              : x.w) + sub(x.s),
                                        }}
                                      />
                                    </React.Fragment>
                                  ))}
                                </span>
                              )}
                            </div>

                            <p
                              className="def"
                              dangerouslySetInnerHTML={{
                                __html: hl(s.def, s.dm),
                              }}
                            />

                            {s.h && s.h.length > 0 && (
                              <div className="up">
                                <Icon name="arrowup" />
                                {s.h.join(" / ")}
                              </div>
                            )}

                            {s.vf && s.vf.length > 0 && (
                              <div className="up">
                                kalıp: {s.vf.join(" · ")}
                              </div>
                            )}

                            {s.ex?.map((e: any, ei: number) => (
                              <p
                                key={ei}
                                className="ex"
                                dangerouslySetInnerHTML={{
                                  __html: hl(e.t || e, e.m),
                                }}
                              />
                            ))}

                            <div className="sense-acts">
                              {s.pb && (
                                <button
                                  className="srlbtn"
                                  title="TRopBank: bu fiilin argüman rolleri"
                                  onClick={() =>
                                    setView("roles", {
                                      roles: {
                                        sub: "dict",
                                        lang: "tr",
                                        field: "id",
                                        q: s.id,
                                      },
                                    })
                                  }
                                >
                                  ROLLER
                                </button>
                              )}
                              {s.fr?.map((n: string) => (
                                <button
                                  key={n}
                                  className="frm"
                                  title="Türkçe FrameNet çerçevesi"
                                  onClick={() => act({ act: "fn", name: n })}
                                >
                                  {n}
                                </button>
                              ))}
                              <button
                                className="btn sm ghost"
                                title="Haritada aç (m)"
                                onClick={() =>
                                  setView("graph", {
                                    graph: { id: s.id, ds: state.ds },
                                  })
                                }
                              >
                                <Icon name="graph" />
                                Harita
                              </button>
                              <button
                                className="iconbtn"
                                aria-pressed={isFav}
                                aria-label="Favori"
                                title="Favori (f)"
                                style={{ height: "30px" }}
                                onClick={() => handleToggleFav(s)}
                              >
                                <Icon name="star" />
                              </button>
                            </div>
                          </div>

                          <div className="seam">
                            {s.x && s.x.length > 0 ? (
                              <>
                                {s.x.map((c: any) => (
                                  <button
                                    key={c.id}
                                    className="xw"
                                    title={c.id}
                                    onClick={() => openConcept(c.id, xds)}
                                  >
                                    <span className="lg">{xlab}</span>
                                    {c.w.join(", ")}
                                  </button>
                                ))}
                                {s.xn > s.x.length && (
                                  <span className="xw more">
                                    +{s.xn - s.x.length} karşılık
                                  </span>
                                )}
                              </>
                            ) : state.ds === "1998" ? null : (
                              <span className="none">karşılık yok</span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </article>
              );
            })}

            {rest > 0 && (
              <div className="more-row">
                <button
                  className="btn"
                  id="sMore"
                  onClick={() => fetchSearch(true)}
                  disabled={loading}
                >
                  {loading
                    ? "Yükleniyor…"
                    : `Daha fazla göster · ${tr(rest)} kaldı`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
