import React from "react";
import { useApp } from "../context/AppContext";
import {
  VIEW_GROUPS,
  VIEW_LABEL,
  VIEW_ICON,
  VIEW_KEY,
  STUDENT_VIEWS,
  DS_VIEWS,
  POS,
  store,
  tr,
} from "../lib/core";
import { Icon } from "../lib/icons";

export const Rail: React.FC = () => {
  const {
    state,
    setView,
    openConcept,
    toggleTheme,
    setShortcutsOpen,
    setFavsOpen,
  } = useApp();

  const dsOn = DS_VIEWS.includes(state.v);
  const hist = state.trail.slice(0, 9);
  const favCount = store.favs().length;

  return (
    <aside className="rail" id="rail" aria-label="Ana gezinti">
      <a
        className="brand"
        href="/"
        onClick={(e) => {
          e.preventDefault();
          setView("search");
        }}
        aria-label="Türkçe WordNet, ana sayfa"
      >
        <b>Türkçe WordNet</b>
      </a>

      <nav className="tabs" id="tabs" aria-label="Bölümler">
        {VIEW_GROUPS.map((group, i) => {
          const onlyStudent = group.views.every((v) => STUDENT_VIEWS.has(v));
          return (
            <div
              key={group.label}
              className={`tab-group${onlyStudent ? " stu" : ""}`}
              role="group"
              aria-labelledby={`tabGroup${i}`}
            >
              <h2 className="tab-group-title" id={`tabGroup${i}`}>
                {group.label}
              </h2>
              {group.views.map((v) => {
                const isCurrent = state.v === v;
                const isStudentOnly = STUDENT_VIEWS.has(v);
                return (
                  <button
                    key={v}
                    className={`tab${isStudentOnly ? " stu" : ""}`}
                    data-view={v}
                    aria-current={isCurrent ? "page" : undefined}
                    onClick={() => setView(v)}
                  >
                    <Icon name={VIEW_ICON[v]} />
                    <span>{VIEW_LABEL[v]}</span>
                    <span className="kb">g {VIEW_KEY[v]}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {dsOn && (
        <section className="rail-sec" id="trailSection" aria-label="Gezi izi">
          <h2>İz</h2>
          <ul className="trail" id="trail">
            {hist.length ? (
              hist.map((x) => (
                <li key={x.id}>
                  <button
                    type="button"
                    title={x.def}
                    onClick={() => openConcept(x.id, x.ds)}
                  >
                    <span>{x.w}</span>
                    <em>
                      {(POS[x.pos] || x.pos || "").toLocaleLowerCase("tr")}
                    </em>
                  </button>
                </li>
              ))
            ) : (
              <li className="empty" style={{ padding: 0, textAlign: "left" }}>
                Henüz bir kavrama bakmadın.
              </li>
            )}
          </ul>
        </section>
      )}

      {dsOn && (
        <section className="rail-sec" id="favSection">
          <button
            className="btn sm"
            id="favBtn"
            style={{ width: "100%", justifyContent: "space-between" }}
            onClick={() => setFavsOpen(true)}
          >
            <span
              style={{
                display: "inline-flex",
                gap: "8px",
                alignItems: "center",
              }}
              id="favLbl"
            >
              <Icon name="star" />
              <span>Çalışma listem</span>
              {favCount > 0 && (
                <span
                  className="iconbtn n"
                  style={{ height: "auto", minWidth: 0, padding: 0 }}
                >
                  {favCount}
                </span>
              )}
            </span>
            <span className="kbd">F</span>
          </button>
        </section>
      )}

      <div className="rail-foot">
        <button
          className="iconbtn"
          id="railTheme"
          aria-label="Temayı değiştir"
          onClick={toggleTheme}
          title="Tema (T)"
        >
          <Icon name={state.theme === "dark" ? "sun" : "moon"} />
        </button>
        <button
          className="iconbtn"
          id="railKeys"
          aria-label="Klavye kısayolları"
          onClick={() => setShortcutsOpen(true)}
          title="Kısayollar (?)"
        >
          <span className="kbd">?</span>
        </button>
        {state.stats && (
          <span
            className="muted"
            style={{ fontSize: ".74rem", marginLeft: "auto" }}
            id="railStats"
          >
            {tr(
              (state.stats.kenet?.synsets || 0) + (state.stats.en?.synsets || 0)
            )}{" "}
            synset
          </span>
        )}
      </div>
    </aside>
  );
};
