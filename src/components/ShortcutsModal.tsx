import React from "react";
import { useApp } from "../context/AppContext";
import { VIEW_GROUPS, VIEW_LABEL, VIEW_KEY } from "../lib/core";
import { Icon } from "../lib/icons";

export const ShortcutsModal: React.FC = () => {
  const { state, setShortcutsOpen } = useApp();

  if (!state.shortcutsOpen) return null;

  const KEYS = [
    ["⌘ K  /  /", "Komut paletini aç"],
    ...VIEW_GROUPS.map((group) => [
      `g  ${group.views.map((v) => VIEW_KEY[v]).join("  ")}`,
      `${group.label}: ${group.views.map((v) => VIEW_LABEL[v]).join(", ")}`,
    ]),
    ["j  k", "Sonuçlar arasında aşağı / yukarı (odak)"],
    ["Enter", "Odaktaki anlamın kâğıdını aç"],
    ["m", "Odaktaki kavramı haritada aç"],
    ["f", "Odaktaki kavramı favorilere ekle / çıkar"],
    ["Esc", "Odağı ve kâğıdı kapat"],
    ["←  →", "Haritada komşu kavramlar arasında gez"],
    ["↵ / Çift tık", "Haritada seçili kavramı merkeze al"],
    ["Backspace", "Haritada bir önceki merkeze dön"],
    ["p", "Sunum modu"],
    ["t", "Açık / koyu tema"],
    ["?", "Bu pencere"],
  ];

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
        if (e.target === e.currentTarget) setShortcutsOpen(false);
      }}
    >
      <div className="dlg" style={{ maxWidth: "560px", width: "100%" }}>
        <header>
          <h2>Klavye kısayolları</h2>
          <button
            className="iconbtn"
            id="keysClose"
            aria-label="Kapat"
            onClick={() => setShortcutsOpen(false)}
          >
            <Icon name="x" />
          </button>
        </header>
        <div className="kb-grid" id="kbGrid">
          {KEYS.map(([k, d], i) => (
            <React.Fragment key={i}>
              <span>
                {k.split("  ").map((x, j) => (
                  <span key={j} className="kbd" style={{ marginRight: "4px" }}>
                    {x}
                  </span>
                ))}
              </span>
              <span>{d}</span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
