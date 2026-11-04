import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import {
  VIEW_GROUPS,
  VIEW_LABEL,
  VIEW_ICON,
  VIEW_KEY,
  STUDENT_VIEWS,
  POS,
  store,
  lower,
  api,
  debounce,
} from "../lib/core";
import { Icon } from "../lib/icons";

export const CommandPalette: React.FC = () => {
  const {
    state,
    setPaletteOpen,
    setView,
    setFavsOpen,
    toggleTheme,
    togglePresent,
    setShortcutsOpen,
    openConcept,
    act,
  } = useApp();

  const [query, setQuery] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortCtrlRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (state.paletteOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      buildItems("");
    } else {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [state.paletteOpen]);

  const defaultCommands = () => [
    ...VIEW_GROUPS.flatMap((group) =>
      group.views
        .filter((v) => state.student || !STUDENT_VIEWS.has(v))
        .map((v) => ({
          k: "cmd",
          grp: group.label,
          label: `${VIEW_LABEL[v]} bölümüne git`,
          key: "g " + VIEW_KEY[v],
          run: () => setView(v),
          icon: VIEW_ICON[v],
        }))
    ),
    {
      k: "cmd",
      grp: "Komutlar",
      label: "Rastgele bir kavram aç",
      run: async () => {
        const j = await api("/api/random", {
          ds: state.ds === "1998" ? "kenet" : state.ds,
          n: 1,
        });
        if (j.results[0]) {
          openConcept(j.results[0].id, state.ds === "1998" ? "kenet" : state.ds);
        }
      },
      icon: "dice",
    },
    {
      k: "cmd",
      grp: "Komutlar",
      label: "Çalışma listemi aç",
      key: "F",
      run: () => setFavsOpen(true),
      icon: "star",
    },
    {
      k: "cmd",
      grp: "Komutlar",
      label: "Temayı değiştir",
      key: "T",
      run: toggleTheme,
      icon: state.theme === "dark" ? "sun" : "moon",
    },
    {
      k: "cmd",
      grp: "Komutlar",
      label: "Sunum modunu aç / kapat",
      key: "P",
      run: togglePresent,
      icon: "present",
    },
    {
      k: "cmd",
      grp: "Komutlar",
      label: "Klavye kısayollarını göster",
      key: "?",
      run: () => setShortcutsOpen(true),
      icon: "cmd",
    },
  ];

  const buildItems = (q: string) => {
    const qq = q.trim();
    if (!qq) {
      const initial: any[] = [];
      store
        .hist()
        .slice(0, 5)
        .forEach((x) =>
          initial.push({
            grp: "Son bakılanlar",
            label: x.w,
            sub: (POS[x.pos] || x.pos || "").toLocaleLowerCase("tr"),
            lg: x.ds === "en" ? "EN" : "TR",
            run: () => openConcept(x.id, x.ds),
            icon: "clock",
          })
        );
      store
        .favs()
        .slice(0, 4)
        .forEach((x) =>
          initial.push({
            grp: "Favoriler",
            label: x.w,
            sub: x.def.slice(0, 46),
            lg: x.ds === "en" ? "EN" : "TR",
            run: () => openConcept(x.id, x.ds),
            icon: "star",
          })
        );
      initial.push(...defaultCommands());
      setItems(initial);
      setSelectedIndex(0);
      return;
    }

    const ql = lower(qq);
    const matchedCmds = defaultCommands()
      .filter((c) => lower(c.label).includes(ql))
      .slice(0, 3);

    if (abortCtrlRef.current) abortCtrlRef.current.abort();
    abortCtrlRef.current = new AbortController();

    api("/api/suggest", { q: qq }, abortCtrlRef.current.signal)
      .then((j) => {
        const results: any[] = [];
        (j.words || []).forEach((w: any) =>
          results.push({
            grp: "Sözcükler",
            label: w.w,
            sub: `${w.n} anlam · ${w.pos
              .map((p: string) => (POS[p] || p).toLocaleLowerCase("tr"))
              .join(", ")}`,
            lg: w.ds === "en" ? "EN" : "TR",
            run: () =>
              setView("search", {
                ds: w.ds,
                search: { q: w.w, field: "word", mode: "exact" },
              }),
            alt: () =>
              setView("graph", {
                graph: { id: "", ds: w.ds, sel: w.w },
              }),
            icon: "search",
          })
        );
        (j.frames || []).forEach((n: string) =>
          results.push({
            grp: "FrameNet çerçeveleri",
            label: n,
            lg: "FN",
            run: () => act({ act: "fn", name: n }),
            icon: "frame",
          })
        );
        (j.rolesets || []).forEach((n: string) =>
          results.push({
            grp: "PropBank rolesetleri",
            label: n,
            lg: "PB",
            run: () => act({ act: "pb", lang: "en", field: "id", q: n }),
            icon: "tag",
          })
        );
        (j.vn || []).forEach((n: string) =>
          results.push({
            grp: "VerbNet sınıfları",
            label: n,
            lg: "VN",
            run: () => act({ act: "vn", field: "class", q: n }),
            icon: "tag",
          })
        );

        results.push(...matchedCmds);
        results.push({
          grp: "Diğer aramalar",
          label: `“${qq}” — tanımlarda ara`,
          run: () =>
            setView("search", {
              ds: state.ds === "1998" ? "kenet" : state.ds,
              search: { q: qq, field: "def", mode: "contains" },
            }),
          icon: "search",
        });
        results.push({
          grp: "Diğer aramalar",
          label: `“${qq}” — örnek cümlelerde ara`,
          run: () =>
            setView("search", {
              ds: state.ds === "1998" ? "kenet" : state.ds,
              search: { q: qq, field: "example", mode: "contains" },
            }),
          icon: "search",
        });

        setItems(results);
        setSelectedIndex(0);
      })
      .catch(() => {});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    buildItems(val);
  };

  const handleSelect = (index: number, alt = false) => {
    const it = items[index];
    if (!it) return;
    setPaletteOpen(false);
    if (alt && it.alt) it.alt();
    else if (it.run) it.run();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(items.length - 1, prev + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSelect(selectedIndex, e.altKey);
    } else if (e.key === "Escape") {
      setPaletteOpen(false);
    }
  };

  if (!state.paletteOpen) return null;

  let currentGrp = "";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        backgroundColor: "rgba(13, 18, 32, 0.4)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setPaletteOpen(false);
      }}
    >
      <div className="pal" style={{ width: "100%", maxWidth: "600px" }}>
        <div className="pal-in">
          <Icon name="search" />
          <input
            ref={inputRef}
            id="palInput"
            type="text"
            placeholder="Sözcük, çerçeve, roleset veya komut…"
            autoComplete="off"
            spellCheck={false}
            aria-label="Ara"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            className="kbd"
            onClick={() => setPaletteOpen(false)}
          >
            Esc
          </button>
        </div>

        <div className="pal-list" id="palList" role="listbox">
          {items.length === 0 ? (
            <div className="empty" style={{ padding: "30px 0" }}>
              Sonuç yok.
            </div>
          ) : (
            items.map((it, i) => {
              const showHeader = it.grp !== currentGrp;
              if (showHeader) currentGrp = it.grp;
              return (
                <React.Fragment key={i}>
                  {showHeader && <div className="pal-grp">{it.grp}</div>}
                  <button
                    className="pal-item"
                    role="option"
                    aria-selected={i === selectedIndex}
                    onClick={() => handleSelect(i)}
                    onMouseEnter={() => setSelectedIndex(i)}
                  >
                    {it.lg ? (
                      <span className="lg">{it.lg}</span>
                    ) : (
                      <Icon name={it.icon || "search"} />
                    )}
                    <span>
                      <b>{it.label}</b>
                      {it.sub && <span className="muted"> {it.sub}</span>}
                    </span>
                    {it.key && <span className="k">{it.key}</span>}
                  </button>
                </React.Fragment>
              );
            })
          )}
        </div>

        <div className="pal-foot">
          <span>
            <span className="kbd">↑</span> <span className="kbd">↓</span> gez
          </span>
          <span>
            <span className="kbd">↵</span> aç
          </span>
          <span>
            <span className="kbd">⌥ ↵</span> haritada aç
          </span>
        </div>
      </div>
    </div>
  );
};
