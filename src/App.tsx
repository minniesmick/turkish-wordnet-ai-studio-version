import React, { useEffect, useRef } from "react";
import { useApp } from "./context/AppContext";
import { VIEWS, VIEW_KEY } from "./lib/core";
import { Rail } from "./components/Rail";
import { Topbar } from "./components/Topbar";
import { ConceptSheet } from "./components/ConceptSheet";
import { CommandPalette } from "./components/CommandPalette";
import { ShortcutsModal } from "./components/ShortcutsModal";
import { FavoritesModal } from "./components/FavoritesModal";
import { Toast } from "./components/Toast";

import { SearchView } from "./views/SearchView";
import { GraphView } from "./views/GraphView";
import { RelateView } from "./views/RelateView";
import { WsdView } from "./views/WsdView";
import { RolesView } from "./views/RolesView";
import { FramesView } from "./views/FramesView";
import { MorphView } from "./views/MorphView";
import { DisambView } from "./views/DisambView";
import { ParseView } from "./views/ParseView";
import { DepsView } from "./views/DepsView";
import { CorpusView } from "./views/CorpusView";
import { NgramView } from "./views/NgramView";
import { LearnView } from "./views/LearnView";

export const AppContent: React.FC = () => {
  const {
    state,
    setView,
    setPaletteOpen,
    setShortcutsOpen,
    setFavsOpen,
    toggleTheme,
    togglePresent,
    closeConcept,
  } = useApp();

  const gPressedRef = useRef(false);
  const gTimerRef = useRef<any>(null);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target &&
        (/^(INPUT|TEXTAREA|SELECT)$/i.test(target.tagName) ||
          target.isContentEditable);

      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(!state.paletteOpen);
        return;
      }

      if (state.paletteOpen || state.shortcutsOpen || state.favsOpen) return;

      if (e.key === "Escape") {
        if (state.present) {
          togglePresent();
          return;
        }
        if (state.sheet.open) {
          closeConcept();
          return;
        }
      }

      if (isInput || e.metaKey || e.ctrlKey || e.altKey) return;

      // 'g' key prefix for navigation
      if (gPressedRef.current) {
        gPressedRef.current = false;
        clearTimeout(gTimerRef.current);
        const targetView = VIEWS.find((v) => VIEW_KEY[v] === e.key);
        if (targetView) {
          e.preventDefault();
          setView(targetView);
        }
        return;
      }

      if (e.key === "g") {
        gPressedRef.current = true;
        gTimerRef.current = setTimeout(() => {
          gPressedRef.current = false;
        }, 900);
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }

      if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }

      if (e.key === "p") {
        e.preventDefault();
        togglePresent();
        return;
      }

      if (e.key === "t") {
        e.preventDefault();
        toggleTheme();
        return;
      }

      if (e.key === "F") {
        e.preventDefault();
        setFavsOpen(true);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    state.paletteOpen,
    state.shortcutsOpen,
    state.favsOpen,
    state.present,
    state.sheet.open,
    setPaletteOpen,
    setShortcutsOpen,
    setFavsOpen,
    togglePresent,
    toggleTheme,
    closeConcept,
    setView,
  ]);

  const renderActiveView = () => {
    switch (state.v) {
      case "search":
        return <SearchView />;
      case "graph":
        return <GraphView />;
      case "relate":
        return <RelateView />;
      case "wsd":
        return <WsdView />;
      case "roles":
        return <RolesView />;
      case "frames":
        return <FramesView />;
      case "morph":
        return <MorphView />;
      case "disamb":
        return <DisambView />;
      case "parse":
        return <ParseView />;
      case "deps":
        return <DepsView />;
      case "corpus":
        return <CorpusView />;
      case "ngram":
        return <NgramView />;
      case "learn":
        return <LearnView />;
      default:
        return <SearchView />;
    }
  };

  const appClasses = [
    "app",
    state.sheet.open ? "sheet-open" : "",
    state.railOpenMobile ? "rail-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div id="app" className={appClasses} data-view={state.v}>
      <Rail />

      <main className="stage" id="main">
        <Topbar />
        <div className="views" id="views">
          {renderActiveView()}
        </div>
      </main>

      <ConceptSheet />

      <CommandPalette />
      <ShortcutsModal />
      <FavoritesModal />
      <Toast />

      {state.present && (
        <button
          className="present-hint"
          type="button"
          aria-label="Sunum modundan çık"
          onClick={togglePresent}
        >
          Sunumdan çık · Esc
        </button>
      )}
    </div>
  );
};
