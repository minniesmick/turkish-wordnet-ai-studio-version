import React, { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "../context/AppContext";
import {
  api,
  POS,
  DSNAME,
  REL_FAMILY,
  FAMILY,
  relLabel,
  tr,
  w1,
  sub,
} from "../lib/core";
import { Icon } from "../lib/icons";

const NW = 176,
  NH = 66,
  CW = 268,
  CH = 112,
  GX = 18;
const LEFT = [
  "PART_HOLONYM",
  "MEMBER_HOLONYM",
  "SUBSTANCE_HOLONYM",
  "DOMAIN_TOPIC",
  "DOMAIN_REGION",
  "DOMAIN_USAGE",
  "ANTONYM",
  "ALSO_SEE",
];
const HIER = new Set([
  "HYPERNYM",
  "HYPONYM",
  "INSTANCE_HYPERNYM",
  "INSTANCE_HYPONYM",
]);

export const GraphView: React.FC = () => {
  const { state, updateGraphParams, openConcept, setView } = useApp();
  const gp = state.graphParams;
  const ds = gp.ds || state.ds;

  const [data, setData] = useState<any>(null);
  const [parentData, setParentData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0, k: 1 });
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [outlineMode, setOutlineMode] = useState(gp.mode === "outline");
  const [upDepth, setUpDepth] = useState(gp.up || 3);
  const [showSiblings, setShowSiblings] = useState(gp.sib);
  const [historyTrail, setHistoryTrail] = useState<string[]>([]);

  const svgRef = useRef<SVGSVGElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const currentId = gp.id || (ds === "en" ? "ENG31-02084071-n" : "TUR10-0238800");

  useEffect(() => {
    let active = true;
    setLoading(true);

    api("/api/synset", { ds, id: currentId })
      .then(async (d) => {
        if (!active) return;
        if (d && !d.error) {
          setData(d);
          const primPar = d.paths?.[0]?.slice(-1)[0];
          if (primPar && showSiblings) {
            try {
              const pData = await api("/api/synset", { ds, id: primPar.id });
              if (active) setParentData(pData);
            } catch (_) {}
          } else {
            setParentData(null);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [currentId, ds, showSiblings]);

  // Build model
  const buildModel = () => {
    if (!data || !data.self) return { nodes: [], edges: [] };
    const nodes: any[] = [];
    const edges: any[] = [];
    let ec = 0;

    const s = data.self;
    const centerNode = {
      id: s.id,
      ds,
      kind: "center",
      w: s.lits?.slice(0, 2).map((l: any) => l.w).join(" / "),
      s: s.lits?.[0]?.s || 0,
      pos: s.pos,
      def: s.def,
      x: 0,
      y: 0,
      wd: CW,
      ht: CH,
    };
    nodes.push(centerNode);

    const paths = data.paths || [];
    const prim = paths[0] || [];
    const STEP = NW + GX;

    // Hypernyms (up)
    const ups = prim.slice(-upDepth).reverse();
    let prev = centerNode;
    ups.forEach((b: any, i: number) => {
      const n = {
        id: b.id,
        ds,
        kind: "up",
        w: b.lits?.slice(0, 2).map((l: any) => l.w).join(" / "),
        s: b.lits?.[0]?.s || 0,
        pos: b.pos,
        def: b.d || b.def || "",
        x: 0,
        y: -(i + 1) * 150,
        wd: NW,
        ht: NH,
        rel: "HYPERNYM",
      };
      nodes.push(n);
      edges.push({
        id: "e" + ec++,
        from: n.id,
        to: prev.id,
        fam: "hier",
        label: i === 0 ? "üst kavram" : "",
        x1: n.x,
        y1: n.y + n.ht / 2,
        x2: prev.x,
        y2: prev.y - prev.ht / 2,
      });
      prev = n;
    });

    // Siblings
    if (showSiblings && parentData && ups[0]) {
      const g = (parentData.rels || []).find((r: any) => r.type === "HYPONYM");
      const sibs = (g ? g.items : [])
        .filter((b: any) => b.id !== s.id)
        .slice(0, 6);
      sibs.forEach((b: any, j: number) => {
        const side = j % 2 ? 1 : -1;
        const x =
          side * (CW / 2 + 36 + NW / 2 + Math.floor(j / 2) * STEP);
        const n = {
          id: b.id,
          ds,
          kind: "sib",
          w: b.lits?.slice(0, 2).map((l: any) => l.w).join(" / "),
          s: b.lits?.[0]?.s || 0,
          pos: b.pos,
          def: b.d || b.def || "",
          x,
          y: 0,
          wd: NW,
          ht: NH,
          rel: "SIBLING",
        };
        nodes.push(n);
        edges.push({
          id: "e" + ec++,
          from: ups[0].id,
          to: n.id,
          fam: "hier",
          label: j < 2 ? "kardeş" : "",
          x1: 0,
          y1: -150 + NH / 2,
          x2: x,
          y2: -NH / 2,
        });
      });
    }

    // Hyponyms (down)
    const kidsAll = (data.rels || []).filter(
      (r: any) => r.type === "HYPONYM" || r.type === "INSTANCE_HYPONYM"
    );
    const kidItems = kidsAll.flatMap((r: any) => r.items);
    const shown = kidItems.slice(0, gp.kids || 12);
    const PER = 4;
    const Y0 = 180;
    const rows: any[][] = [];
    for (let i = 0; i < shown.length; i += PER)
      rows.push(shown.slice(i, i + PER));

    rows.forEach((row, ri) =>
      row.forEach((b: any, i: number) => {
        const x =
          (i - (row.length - 1) / 2) * STEP + (ri % 2 ? STEP / 2 : 0);
        const y = Y0 + ri * 110;
        const n = {
          id: b.id,
          ds,
          kind: "down",
          w: b.lits?.slice(0, 2).map((l: any) => l.w).join(" / "),
          s: b.lits?.[0]?.s || 0,
          pos: b.pos,
          def: b.d || b.def || "",
          x,
          y,
          wd: NW,
          ht: NH,
          rel: "HYPONYM",
        };
        nodes.push(n);
        edges.push({
          id: "e" + ec++,
          from: centerNode.id,
          to: n.id,
          fam: "hier",
          label:
            ri === 0 && i === Math.floor(row.length / 2)
              ? data.pos === "v"
                ? "alt kavram (troponym)"
                : "alt kavram"
              : "",
          x1: 0,
          y1: CH / 2,
          x2: x,
          y2: y - NH / 2,
        });
      })
    );

    // Cross-lingual counterpart
    if (data.cross && data.cross.length > 0) {
      const xItem = data.cross[0];
      const n = {
        id: xItem.id,
        ds: data.cross_ds,
        kind: "xl",
        w: xItem.lits?.slice(0, 2).map((l: any) => l.w).join(" / "),
        s: xItem.lits?.[0]?.s || 0,
        pos: xItem.pos,
        def: xItem.d || "",
        x: -STEP * 1.8,
        y: 0,
        wd: NW,
        ht: NH,
        rel: "XL",
      };
      nodes.push(n);
      edges.push({
        id: "e" + ec++,
        from: centerNode.id,
        to: n.id,
        fam: "xl",
        label: data.cross_ds === "en" ? "İngilizce" : "Türkçe",
        x1: -CW / 2,
        y1: 0,
        x2: n.x + NW / 2,
        y2: 0,
      });
    }

    return { nodes, edges };
  };

  const { nodes, edges } = buildModel();

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setPan((p) => ({
      ...p,
      k: Math.max(0.2, Math.min(3, p.k * factor)),
    }));
  };

  // Drag pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    setPan((p) => ({
      ...p,
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    }));
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleCenter = (id: string) => {
    setHistoryTrail((prev) => [...prev, currentId]);
    updateGraphParams({ id, sel: id });
  };

  const handleBack = () => {
    if (!historyTrail.length) return;
    const prev = historyTrail[historyTrail.length - 1];
    setHistoryTrail((t) => t.slice(0, -1));
    updateGraphParams({ id: prev, sel: prev });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - var(--top-h))",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top control bar */}
      <div
        className="graph-toolbar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 20px",
          borderBottom: "1px solid var(--rule)",
          background: "var(--paper)",
          zIndex: 10,
        }}
      >
        <span className="lbl" style={{ marginRight: "4px" }}>
          Merkez:
        </span>
        <b style={{ fontSize: "1.05rem" }}>
          {data?.self?.lits?.[0]?.w || currentId}
        </b>
        {data?.self?.lits?.[0]?.s > 0 && <sub>{data.self.lits[0].s}</sub>}
        <span className="pos-l" style={{ marginLeft: "4px" }}>
          {data?.self?.pos && (POS[data.self.pos] || data.self.pos)}
        </span>

        <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
          {historyTrail.length > 0 && (
            <button className="btn sm" onClick={handleBack} title="Önceki merkez">
              <Icon name="back" />
              Geri
            </button>
          )}

          <div className="seg" role="group">
            <button
              aria-pressed={!outlineMode}
              onClick={() => {
                setOutlineMode(false);
                updateGraphParams({ mode: "map" });
              }}
            >
              Harita
            </button>
            <button
              aria-pressed={outlineMode}
              onClick={() => {
                setOutlineMode(true);
                updateGraphParams({ mode: "outline" });
              }}
            >
              Ağaç
            </button>
          </div>

          <button
            className={`chip ${showSiblings ? "active" : ""}`}
            aria-pressed={showSiblings}
            onClick={() => {
              setShowSiblings(!showSiblings);
              updateGraphParams({ sib: !showSiblings });
            }}
          >
            Kardeşler
          </button>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: ".85rem",
              color: "var(--ink-2)",
            }}
          >
            Üst derinlik:
            <select
              className="sel sm"
              value={upDepth}
              onChange={(e) => {
                const val = +e.target.value;
                setUpDepth(val);
                updateGraphParams({ up: val });
              }}
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <button
            className="iconbtn"
            title="Sıfırla / Ortala"
            onClick={() => setPan({ x: 0, y: 0, k: 1 })}
          >
            <Icon name="fit" />
          </button>
          <button
            className="iconbtn"
            title="Yakınlaştır"
            onClick={() => setPan((p) => ({ ...p, k: p.k * 1.2 }))}
          >
            <Icon name="plus" />
          </button>
          <button
            className="iconbtn"
            title="Uzaklaştır"
            onClick={() => setPan((p) => ({ ...p, k: p.k / 1.2 }))}
          >
            <Icon name="minus" />
          </button>
        </div>
      </div>

      {/* Main Canvas / SVG or Outline */}
      {outlineMode ? (
        <div style={{ padding: "24px 30px", overflowY: "auto", flex: 1 }}>
          <h2 style={{ marginBottom: "16px" }}>Hiyerarşik Ağaç</h2>
          {data?.paths && (
            <div style={{ marginBottom: "20px" }}>
              <h3 className="lbl">Üst yollar:</h3>
              {data.paths.map((p: any[], k: number) => (
                <div key={k} className="pathline" style={{ margin: "8px 0" }}>
                  {p.map((node) => (
                    <React.Fragment key={node.id}>
                      <button
                        className="rel"
                        onClick={() => openConcept(node.id, ds)}
                      >
                        {node.lits?.map((l: any) => l.w).join(" / ")}
                      </button>
                      <i>›</i>
                    </React.Fragment>
                  ))}
                  <b style={{ color: "var(--spot)" }}>
                    {data.self.lits?.[0]?.w}
                  </b>
                </div>
              ))}
            </div>
          )}

          <div>
            <h3 className="lbl">Alt kavramlar ({nodes.filter((n) => n.kind === "down").length}):</h3>
            <div className="chips" style={{ marginTop: "10px" }}>
              {nodes
                .filter((n) => n.kind === "down")
                .map((n) => (
                  <button
                    key={n.id}
                    className="chip"
                    onClick={() => handleCenter(n.id)}
                  >
                    {n.w}
                  </button>
                ))}
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            position: "relative",
            cursor: isDragging.current ? "grabbing" : "grab",
            backgroundColor: "var(--paper)",
            userSelect: "none",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
        >
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            style={{ display: "block" }}
          >
            <g
              transform={`translate(${window.innerWidth / 2 - 120 + pan.x}, ${
                window.innerHeight / 2 - 80 + pan.y
              }) scale(${pan.k})`}
            >
              {/* Edges */}
              {edges.map((e) => {
                const famCls = FAMILY[e.fam]?.cls || "";
                return (
                  <g key={e.id}>
                    <line
                      x1={e.x1}
                      y1={e.y1}
                      x2={e.x2}
                      y2={e.y2}
                      stroke="var(--rule-2)"
                      strokeWidth="1.8"
                      strokeDasharray={
                        famCls === "dash"
                          ? "5,5"
                          : famCls === "dot"
                          ? "2,4"
                          : undefined
                      }
                    />
                    {e.label && (
                      <text
                        x={(e.x1 + e.x2) / 2 + 6}
                        y={(e.y1 + e.y2) / 2}
                        fill="var(--ink-3)"
                        fontSize="11"
                        fontFamily="var(--font-ui)"
                      >
                        {e.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Nodes */}
              {nodes.map((n) => {
                const isCenter = n.kind === "center";
                const isSelected = selectedNode?.id === n.id;
                const rx = n.wd / 2;
                const ry = n.ht / 2;

                return (
                  <g
                    key={n.id}
                    transform={`translate(${n.x}, ${n.y})`}
                    style={{ cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode(n);
                      openConcept(n.id, n.ds || ds);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleCenter(n.id);
                    }}
                  >
                    <rect
                      x={-rx}
                      y={-ry}
                      width={n.wd}
                      height={n.ht}
                      rx={isCenter ? 10 : 6}
                      fill={
                        isCenter
                          ? "var(--wash)"
                          : isSelected
                          ? "var(--wash-2)"
                          : "var(--page)"
                      }
                      stroke={
                        isCenter
                          ? "var(--spot)"
                          : isSelected
                          ? "var(--spot)"
                          : "var(--rule)"
                      }
                      strokeWidth={isCenter ? "2.2" : "1.2"}
                      filter="drop-shadow(0 2px 4px rgba(0,0,0,0.06))"
                    />
                    <text
                      x={0}
                      y={isCenter ? -12 : 4}
                      textAnchor="middle"
                      fill="var(--ink)"
                      fontWeight={isCenter ? "700" : "600"}
                      fontSize={isCenter ? "16" : "13"}
                      fontFamily="var(--font-ui)"
                    >
                      {n.w}
                    </text>
                    {isCenter && n.def && (
                      <text
                        x={0}
                        y={14}
                        textAnchor="middle"
                        fill="var(--ink-2)"
                        fontSize="11"
                        fontFamily="var(--font-ui)"
                      >
                        {n.def.length > 34
                          ? n.def.slice(0, 32) + "…"
                          : n.def}
                      </text>
                    )}
                    <text
                      x={rx - 8}
                      y={-ry + 14}
                      textAnchor="end"
                      fill="var(--ink-3)"
                      fontSize="10"
                      fontFamily="var(--font-mono)"
                    >
                      {n.pos}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Quick info chip at bottom left */}
          <div
            style={{
              position: "absolute",
              bottom: "16px",
              left: "20px",
              background: "var(--page)",
              padding: "8px 14px",
              borderRadius: "var(--r)",
              border: "1px solid var(--rule)",
              fontSize: ".85rem",
              boxShadow: "var(--float)",
              pointerEvents: "none",
            }}
          >
            <span>
              Çift tıkla: <b>merkeze al</b> · Tıkla: <b>kâğıtta incele</b>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
