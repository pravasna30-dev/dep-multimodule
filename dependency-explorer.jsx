import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as d3 from "d3";

// ── Dependency Data ──────────────────────────────────────────────────────────
const NODES = [
  { id: "root", groupId: "com.example", artifactId: "use-case-1-multimodule", version: "1.0.0", type: "root", description: "Root multi-module project" },
  { id: "library", groupId: "com.example", artifactId: "library", version: "1.0.0", type: "library", description: "Core library providing UserService and User APIs. Publishes to mavenLocal with sources JAR.", classes: ["UserService", "User"] },
  { id: "consumer", groupId: "com.example", artifactId: "consumer", version: "1.0.0", type: "consumer", description: "Application that consumes the library API. Contains integration and contract tests.", classes: ["Application", "UserServiceIntegrationTest", "ApiContractTest"] },
  { id: "junit-bom", groupId: "org.junit", artifactId: "junit-bom", version: "5.10.2", type: "library", scope: "test", description: "JUnit 5 Bill of Materials — manages versions for all JUnit modules." },
  { id: "junit-jupiter", groupId: "org.junit.jupiter", artifactId: "junit-jupiter", version: "5.10.2", type: "library", scope: "test", description: "JUnit Jupiter API and engine for writing and running tests." },
  { id: "junit-launcher", groupId: "org.junit.platform", artifactId: "junit-platform-launcher", version: "5.10.2", type: "library", scope: "testRuntime", description: "JUnit Platform Launcher required by Gradle 9.x for test execution." },
  { id: "assertj", groupId: "org.assertj", artifactId: "assertj-core", version: "3.25.3", type: "library", scope: "test", description: "AssertJ fluent assertion library for expressive test assertions." },
];

const LINKS = [
  { source: "root", target: "library", type: "module", label: "submodule" },
  { source: "root", target: "consumer", type: "module", label: "submodule" },
  { source: "consumer", target: "library", type: "implementation", label: "implementation" },
  { source: "consumer", target: "junit-bom", type: "test", label: "testImplementation (platform)" },
  { source: "consumer", target: "junit-jupiter", type: "test", label: "testImplementation" },
  { source: "consumer", target: "junit-launcher", type: "test", label: "testRuntimeOnly" },
  { source: "consumer", target: "assertj", type: "test", label: "testImplementation" },
  { source: "junit-jupiter", target: "junit-bom", type: "platform", label: "managed by BOM" },
  { source: "junit-launcher", target: "junit-bom", type: "platform", label: "managed by BOM" },
];

// ── Color & Style Config ─────────────────────────────────────────────────────
const TYPE_CONFIG = {
  root:     { color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe", label: "Root Project", icon: "📦" },
  library:  { color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc", label: "Library",      icon: "📚" },
  consumer: { color: "#d97706", bg: "#fffbeb", border: "#fde68a", label: "Consumer",     icon: "⚡" },
};

const SCOPE_COLORS = {
  test: "#8b5cf6",
  testRuntime: "#a78bfa",
  compile: "#059669",
};

const LINK_STYLES = {
  module:         { color: "#6366f1", dash: "none",   width: 2.5 },
  implementation: { color: "#d97706", dash: "none",   width: 2.5 },
  test:           { color: "#8b5cf6", dash: "6,3",    width: 1.8 },
  platform:       { color: "#94a3b8", dash: "3,3",    width: 1.2 },
};

// ── Helper: build GAV string ─────────────────────────────────────────────────
const gav = (n) => `${n.groupId}:${n.artifactId}:${n.version}`;

// ── Main Component ───────────────────────────────────────────────────────────
export default function DependencyExplorer() {
  const svgRef = useRef(null);
  const simRef = useRef(null);
  const gRef = useRef(null);
  const zoomRef = useRef(null);

  const [nodes, setNodes] = useState(() => NODES.map((n) => ({ ...n })));
  const [links] = useState(() => LINKS.map((l) => ({ ...l })));
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [filters, setFilters] = useState({ groupId: "", artifactId: "", version: "" });
  const [typeFilter, setTypeFilter] = useState({ root: true, library: true, consumer: true });
  const [scopeFilter, setScopeFilter] = useState({ main: true, test: true, testRuntime: true });
  const [showLabels, setShowLabels] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 900, height: 600 });

  // ── Derived: visible node ids ────────────────────────────────────────────
  const visibleIds = useMemo(() => {
    const set = new Set();
    nodes.forEach((n) => {
      const matchGroup = !filters.groupId || n.groupId.toLowerCase().includes(filters.groupId.toLowerCase());
      const matchArtifact = !filters.artifactId || n.artifactId.toLowerCase().includes(filters.artifactId.toLowerCase());
      const matchVersion = !filters.version || n.version.includes(filters.version);
      const matchType = typeFilter[n.type];
      const matchScope =
        (!n.scope && scopeFilter.main) ||
        (n.scope === "test" && scopeFilter.test) ||
        (n.scope === "testRuntime" && scopeFilter.testRuntime);
      if (matchGroup && matchArtifact && matchVersion && matchType && matchScope) set.add(n.id);
    });
    return set;
  }, [nodes, filters, typeFilter, scopeFilter]);

  const visibleLinks = useMemo(
    () => links.filter((l) => {
      const srcId = typeof l.source === "object" ? l.source.id : l.source;
      const tgtId = typeof l.target === "object" ? l.target.id : l.target;
      return visibleIds.has(srcId) && visibleIds.has(tgtId);
    }),
    [links, visibleIds]
  );

  // ── Highlight connected nodes on hover ───────────────────────────────────
  const connectedIds = useMemo(() => {
    if (!hovered) return new Set();
    const set = new Set([hovered]);
    links.forEach((l) => {
      const srcId = typeof l.source === "object" ? l.source.id : l.source;
      const tgtId = typeof l.target === "object" ? l.target.id : l.target;
      if (srcId === hovered) set.add(tgtId);
      if (tgtId === hovered) set.add(srcId);
    });
    return set;
  }, [hovered, links]);

  // ── Resize observer ──────────────────────────────────────────────────────
  useEffect(() => {
    const container = svgRef.current?.parentElement;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDimensions({ width, height });
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // ── D3 Force Simulation ──────────────────────────────────────────────────
  useEffect(() => {
    const { width, height } = dimensions;

    const sim = d3
      .forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d) => d.id).distance(140).strength(0.7))
      .force("charge", d3.forceManyBody().strength(-600))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(50))
      .force("x", d3.forceX(width / 2).strength(0.05))
      .force("y", d3.forceY(height / 2).strength(0.05))
      .alphaDecay(0.02)
      .on("tick", () => setNodes((prev) => prev.map((n) => ({ ...n }))));

    simRef.current = sim;
    return () => sim.stop();
  }, [dimensions]);

  // ── Zoom behaviour ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current) return;
    const zoom = d3
      .zoom()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        if (gRef.current) {
          gRef.current.setAttribute("transform", `translate(${event.transform.x},${event.transform.y}) scale(${event.transform.k})`);
        }
      });
    zoomRef.current = zoom;
    d3.select(svgRef.current).call(zoom);
  }, []);

  // ── Drag handlers ────────────────────────────────────────────────────────
  const onPointerDown = useCallback((e, nodeId) => {
    e.stopPropagation();
    const sim = simRef.current;
    const node = nodes.find((n) => n.id === nodeId);
    if (!sim || !node) return;

    sim.alphaTarget(0.3).restart();
    node.fx = node.x;
    node.fy = node.y;

    const svgEl = svgRef.current;
    const zoomTransform = d3.zoomTransform(svgEl);

    const onMove = (ev) => {
      const pt = svgEl.createSVGPoint();
      pt.x = ev.clientX;
      pt.y = ev.clientY;
      const svgP = pt.matrixTransform(svgEl.getScreenCTM().inverse());
      node.fx = (svgP.x - zoomTransform.x) / zoomTransform.k;
      node.fy = (svgP.y - zoomTransform.y) / zoomTransform.k;
    };

    const onUp = () => {
      sim.alphaTarget(0);
      node.fx = null;
      node.fy = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [nodes]);

  // ── Reset zoom ───────────────────────────────────────────────────────────
  const resetZoom = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().duration(500).call(zoomRef.current.transform, d3.zoomIdentity);
    }
  };

  // ── Node radius ──────────────────────────────────────────────────────────
  const nodeRadius = (n) => (n.type === "root" ? 32 : n.type === "consumer" ? 28 : 24);

  // ── Render ───────────────────────────────────────────────────────────────
  const selectedNode = nodes.find((n) => n.id === selected);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ padding: "16px 24px", background: "white", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 18 }}>D</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#1e293b" }}>Dependency Explorer</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>dep-multimodule &middot; com.example &middot; v1.0.0</div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 8 }}>
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setTypeFilter((p) => ({ ...p, [key]: !p[key] }))}
              style={{
                padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                border: `1.5px solid ${typeFilter[key] ? cfg.color : "#cbd5e1"}`,
                background: typeFilter[key] ? cfg.bg : "white",
                color: typeFilter[key] ? cfg.color : "#94a3b8",
                transition: "all 0.15s",
              }}
            >
              {cfg.icon} {cfg.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <div style={{ width: 280, background: "white", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          {/* GAV Filters */}
          <div style={{ padding: 16, borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "#475569", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>GAV Filter</div>
            {[
              { key: "groupId", placeholder: "Group ID (e.g. com.example)", icon: "G" },
              { key: "artifactId", placeholder: "Artifact ID (e.g. library)", icon: "A" },
              { key: "version", placeholder: "Version (e.g. 1.0.0)", icon: "V" },
            ].map(({ key, placeholder, icon }) => (
              <div key={key} style={{ display: "flex", alignItems: "center", marginBottom: 8, border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ width: 32, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", color: "#6366f1", fontWeight: 700, fontSize: 12, borderRight: "1px solid #e2e8f0", flexShrink: 0 }}>{icon}</div>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={filters[key]}
                  onChange={(e) => setFilters((p) => ({ ...p, [key]: e.target.value }))}
                  style={{ flex: 1, padding: "8px 10px", border: "none", outline: "none", fontSize: 13, color: "#334155", background: "transparent" }}
                />
              </div>
            ))}
            {(filters.groupId || filters.artifactId || filters.version) && (
              <button
                onClick={() => setFilters({ groupId: "", artifactId: "", version: "" })}
                style={{ width: "100%", padding: "6px 0", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b", fontSize: 12, cursor: "pointer", fontWeight: 500 }}
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Scope filter */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Scope</div>
            {[
              { key: "main", label: "Main", color: "#059669" },
              { key: "test", label: "Test", color: "#8b5cf6" },
              { key: "testRuntime", label: "Test Runtime", color: "#a78bfa" },
            ].map(({ key, label, color }) => (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, cursor: "pointer", fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={scopeFilter[key]}
                  onChange={() => setScopeFilter((p) => ({ ...p, [key]: !p[key] }))}
                  style={{ accentColor: color }}
                />
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                <span style={{ color: "#475569" }}>{label}</span>
              </label>
            ))}
          </div>

          {/* Options */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
              <input type="checkbox" checked={showLabels} onChange={() => setShowLabels((p) => !p)} style={{ accentColor: "#6366f1" }} />
              <span style={{ color: "#475569" }}>Show edge labels</span>
            </label>
          </div>

          {/* Node list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
            <div style={{ padding: "4px 16px 8px", fontWeight: 600, fontSize: 13, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Modules ({[...visibleIds].length}/{nodes.length})
            </div>
            {nodes.map((n) => {
              const visible = visibleIds.has(n.id);
              const cfg = TYPE_CONFIG[n.type];
              return (
                <div
                  key={n.id}
                  onClick={() => visible && setSelected(n.id === selected ? null : n.id)}
                  onMouseEnter={() => visible && setHovered(n.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    padding: "8px 16px", cursor: visible ? "pointer" : "default",
                    background: n.id === selected ? cfg.bg : "transparent",
                    opacity: visible ? 1 : 0.35,
                    borderLeft: n.id === selected ? `3px solid ${cfg.color}` : "3px solid transparent",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14 }}>{cfg.icon}</span>
                    <span style={{ fontWeight: 600, fontSize: 13, color: cfg.color }}>{n.artifactId}</span>
                    {n.scope && (
                      <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: "#f1f5f9", color: "#64748b", fontWeight: 500 }}>{n.scope}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, fontFamily: "monospace" }}>{n.groupId}:{n.version}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Graph Area ─────────────────────────────────────────────────── */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {/* Controls overlay */}
          <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 6, zIndex: 10 }}>
            <button onClick={resetZoom} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", color: "#475569", fontSize: 12, cursor: "pointer", fontWeight: 500, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
              Reset View
            </button>
          </div>

          {/* Instructions overlay */}
          <div style={{ position: "absolute", bottom: 12, left: 12, padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,0.9)", border: "1px solid #e2e8f0", fontSize: 11, color: "#94a3b8", zIndex: 10 }}>
            Drag nodes to reposition &middot; Scroll to zoom &middot; Click node for details
          </div>

          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            style={{ width: "100%", height: "100%", cursor: "grab" }}
          >
            <defs>
              {Object.entries(LINK_STYLES).map(([key, style]) => (
                <marker key={key} id={`arrow-${key}`} viewBox="0 0 10 6" refX="10" refY="3" markerWidth="10" markerHeight="6" orient="auto-start-reverse">
                  <path d="M0,0 L10,3 L0,6 Z" fill={style.color} opacity={0.6} />
                </marker>
              ))}
              <filter id="glow">
                <feDropShadow dx="0" dy="1" stdDeviation="3" floodOpacity="0.15" />
              </filter>
              <filter id="glow-strong">
                <feDropShadow dx="0" dy="2" stdDeviation="5" floodOpacity="0.25" />
              </filter>
            </defs>
            <g ref={gRef}>
              {/* Links */}
              {visibleLinks.map((l, i) => {
                const src = typeof l.source === "object" ? l.source : nodes.find((n) => n.id === l.source);
                const tgt = typeof l.target === "object" ? l.target : nodes.find((n) => n.id === l.target);
                if (!src || !tgt || src.x == null || tgt.x == null) return null;
                const style = LINK_STYLES[l.type] || LINK_STYLES.implementation;
                const r = nodeRadius(tgt);
                const dx = tgt.x - src.x;
                const dy = tgt.y - src.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const tx = tgt.x - (dx / dist) * (r + 6);
                const ty = tgt.y - (dy / dist) * (r + 6);
                const dimmed = hovered && (!connectedIds.has(src.id) || !connectedIds.has(tgt.id));
                const mx = (src.x + tx) / 2;
                const my = (src.y + ty) / 2;
                return (
                  <g key={`link-${i}`} style={{ transition: "opacity 0.2s" }} opacity={dimmed ? 0.12 : 1}>
                    <line
                      x1={src.x} y1={src.y} x2={tx} y2={ty}
                      stroke={style.color} strokeWidth={style.width}
                      strokeDasharray={style.dash} markerEnd={`url(#arrow-${l.type})`}
                      opacity={0.5}
                    />
                    {showLabels && (
                      <text x={mx} y={my - 6} textAnchor="middle" fontSize={9} fill="#94a3b8" fontWeight={500}>
                        {l.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Nodes */}
              {nodes.map((n) => {
                if (!visibleIds.has(n.id) || n.x == null) return null;
                const cfg = TYPE_CONFIG[n.type];
                const r = nodeRadius(n);
                const isSelected = n.id === selected;
                const isHovered = n.id === hovered;
                const dimmed = hovered && !connectedIds.has(n.id);
                return (
                  <g
                    key={n.id}
                    transform={`translate(${n.x},${n.y})`}
                    style={{ cursor: "grab", transition: "opacity 0.2s" }}
                    opacity={dimmed ? 0.2 : 1}
                    onPointerDown={(e) => onPointerDown(e, n.id)}
                    onClick={() => setSelected(n.id === selected ? null : n.id)}
                    onMouseEnter={() => setHovered(n.id)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {/* Outer ring for selected */}
                    {isSelected && (
                      <circle r={r + 6} fill="none" stroke={cfg.color} strokeWidth={2} strokeDasharray="4,3" opacity={0.5}>
                        <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="8s" repeatCount="indefinite" />
                      </circle>
                    )}
                    {/* Main circle */}
                    <circle
                      r={r}
                      fill={isHovered || isSelected ? cfg.bg : "white"}
                      stroke={cfg.color}
                      strokeWidth={isSelected ? 3 : 2}
                      filter={isHovered ? "url(#glow-strong)" : "url(#glow)"}
                    />
                    {/* Icon */}
                    <text textAnchor="middle" dominantBaseline="central" fontSize={r * 0.7} style={{ pointerEvents: "none" }}>
                      {cfg.icon}
                    </text>
                    {/* Label below */}
                    <text y={r + 16} textAnchor="middle" fontSize={12} fontWeight={600} fill={cfg.color} style={{ pointerEvents: "none" }}>
                      {n.artifactId}
                    </text>
                    <text y={r + 28} textAnchor="middle" fontSize={10} fill="#94a3b8" style={{ pointerEvents: "none", fontFamily: "monospace" }}>
                      {n.version}
                    </text>
                    {/* Scope badge */}
                    {n.scope && (
                      <g transform={`translate(${r * 0.7}, ${-r * 0.7})`}>
                        <rect x={-16} y={-8} width={32} height={16} rx={8} fill={SCOPE_COLORS[n.scope] || "#94a3b8"} />
                        <text textAnchor="middle" dominantBaseline="central" fontSize={8} fill="white" fontWeight={600} style={{ pointerEvents: "none" }}>
                          {n.scope === "testRuntime" ? "tRT" : n.scope}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* ── Detail Panel ───────────────────────────────────────────────── */}
        {selectedNode && (
          <div style={{ width: 300, background: "white", borderLeft: "1px solid #e2e8f0", display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 22 }}>{TYPE_CONFIG[selectedNode.type].icon}</span>
                  <span style={{ fontWeight: 700, fontSize: 16, color: TYPE_CONFIG[selectedNode.type].color }}>{selectedNode.artifactId}</span>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#94a3b8", lineHeight: 1 }}>×</button>
              </div>
              <span style={{
                display: "inline-block", marginTop: 6, padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                background: TYPE_CONFIG[selectedNode.type].bg, color: TYPE_CONFIG[selectedNode.type].color,
                border: `1px solid ${TYPE_CONFIG[selectedNode.type].border}`,
              }}>
                {TYPE_CONFIG[selectedNode.type].label}
              </span>
            </div>

            <div style={{ padding: "16px 20px" }}>
              {/* GAV */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Maven Coordinates</div>
                <div style={{ fontFamily: "monospace", fontSize: 12, background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0", lineHeight: 1.8 }}>
                  <div><span style={{ color: "#94a3b8" }}>groupId:</span> <span style={{ color: "#1e293b", fontWeight: 600 }}>{selectedNode.groupId}</span></div>
                  <div><span style={{ color: "#94a3b8" }}>artifactId:</span> <span style={{ color: "#1e293b", fontWeight: 600 }}>{selectedNode.artifactId}</span></div>
                  <div><span style={{ color: "#94a3b8" }}>version:</span> <span style={{ color: "#1e293b", fontWeight: 600 }}>{selectedNode.version}</span></div>
                  {selectedNode.scope && (
                    <div><span style={{ color: "#94a3b8" }}>scope:</span> <span style={{ color: SCOPE_COLORS[selectedNode.scope], fontWeight: 600 }}>{selectedNode.scope}</span></div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: "#475569", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Description</div>
                <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: 0 }}>{selectedNode.description}</p>
              </div>

              {/* Classes */}
              {selectedNode.classes && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: "#475569", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Classes</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {selectedNode.classes.map((c) => (
                      <span key={c} style={{ padding: "3px 10px", borderRadius: 6, background: "#f1f5f9", fontSize: 12, color: "#334155", fontFamily: "monospace" }}>{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Dependencies */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Dependencies ({links.filter((l) => (typeof l.source === "object" ? l.source.id : l.source) === selectedNode.id).length})
                </div>
                {links
                  .filter((l) => (typeof l.source === "object" ? l.source.id : l.source) === selectedNode.id)
                  .map((l, i) => {
                    const tgtId = typeof l.target === "object" ? l.target.id : l.target;
                    const tgt = NODES.find((n) => n.id === tgtId);
                    if (!tgt) return null;
                    const style = LINK_STYLES[l.type];
                    return (
                      <div
                        key={i}
                        onClick={() => setSelected(tgtId)}
                        style={{ padding: "8px 10px", borderRadius: 8, marginBottom: 4, cursor: "pointer", border: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8, transition: "background 0.15s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <div style={{ width: 4, height: 24, borderRadius: 2, background: style.color, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 12, color: "#334155" }}>{tgt.artifactId}</div>
                          <div style={{ fontSize: 10, color: "#94a3b8" }}>{l.label}</div>
                        </div>
                      </div>
                    );
                  })}
                {links.filter((l) => (typeof l.source === "object" ? l.source.id : l.source) === selectedNode.id).length === 0 && (
                  <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>No outgoing dependencies</div>
                )}
              </div>

              {/* Dependents */}
              <div>
                <div style={{ fontWeight: 600, fontSize: 12, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Used By ({links.filter((l) => (typeof l.target === "object" ? l.target.id : l.target) === selectedNode.id).length})
                </div>
                {links
                  .filter((l) => (typeof l.target === "object" ? l.target.id : l.target) === selectedNode.id)
                  .map((l, i) => {
                    const srcId = typeof l.source === "object" ? l.source.id : l.source;
                    const src = NODES.find((n) => n.id === srcId);
                    if (!src) return null;
                    const style = LINK_STYLES[l.type];
                    return (
                      <div
                        key={i}
                        onClick={() => setSelected(srcId)}
                        style={{ padding: "8px 10px", borderRadius: 8, marginBottom: 4, cursor: "pointer", border: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8, transition: "background 0.15s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <div style={{ width: 4, height: 24, borderRadius: 2, background: style.color, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 12, color: "#334155" }}>{src.artifactId}</div>
                          <div style={{ fontSize: 10, color: "#94a3b8" }}>{l.label}</div>
                        </div>
                      </div>
                    );
                  })}
                {links.filter((l) => (typeof l.target === "object" ? l.target.id : l.target) === selectedNode.id).length === 0 && (
                  <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>No dependents</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
