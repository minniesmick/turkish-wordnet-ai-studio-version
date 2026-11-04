import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { store, DSNAME, copyText, FavItem } from "../lib/core";
import { Icon } from "../lib/icons";

export const FavoritesModal: React.FC = () => {
  const { state, setFavsOpen, openConcept, setView, refreshTrail } = useApp();
  const [favs, setFavs] = useState<FavItem[]>(() => store.favs());
  const notes = store.notes();

  if (!state.favsOpen) return null;

  const handleExport = () => {
    copyText(store.exportMd(), "Markdown kopyalandı");
  };

  const handleRemove = (id: string) => {
    store.toggleFav({ id } as FavItem);
    setFavs(store.favs());
    refreshTrail();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        backgroundColor: "rgba(13, 18, 32, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setFavsOpen(false);
      }}
    >
      <div
        className="dlg"
        style={{
          maxWidth: "600px",
          width: "100%",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header>
          <h2>Çalışma Listem</h2>
          <span className="muted" style={{ marginLeft: "10px", fontSize: ".9rem" }}>
            {favs.length} kavram
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
            {favs.length > 0 && (
              <button className="btn sm" onClick={handleExport}>
                <Icon name="copy" />
                Markdown olarak kopyala
              </button>
            )}
            <button
              className="iconbtn"
              aria-label="Kapat"
              onClick={() => setFavsOpen(false)}
            >
              <Icon name="x" />
            </button>
          </div>
        </header>

        <div style={{ overflowY: "auto", padding: "16px 20px" }}>
          {favs.length === 0 ? (
            <div className="empty" style={{ padding: "40px 0" }}>
              Henüz favori yok.
              <br />
              <span style={{ fontSize: ".9rem" }}>
                Bir kavramın kâğıdındaki yıldız düğmesiyle ekle.
              </span>
            </div>
          ) : (
            favs.map((x) => (
              <div
                key={x.id}
                className="ss"
                style={{
                  borderBottom: "1px solid var(--rule)",
                  paddingBottom: "14px",
                  marginBottom: "14px",
                }}
              >
                <div
                  className="row"
                  style={{
                    justifyContent: "space-between",
                    flexWrap: "nowrap",
                  }}
                >
                  <button
                    className="rel"
                    style={{ fontWeight: 700, fontSize: "1rem" }}
                    onClick={() => {
                      setFavsOpen(false);
                      openConcept(x.id, x.ds);
                    }}
                  >
                    {x.w}
                  </button>
                  <span className="muted" style={{ fontSize: ".78rem" }}>
                    {DSNAME[x.ds] || x.ds}
                  </span>
                </div>
                <p
                  className="def"
                  style={{ fontSize: ".98rem", margin: "6px 0 0" }}
                >
                  {x.def}
                </p>
                {notes[x.id] && (
                  <p className="ex" style={{ marginTop: "6px" }}>
                    {notes[x.id]}
                  </p>
                )}
                <div className="row" style={{ marginTop: "8px" }}>
                  <button
                    className="btn sm"
                    onClick={() => {
                      setFavsOpen(false);
                      setView("graph", { graph: { id: x.id, ds: x.ds } });
                    }}
                  >
                    <Icon name="graph" />
                    Harita
                  </button>
                  <button
                    className="btn sm ghost"
                    onClick={() => handleRemove(x.id)}
                  >
                    Çıkar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
