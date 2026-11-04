import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import {
  api,
  store,
  itemOf,
  toast,
  copyText,
  POS,
  DSNAME,
  REL_ORDER,
  relLabel,
  FAMILY,
  REL_FAMILY,
  FUNC,
  CASEL,
  tr,
  w1,
  esc,
} from "../lib/core";
import { Icon } from "../lib/icons";

export const ConceptSheet: React.FC = () => {
  const { state, closeConcept, openConcept, setView, act, refreshTrail } = useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [stack, setStack] = useState<{ id: string; ds: string; w: string }[]>([]);

  const conceptId = state.sheet.id;
  const ds = state.sheet.ds || state.ds;

  useEffect(() => {
    if (!state.sheet.open || !conceptId) {
      setData(null);
      return;
    }

    let active = true;
    setLoading(true);

    api("/api/synset", { ds, id: conceptId })
      .then((d) => {
        if (!active) return;
        setLoading(false);
        if (d && !d.error) {
          setData(d);
          store.addHist(itemOf(ds, d.self));
          refreshTrail();
          setNote(store.note(d.self.id));

          setStack((prev) => {
            if (prev.some((x) => x.id === d.self.id)) {
              const idx = prev.findIndex((x) => x.id === d.self.id);
              return prev.slice(0, idx + 1);
            }
            const item = { id: d.self.id, ds, w: w1(d.self) };
            if (prev.length >= 6) return [...prev.slice(1), item];
            return [...prev, item];
          });
        } else {
          setData({ error: "Bu kavram bulunamadı." });
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [conceptId, ds, state.sheet.open]);

  if (!state.sheet.open) return null;

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNote(val);
    if (data?.self) {
      store.setNote(data.self.id, val);
    }
  };

  const handleToggleFav = () => {
    if (!data?.self) return;
    const isFavNow = store.toggleFav(itemOf(ds, data.self));
    toast(isFavNow ? "Çalışma listesine eklendi" : "Listeden çıkarıldı");
    refreshTrail();
  };

  const s = data?.self;
  const isFav = s ? store.isFav(s.id) : false;
  const head = s?.lits?.[0];

  const rels = (data?.rels || [])
    .slice()
    .sort(
      (a: any, b: any) =>
        REL_ORDER.indexOf(a.type) - REL_ORDER.indexOf(b.type)
    );

  const renderMiniMap = () => {
    if (!data) return null;
    const par = data.paths?.[0]?.slice(-1)[0];
    const kids = (data.rels || [])
      .filter((r: any) => r.type === "HYPONYM" || r.type === "INSTANCE_HYPONYM")
      .flatMap((r: any) => r.items)
      .slice(0, 3);
    const x = data.cross?.[0];
    if (!par && !kids.length && !x) return null;

    const cut = (b: any, n = 15) => {
      const t = b?.lits?.[0]?.w || b?.id || "";
      return t.length > n ? t.slice(0, n - 1) + "…" : t;
    };

    const W = 360;
    const H = kids.length ? 172 : 118;
    const kx =
      kids.length === 3 ? [62, 180, 298] : kids.length === 2 ? [110, 250] : [180];

    return (
      <div className="ss">
        <h3>
          Yakın çevre{" "}
          <em>
            {par ? "1 üst" : ""}
            {kids.length ? ` · ${kids.length} alt` : ""}
            {x ? " · karşılık" : ""}
          </em>
        </h3>
        <svg
          className="mm"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Kavramın yakın çevresi"
        >
          {par && <path d="M180 37V73" />}
          {kids.map((_: any, i: number) => (
            <path key={i} d={`M180 103V128H${kx[i]}V139`} />
          ))}
          {x && <path className="xl" d="M240 88H250" />}
          {par && (
            <g
              className="n"
              style={{ cursor: "pointer" }}
              onClick={() => openConcept(par.id, ds)}
            >
              <title>{par.d || ""}</title>
              <rect
                x={180 - 62}
                y={22 - 15}
                width={124}
                height={30}
                rx={5}
              />
              <text x={180} y={22 + 4} textAnchor="middle">
                {cut(par)}
              </text>
            </g>
          )}
          <g className="n c">
            <rect x={120} y={73} width={120} height={30} rx={5} />
            <text x={180} y={92} textAnchor="middle">
              {cut(s, 14)}
            </text>
          </g>
          {kids.map((k: any, i: number) => (
            <g
              key={k.id}
              className="n"
              style={{ cursor: "pointer" }}
              onClick={() => openConcept(k.id, ds)}
            >
              <title>{k.d || ""}</title>
              <rect
                x={kx[i] - 54}
                y={154 - 15}
                width={108}
                height={30}
                rx={5}
              />
              <text x={kx[i]} y={154 + 4} textAnchor="middle">
                {cut(k)}
              </text>
            </g>
          ))}
          {x && (
            <g
              className="n x"
              style={{ cursor: "pointer" }}
              onClick={() => openConcept(x.id, data.cross_ds)}
            >
              <title>{x.d || ""}</title>
              <rect
                x={306 - 54}
                y={88 - 15}
                width={108}
                height={30}
                rx={5}
              />
              <text x={306} y={88 + 4} textAnchor="middle">
                {cut(x)}
              </text>
            </g>
          )}
        </svg>
        <div style={{ marginTop: "6px" }}>
          <button
            className="toggler"
            onClick={() => {
              setView("graph", { graph: { id: s.id, ds } });
            }}
          >
            haritada aç
          </button>
        </div>
      </div>
    );
  };

  return (
    <aside className="sheet" id="sheet" aria-label="Kavram kâğıdı" aria-hidden="false">
      <div className="sheet-head">
        <div className="sheet-top">
          <button
            className="iconbtn"
            aria-label="Kâğıdı kapat"
            title="Kapat (Esc)"
            onClick={closeConcept}
          >
            <Icon name="x" />
          </button>
          <span className="spacer" />
          {s && (
            <>
              <button
                className="iconbtn"
                aria-pressed={isFav}
                aria-label="Çalışma listesine ekle"
                title="Favori (F)"
                onClick={handleToggleFav}
              >
                <Icon name="star" />
              </button>
              <button
                className="iconbtn"
                aria-label="Bağlantıyı kopyala"
                title="Bağlantıyı kopyala"
                onClick={() =>
                  copyText(window.location.href, "Bağlantı kopyalandı")
                }
              >
                <Icon name="link" />
              </button>
            </>
          )}
        </div>

        {stack.length > 1 && (
          <div className="stack" aria-label="Önceki kavramlar">
            {stack.slice(0, -1).map((x) => (
              <button
                key={x.id}
                title={x.w}
                onClick={() => openConcept(x.id, x.ds)}
              >
                {x.w}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="skeleton" style={{ height: "34px", width: "60%" }} />
        ) : data?.error ? (
          <div className="empty">{data.error}</div>
        ) : s ? (
          <>
            <div className="sheet-title">
              <h2>
                {head.w}
                {head.s > 0 && <sub>{head.s}</sub>}
              </h2>
              <span className="pos-l">
                {(POS[s.pos] || s.pos).toLocaleLowerCase("tr")}
              </span>
              <span className="muted" style={{ fontSize: ".8rem" }}>
                {DSNAME[ds] || ds}
              </span>
            </div>
            <div className="row">
              <button
                className="btn pri sm"
                onClick={() => setView("graph", { graph: { id: s.id, ds } })}
              >
                <Icon name="graph" />
                Haritada aç
              </button>
              <button
                className="btn sm"
                onClick={() =>
                  setView("relate", {
                    ds,
                    relate: { a: head.w, b: "" },
                  })
                }
              >
                <Icon name="scale" />
                Karşılaştır
              </button>
              <button
                className="btn sm ghost"
                aria-label="Sözcüğü ara"
                title="Sözcüğü ara"
                onClick={() =>
                  setView("search", {
                    ds,
                    search: { q: head.w, field: "word", mode: "exact" },
                  })
                }
              >
                <Icon name="search" />
                <span className="hide-sm">Sözcüğü ara</span>
              </button>
            </div>
          </>
        ) : null}
      </div>

      <div className="sheet-body">
        {loading ? (
          <div>
            <div
              className="skeleton"
              style={{ height: "18px", margin: "18px 0 10px" }}
            />
            <div className="skeleton" style={{ height: "18px", width: "80%" }} />
            <div
              className="skeleton"
              style={{ height: "90px", marginTop: "22px" }}
            />
          </div>
        ) : s ? (
          <>
            {/* Tanım */}
            <div className="ss">
              <h3>Tanım</h3>
              <p className="def">{s.def}</p>
              {s.ex?.map((e: any, idx: number) => (
                <p key={idx} className="ex">
                  {e.t || e}
                </p>
              ))}
              {s.vf && s.vf.length > 0 && (
                <div className="up">kalıp: {s.vf.join(" · ")}</div>
              )}
              {s.lits.length > 1 && (
                <div className="syn" style={{ marginTop: "10px" }}>
                  {s.lits.map((l: any, i: number) => (
                    <React.Fragment key={i}>
                      {i > 0 && <i>·</i>}
                      <button
                        onClick={() =>
                          setView("search", {
                            ds,
                            search: { q: l.w, field: "word", mode: "exact" },
                          })
                        }
                      >
                        {l.w}
                        {l.s > 0 && <sub>{l.s}</sub>}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>

            {/* Yakın çevre miniMap */}
            {renderMiniMap()}

            {/* Hiyerarşi */}
            {data.paths && data.paths.length > 0 && (
              <div className="ss">
                <h3>
                  Hiyerarşi <em>{data.paths.length} yol</em>
                </h3>
                {data.paths.map((pth: any[], k: number) => (
                  <div key={k} className="pathline">
                    {data.paths.length > 1 && (
                      <span className="lbl" style={{ marginRight: "6px" }}>
                        yol {k + 1}
                      </span>
                    )}
                    {pth.map((p) => (
                      <React.Fragment key={p.id}>
                        <button
                          title={p.d}
                          onClick={() => openConcept(p.id, ds)}
                        >
                          {p.lits?.map((l: any) => l.w).join(" / ")}
                        </button>
                        <i>›</i>
                      </React.Fragment>
                    ))}
                    <span className="cur">{head.w}</span>
                  </div>
                ))}
                {rels.find((r: any) => r.type === "HYPONYM") && (
                  <div className="up">
                    {tr(rels.find((r: any) => r.type === "HYPONYM").n)} alt
                    kavram ·{" "}
                    <button
                      className="toggler"
                      onClick={() =>
                        setView("graph", { graph: { id: s.id, ds } })
                      }
                    >
                      haritada gör
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* İlişkiler */}
            {rels.length > 0 && (
              <div className="ss">
                <h3>
                  İlişkiler{" "}
                  <em>{tr(rels.reduce((a: number, r: any) => a + r.n, 0))}</em>
                </h3>
                {rels.map((g: any) => (
                  <div key={g.type} className="relgrp">
                    <div>
                      <span
                        className={`ln ${
                          FAMILY[REL_FAMILY[g.type] || "deriv"].cls
                        }`}
                      />
                      <h4>
                        {relLabel(g.type, data.pos)}
                        <em>{g.n}</em>
                      </h4>
                    </div>
                    <div className="chips">
                      {g.items.map((b: any) => (
                        <button
                          key={b.id}
                          className="rel"
                          title={b.d || ""}
                          onClick={() => openConcept(b.id, ds)}
                        >
                          {b.lits?.map((l: any, idx: number) => (
                            <React.Fragment key={idx}>
                              {idx > 0 && ", "}
                              {l.w}
                              {l.s > 0 && <sub>{l.s}</sub>}
                            </React.Fragment>
                          ))}
                          {b.more ? <sub>+{b.more}</sub> : null}
                        </button>
                      ))}
                      {g.n > g.items.length && (
                        <span
                          className="muted"
                          style={{ fontSize: ".8rem", alignSelf: "center" }}
                        >
                          +{g.n - g.items.length}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Çapraz diller */}
            {data.cross && data.cross.length > 0 && (
              <div className="ss">
                <h3>
                  {data.cross_ds === "en"
                    ? "İngilizce karşılık"
                    : "Türkçe karşılıklar"}{" "}
                  <em>{data.cross.length}</em>
                </h3>
                {data.cross.map((b: any) => (
                  <div key={b.id} style={{ padding: "5px 0" }}>
                    <button
                      className="rel"
                      onClick={() => openConcept(b.id, data.cross_ds)}
                    >
                      {b.lits?.map((l: any) => l.w).join(", ")}
                    </button>
                    <p
                      className="def"
                      style={{
                        fontSize: ".95rem",
                        margin: "3px 0 0",
                        color: "var(--ink-2)",
                      }}
                    >
                      {b.d}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* SRL & TRopBank */}
            {data.srl && (
              <>
                {data.srl.args && (
                  <div className="ss">
                    <h3>
                      Anlamsal roller <em>TRopBank</em>
                    </h3>
                    <table className="argtbl">
                      <thead>
                        <tr>
                          <th>Rol</th>
                          <th>İşlev</th>
                          <th>Açıklama</th>
                          <th>Durum eki</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.srl.args.map((a: any, i: number) => (
                          <tr key={i}>
                            <td>
                              <span className="rl-a u1">{a.n}</span>
                            </td>
                            <td>
                              <span className="tag">{a.f}</span>{" "}
                              <span className="vt">{FUNC[a.f] || ""}</span>
                            </td>
                            <td>{a.d}</td>
                            <td>
                              {(a.c || []).map((c: string) => (
                                <span key={c} className="tag">
                                  {CASEL[c] || c}
                                </span>
                              )) || <span className="vt">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ marginTop: "10px" }}>
                      <button
                        className="toggler"
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
                        rol sözlüğünde aç
                      </button>
                    </div>
                  </div>
                )}
                {data.srl.frames && data.srl.frames.length > 0 && (
                  <div className="ss">
                    <h3>
                      FrameNet çerçeveleri <em>{data.srl.frames.length}</em>
                    </h3>
                    <div className="chips">
                      {data.srl.frames.map((n: string) => (
                        <button
                          key={n}
                          className="frm"
                          onClick={() => act({ act: "fn", name: n })}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Notum */}
            <div className="ss">
              <h3>Notum</h3>
              <textarea
                className="note-box"
                id="noteBox"
                placeholder="Bu kavram için kısa bir not… (tarayıcıda saklanır)"
                value={note}
                onChange={handleNoteChange}
              />
            </div>

            {/* Kimlik */}
            <div className="ss">
              <h3>Kimlik</h3>
              <div className="row">
                <button
                  className="tag"
                  title="Kimliği kopyala"
                  onClick={() => copyText(s.id, "Kimlik kopyalandı")}
                >
                  {s.id}
                </button>
                {s.wiki && (
                  <a
                    href={s.wiki}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tag"
                    style={{ color: "var(--spot)" }}
                  >
                    Vikipedi <Icon name="ext" />
                  </a>
                )}
                {s.lx && <span className="tag">{s.lx}</span>}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </aside>
  );
};
