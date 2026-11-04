import React from "react";
import { useApp } from "../context/AppContext";
import { DS_VIEWS, copyText } from "../lib/core";
import { Icon } from "../lib/icons";

export const Topbar: React.FC = () => {
  const {
    state,
    setDs,
    setStudent,
    toggleTheme,
    togglePresent,
    setPaletteOpen,
    setRailOpenMobile,
  } = useApp();

  const dsOn = DS_VIEWS.includes(state.v);

  const handleCopyLink = () => {
    copyText(window.location.href, "Bağlantı kopyalandı");
  };

  return (
    <header className="topbar">
      <button
        className="iconbtn menu-btn"
        id="menuBtn"
        aria-label="Menüyü aç"
        aria-controls="rail"
        aria-expanded={state.railOpenMobile}
        onClick={() => setRailOpenMobile(!state.railOpenMobile)}
      >
        <Icon name="menu" />
      </button>

      <button
        className="omni"
        id="omni"
        aria-label="Ara veya komut ver"
        onClick={() => setPaletteOpen(true)}
      >
        <Icon name="search" />
        <span id="omniTxt">Kavram, sözcük veya çerçeve ara…</span>
        <span className="kbd" id="omniKbd">
          ⌘K
        </span>
      </button>

      {dsOn && (
        <div className="seg" id="dsSeg" role="group" aria-label="Sözlük dili">
          <button
            data-ds="kenet"
            aria-pressed={state.ds === "kenet"}
            onClick={() => setDs("kenet")}
          >
            Türkçe
          </button>
          <button
            data-ds="en"
            aria-pressed={state.ds === "en"}
            onClick={() => setDs("en")}
          >
            English
          </button>
          {state.v === "search" && (
            <button
              data-ds="1998"
              id="ds1998"
              aria-pressed={state.ds === "1998"}
              onClick={() => setDs("1998")}
            >
              1998
            </button>
          )}
        </div>
      )}

      <div className="mode-control">
        <div
          className="seg"
          id="modeSeg"
          role="group"
          aria-label="Kullanım kipi"
          aria-describedby="modeHelp"
        >
          <button
            data-mode="client"
            aria-pressed={!state.student}
            title="Yalnızca sonuçları göster"
            onClick={() => setStudent(false)}
          >
            Araç
          </button>
          <button
            data-mode="student"
            aria-pressed={state.student}
            title="Ders notları, formüller ve alıştırmaları göster"
            onClick={() => setStudent(true)}
          >
            Öğrenci
          </button>
        </div>
        <span className="mode-caption" id="modeCaption">
          {state.student ? "Ders + alıştırmalar" : "Yalnızca sonuçlar"}
        </span>
      </div>

      <span className="sr" id="modeHelp">
        Araç kipinde yalnızca sonuçlar görünür. Öğrenci kipinde ders notları,
        formüller, adım adım açıklamalar ve alıştırmalar görünür.
      </span>

      <div className="top-actions">
        <button
          className="iconbtn"
          id="linkBtn"
          aria-label="Bağlantıyı kopyala"
          title="Bu ekranın bağlantısını kopyala"
          onClick={handleCopyLink}
        >
          <Icon name="link" />
        </button>
        <button
          className="iconbtn"
          id="presentBtn"
          aria-label="Sunum modu"
          title="Sunum modu (P)"
          aria-pressed={state.present}
          onClick={togglePresent}
        >
          <Icon name="present" />
        </button>
        <button
          className="iconbtn"
          id="themeBtn"
          aria-label="Temayı değiştir"
          title="Tema (T)"
          onClick={toggleTheme}
        >
          <Icon name={state.theme === "dark" ? "sun" : "moon"} />
        </button>
      </div>
    </header>
  );
};
