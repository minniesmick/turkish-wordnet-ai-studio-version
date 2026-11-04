import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  VIEWS,
  VIEW_LABEL,
  STUDENT_VIEWS,
  store,
  FavItem,
  api,
  toast,
  emit,
} from "../lib/core";

export interface AppState {
  v: string;
  ds: string;
  student: boolean;
  theme: "light" | "dark";
  present: boolean;
  sheet: { open: boolean; id: string; ds: string };
  trail: FavItem[];
  stats: any;
  paletteOpen: boolean;
  shortcutsOpen: boolean;
  favsOpen: boolean;
  railOpenMobile: boolean;
  // View params
  searchParams: {
    q: string;
    field: string;
    mode: string;
    sense: string;
    pos: Set<string>;
    example: boolean;
    fold: boolean;
    lex: string;
    focus: string;
  };
  graphParams: {
    id: string;
    ds: string;
    up: number;
    kids: number;
    sib: boolean;
    mode: "map" | "outline";
    sel: string;
  };
  relateParams: {
    a: string;
    b: string;
  };
  wsdParams: {
    method: "lesk" | "nb";
    text: string;
    target: string;
    lemma: string;
    ext: boolean;
    corpus: string;
    bag: boolean;
    pos: boolean;
    win: number;
  };
  rolesParams: {
    sub: "dict" | "label" | "quiz";
    lang: "en" | "tr" | "vn";
    q: string;
    field: string;
    mode: string;
    func: string;
    cs: string;
    fn: boolean;
    text: string;
    pred: number;
  };
  framesParams: {
    lang: "en" | "tr";
    q: string;
    field: string;
    mode: string;
    lupos: string;
    open: string;
  };
}

interface AppContextType {
  state: AppState;
  setView: (v: string, patch?: any) => void;
  setDs: (ds: string) => void;
  setStudent: (student: boolean) => void;
  toggleTheme: () => void;
  togglePresent: () => void;
  openConcept: (id: string, ds?: string) => void;
  closeConcept: () => void;
  setPaletteOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  setFavsOpen: (open: boolean) => void;
  setRailOpenMobile: (open: boolean) => void;
  updateSearchParams: (patch: Partial<AppState["searchParams"]>) => void;
  updateGraphParams: (patch: Partial<AppState["graphParams"]>) => void;
  updateRelateParams: (patch: Partial<AppState["relateParams"]>) => void;
  updateWsdParams: (patch: Partial<AppState["wsdParams"]>) => void;
  updateRolesParams: (patch: Partial<AppState["rolesParams"]>) => void;
  updateFramesParams: (patch: Partial<AppState["framesParams"]>) => void;
  act: (d: any) => void;
  refreshTrail: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getInitialParams = (): AppState => {
    const p = new URLSearchParams(window.location.search);
    const v = VIEWS.includes(p.get("v") || "") ? (p.get("v") as string) : "search";
    const ds = ["kenet", "en", "1998"].includes(p.get("ds") || "")
      ? (p.get("ds") as string)
      : "kenet";
    const student =
      p.get("mode") === "student" ||
      localStorage.getItem("wn:mode") === "student" ||
      STUDENT_VIEWS.has(v);

    let theme: "light" | "dark" = "light";
    try {
      const savedTheme =
        p.get("theme") ||
        JSON.parse(localStorage.getItem("wn:p:theme") || "null");
      if (savedTheme === "dark" || savedTheme === "light") {
        theme = savedTheme;
      } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        theme = "dark";
      }
    } catch (_) {}

    return {
      v,
      ds,
      student,
      theme,
      present: false,
      sheet: {
        open: !!p.get("c"),
        id: p.get("c") || "",
        ds: p.get("cds") || ds,
      },
      trail: store.hist(),
      stats: null,
      paletteOpen: false,
      shortcutsOpen: false,
      favsOpen: false,
      railOpenMobile: false,
      searchParams: {
        q: p.get("q") || "",
        field: p.get("field") || "word",
        mode: p.get("mode") || "exact",
        sense: p.get("sense") || "",
        pos: new Set((p.get("pos") || "").split(",").filter(Boolean)),
        example: p.get("example") === "1",
        fold: p.get("fold") === "1",
        lex: p.get("lex") || "",
        focus: p.get("focus") || "",
      },
      graphParams: {
        id: p.get("g") || "",
        ds: p.get("gds") || (ds === "en" ? "en" : "kenet"),
        up: +(p.get("gup") || 3),
        kids: 12,
        sib: p.get("gsib") === "1",
        mode: (p.get("gm") === "outline" ? "outline" : "map") as "map" | "outline",
        sel: p.get("gsel") || "",
      },
      relateParams: {
        a: p.get("a") || "",
        b: p.get("b") || "",
      },
      wsdParams: {
        method: p.get("wm") === "nb" ? "nb" : "lesk",
        text: p.get("text") || "",
        target: p.get("target") || "",
        lemma: p.get("lemma") || "",
        ext: p.get("ext") !== "0",
        corpus: p.get("nc") || "senseval",
        bag: p.get("nbag") !== "0",
        pos: p.get("npos") !== "0",
        win: +(p.get("nwin") || 10),
      },
      rolesParams: {
        sub: ["dict", "label", "quiz"].includes(p.get("rs") || "")
          ? (p.get("rs") as any)
          : "dict",
        lang: ["tr", "vn"].includes(p.get("rl") || "")
          ? (p.get("rl") as any)
          : "en",
        q: p.get("rq") || "",
        field: p.get("rf") || "lemma",
        mode: p.get("rm") || "exact",
        func: p.get("rfunc") || "",
        cs: p.get("rcase") || "",
        fn: p.get("rfn") === "1",
        text: p.get("rtext") || "Ahmet kapıyı açtı.",
        pred: -1,
      },
      framesParams: {
        lang: p.get("fl") === "tr" ? "tr" : "en",
        q: p.get("fq") || "",
        field: p.get("ff") || "name",
        mode: p.get("fm") || "contains",
        lupos: p.get("flupos") || "",
        open: "",
      },
    };
  };

  const [state, setState] = useState<AppState>(getInitialParams);

  // Sync theme
  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
    localStorage.setItem("wn:p:theme", JSON.stringify(state.theme));
  }, [state.theme]);

  // Sync student mode
  useEffect(() => {
    document.body.classList.toggle("student", state.student);
    localStorage.setItem("wn:mode", state.student ? "student" : "client");
  }, [state.student]);

  // Sync presentation mode
  useEffect(() => {
    document.body.classList.toggle("present", state.present);
  }, [state.present]);

  // Load stats
  useEffect(() => {
    api("/api/stats")
      .then((data) => {
        setState((s) => ({ ...s, stats: data }));
      })
      .catch(() => {});
  }, []);

  // Update browser document title
  useEffect(() => {
    document.title = `${VIEW_LABEL[state.v] || "Türkçe WordNet"} · Türkçe WordNet`;
  }, [state.v]);

  // Sync URL
  useEffect(() => {
    const p = new URLSearchParams();
    if (state.v === "search") {
      const sp = state.searchParams;
      const empty =
        !sp.q &&
        !sp.sense &&
        !sp.pos.size &&
        !sp.example &&
        !sp.lex &&
        state.ds === "kenet";
      if (!empty) {
        p.set("ds", state.ds);
        if (sp.q) p.set("q", sp.q);
        if (sp.field !== "word") p.set("field", sp.field);
        if (sp.mode !== "exact") p.set("mode", sp.mode);
        if (sp.sense) p.set("sense", sp.sense);
        if (sp.pos.size) p.set("pos", [...sp.pos].join(","));
        if (sp.example) p.set("example", "1");
        if (sp.fold) p.set("fold", "1");
        if (sp.lex) p.set("lex", sp.lex);
        if (sp.focus) p.set("focus", sp.focus);
      }
    } else {
      p.set("v", state.v);
      if (["relate", "wsd", "graph"].includes(state.v)) p.set("ds", state.ds);
      if (state.v === "relate" && (state.relateParams.a || state.relateParams.b)) {
        if (state.relateParams.a) p.set("a", state.relateParams.a);
        if (state.relateParams.b) p.set("b", state.relateParams.b);
      }
      if (state.v === "graph" && state.graphParams.id) {
        p.set("g", state.graphParams.id);
        p.set("gds", state.graphParams.ds);
        if (state.graphParams.mode === "outline") p.set("gm", "outline");
        if (state.graphParams.up !== 3) p.set("gup", String(state.graphParams.up));
        if (state.graphParams.sib) p.set("gsib", "1");
        if (state.graphParams.sel) p.set("gsel", state.graphParams.sel);
      }
      if (state.v === "roles") {
        const rp = state.rolesParams;
        p.set("rs", rp.sub);
        if (rp.sub === "dict") {
          p.set("rl", rp.lang);
          if (rp.q) p.set("rq", rp.q);
          if (rp.field) p.set("rf", rp.field);
          if (rp.mode !== "exact") p.set("rm", rp.mode);
          if (rp.func) p.set("rfunc", rp.func);
          if (rp.cs) p.set("rcase", rp.cs);
          if (rp.fn) p.set("rfn", "1");
        } else if (rp.sub === "label" && rp.text) {
          p.set("rtext", rp.text);
        }
      }
      if (state.v === "frames") {
        const fp = state.framesParams;
        p.set("fl", fp.lang);
        if (fp.q) p.set("fq", fp.q);
        if (fp.field !== "name") p.set("ff", fp.field);
        if (fp.mode !== "contains") p.set("fm", fp.mode);
        if (fp.lupos) p.set("flupos", fp.lupos);
      }
      if (state.v === "wsd") {
        const wp = state.wsdParams;
        if (wp.method === "nb") {
          p.set("wm", "nb");
          p.set("nc", wp.corpus);
          if (wp.lemma) p.set("nl", wp.lemma);
          if (!wp.bag) p.set("nbag", "0");
          if (!wp.pos) p.set("npos", "0");
          if (wp.win !== 10) p.set("nwin", String(wp.win));
          if (wp.text) p.set("text", wp.text);
        } else {
          if (wp.text) p.set("text", wp.text);
          if (wp.target) p.set("target", wp.target);
          if (wp.lemma) p.set("lemma", wp.lemma);
          if (!wp.ext) p.set("ext", "0");
        }
      }
    }

    if (state.student) p.set("mode", "student");
    if (state.sheet.open && state.sheet.id) {
      p.set("c", state.sheet.id);
      p.set("cds", state.sheet.ds);
    }

    const qs = p.toString();
    const newUrl = qs ? `?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", newUrl);
  }, [
    state.v,
    state.ds,
    state.student,
    state.sheet,
    state.searchParams,
    state.graphParams,
    state.relateParams,
    state.rolesParams,
    state.framesParams,
    state.wsdParams,
  ]);

  const refreshTrail = useCallback(() => {
    setState((s) => ({ ...s, trail: store.hist() }));
  }, []);

  const openConcept = useCallback((id: string, ds?: string) => {
    setState((s) => ({
      ...s,
      sheet: {
        open: true,
        id,
        ds: ds || s.ds,
      },
    }));
  }, []);

  const closeConcept = useCallback(() => {
    setState((s) => ({
      ...s,
      sheet: { ...s.sheet, open: false },
    }));
  }, []);

  const setView = useCallback((v: string, patch: any = {}) => {
    setState((s) => {
      let student = s.student;
      if (STUDENT_VIEWS.has(v) && !student) {
        student = true;
        toast("Öğrenci kipine geçildi");
      }
      let ds = patch.ds || s.ds;
      if (v !== "search" && ds === "1998") ds = "kenet";

      return {
        ...s,
        v,
        ds,
        student,
        railOpenMobile: false,
        searchParams: patch.search ? { ...s.searchParams, ...patch.search } : s.searchParams,
        graphParams: patch.graph ? { ...s.graphParams, ...patch.graph } : s.graphParams,
        relateParams: patch.relate ? { ...s.relateParams, ...patch.relate } : s.relateParams,
        rolesParams: patch.roles ? { ...s.rolesParams, ...patch.roles } : s.rolesParams,
        framesParams: patch.frames ? { ...s.framesParams, ...patch.frames } : s.framesParams,
        wsdParams: patch.wsd ? { ...s.wsdParams, ...patch.wsd } : s.wsdParams,
      };
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const setDs = useCallback((ds: string) => {
    setState((s) => ({ ...s, ds }));
  }, []);

  const setStudent = useCallback((student: boolean) => {
    setState((s) => ({ ...s, student }));
  }, []);

  const toggleTheme = useCallback(() => {
    setState((s) => ({ ...s, theme: s.theme === "dark" ? "light" : "dark" }));
  }, []);

  const togglePresent = useCallback(() => {
    setState((s) => ({ ...s, present: !s.present }));
  }, []);

  const setPaletteOpen = useCallback((paletteOpen: boolean) => {
    setState((s) => ({ ...s, paletteOpen }));
  }, []);

  const setShortcutsOpen = useCallback((shortcutsOpen: boolean) => {
    setState((s) => ({ ...s, shortcutsOpen }));
  }, []);

  const setFavsOpen = useCallback((favsOpen: boolean) => {
    setState((s) => ({ ...s, favsOpen }));
  }, []);

  const setRailOpenMobile = useCallback((railOpenMobile: boolean) => {
    setState((s) => ({ ...s, railOpenMobile }));
  }, []);

  const updateSearchParams = useCallback(
    (patch: Partial<AppState["searchParams"]>) => {
      setState((s) => ({
        ...s,
        searchParams: { ...s.searchParams, ...patch },
      }));
    },
    []
  );

  const updateGraphParams = useCallback(
    (patch: Partial<AppState["graphParams"]>) => {
      setState((s) => ({
        ...s,
        graphParams: { ...s.graphParams, ...patch },
      }));
    },
    []
  );

  const updateRelateParams = useCallback(
    (patch: Partial<AppState["relateParams"]>) => {
      setState((s) => ({
        ...s,
        relateParams: { ...s.relateParams, ...patch },
      }));
    },
    []
  );

  const updateWsdParams = useCallback(
    (patch: Partial<AppState["wsdParams"]>) => {
      setState((s) => ({
        ...s,
        wsdParams: { ...s.wsdParams, ...patch },
      }));
    },
    []
  );

  const updateRolesParams = useCallback(
    (patch: Partial<AppState["rolesParams"]>) => {
      setState((s) => ({
        ...s,
        rolesParams: { ...s.rolesParams, ...patch },
      }));
    },
    []
  );

  const updateFramesParams = useCallback(
    (patch: Partial<AppState["framesParams"]>) => {
      setState((s) => ({
        ...s,
        framesParams: { ...s.framesParams, ...patch },
      }));
    },
    []
  );

  const act = useCallback(
    (d: any) => {
      const ds = d.ds || state.ds;
      switch (d.act) {
        case "search":
          setView("search", {
            ds,
            search: { q: d.q, field: "word", mode: "exact" },
          });
          break;
        case "idsearch":
          setView("search", {
            ds,
            search: { q: d.q, field: "id", mode: "exact" },
          });
          break;
        case "relate":
          setView("relate", { ds, relate: { a: d.a, b: d.b } });
          break;
        case "graph":
          setView("graph", {
            ds,
            graph: { id: d.id, ds: d.gds || ds },
          });
          break;
        case "wsd":
          setView("wsd", {
            ds,
            wsd: {
              method: "lesk",
              text: d.text || "",
              target: d.target || "",
              lemma: d.lemma || "",
              ext: d.ext !== false,
            },
          });
          break;
        case "nb":
          setView("wsd", {
            ds: "en",
            wsd: {
              method: "nb",
              corpus: d.corpus || "senseval",
              lemma: d.lemma || "interest-n",
              text: d.text || "",
            },
          });
          break;
        case "pb":
          setView("roles", {
            roles: {
              sub: "dict",
              lang: d.lang || "en",
              field: d.field || (d.lang === "tr" ? "verb" : "lemma"),
              q: d.q,
              mode: d.mode || "exact",
            },
          });
          break;
        case "vn":
          setView("roles", {
            roles: {
              sub: "dict",
              lang: "vn",
              field: d.field || "member",
              q: d.q,
              mode: "exact",
            },
          });
          break;
        case "label":
          setView("roles", {
            roles: { sub: "label", text: d.text },
          });
          break;
        case "fn":
          setView("frames", {
            frames: {
              lang: d.lang || "en",
              field: d.field || "name",
              q: d.name || d.q,
              mode: d.mode || "exact",
              open: d.name || d.q,
            },
          });
          break;
        case "learn":
          setView("learn");
          break;
        case "go":
          setView(d.v, d);
          break;
        default:
          break;
      }
    },
    [state.ds, setView]
  );

  return (
    <AppContext.Provider
      value={{
        state,
        setView,
        setDs,
        setStudent,
        toggleTheme,
        togglePresent,
        openConcept,
        closeConcept,
        setPaletteOpen,
        setShortcutsOpen,
        setFavsOpen,
        setRailOpenMobile,
        updateSearchParams,
        updateGraphParams,
        updateRelateParams,
        updateWsdParams,
        updateRolesParams,
        updateFramesParams,
        act,
        refreshTrail,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};
