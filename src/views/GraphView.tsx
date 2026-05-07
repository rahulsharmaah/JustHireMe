import { useEffect, useMemo, useState } from "react";
import Icon from "../components/Icon";
import { useKnowledgeCandidates, useKnowledgeGraph, useKnowledgePage, useKnowledgeStatus, useKnowledgeSummary } from "../hooks/useKnowledgeVault";
import type { ApiFetch, GraphStats, KnowledgeCandidate, KnowledgeGraphNode, WorkerTask, WorkerTasksPayload } from "../types";

function PentagonGraph({ stats }: { stats: any[] }) {
  const cx = 130, cy = 125, R = 80;
  const max = Math.max(...stats.map(s => s.count), 1);
  const pts = stats.map((s, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI / 5);
    const r = R * (0.25 + 0.75 * (s.count / max));
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, label: s.key, count: s.count, tone: s.tone, fullX: cx + Math.cos(angle) * R, fullY: cy + Math.sin(angle) * R };
  });
  const polyPts = pts.map(p => `${p.x},${p.y}`).join(" ");
  return (
    <svg viewBox="0 0 260 260" style={{ width: "100%", maxWidth: 260, height: "auto" }}>
      <defs>
        <radialGradient id="penta-fill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6C5CFF" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#18C7BE" stopOpacity="0.12" />
        </radialGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map(s => (
        <polygon key={s} points={pts.map((_p, i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI / 5);
          return `${cx + Math.cos(angle) * R * s},${cy + Math.sin(angle) * R * s}`;
        }).join(" ")} fill="none" stroke="var(--line)" strokeWidth="1" />
      ))}
      {pts.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.fullX} y2={p.fullY} stroke="var(--line)" strokeWidth="1" />
      ))}
      <polygon points={polyPts} fill="url(#penta-fill)" stroke="var(--accent)" strokeWidth="1.5" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="6" fill={`var(--${p.tone})`} stroke={`var(--${p.tone}-ink)`} strokeWidth="1.5" />
        </g>
      ))}
      {pts.map((p, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI / 5);
        const lx = cx + Math.cos(angle) * (R + 28);
        const ly = cy + Math.sin(angle) * (R + 28);
        return (
          <g key={`lbl-${i}`}>
            <text x={lx} y={ly - 2} textAnchor="middle" style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, fill: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600 }}>{p.label}</text>
            <text x={lx} y={ly + 11} textAnchor="middle" style={{ fontFamily: "var(--font-display)", fontSize: 16, fill: "var(--ink)", fontWeight: 400 }}>{p.count}</text>
          </g>
        );
      })}
    </svg>
  );
}

const TYPE_TONE: Record<string, string> = {
  source: "blue",
  concept: "purple",
  entity: "orange",
  module: "green",
  dashboard: "pink",
  index: "teal",
  community: "blue",
};

function nodeTone(node: KnowledgeGraphNode) {
  return TYPE_TONE[node.type] || "blue";
}

function KnowledgeNetwork({
  nodes,
  edges,
  selectedId,
  onSelect,
}: {
  nodes: KnowledgeGraphNode[];
  edges: { source: string; target: string; id: string }[];
  selectedId: string;
  onSelect: (node: KnowledgeGraphNode) => void;
}) {
  const width = 920;
  const height = 520;
  const padding = 70;
  const layout = useMemo(() => {
    const groups = new Map<string, KnowledgeGraphNode[]>();
    nodes.forEach(node => {
      const key = node.communityId || node.type || "misc";
      const bucket = groups.get(key) || [];
      bucket.push(node);
      groups.set(key, bucket);
    });
    const groupEntries = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
    const centers = new Map<string, { x: number; y: number }>();
    groupEntries.forEach(([key], index) => {
      const angle = (-Math.PI / 2) + (index * 2 * Math.PI / Math.max(groupEntries.length, 1));
      const radius = Math.min(width, height) * 0.28;
      centers.set(key, {
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
      });
    });
    const positions = new Map<string, { x: number; y: number }>();
    groupEntries.forEach(([key, group]) => {
      const center = centers.get(key) || { x: width / 2, y: height / 2 };
      group.forEach((node, index) => {
        const localAngle = (index * 2 * Math.PI) / Math.max(group.length, 1);
        const orbit = 18 + (Math.floor(index / 8) * 16);
        const x = center.x + Math.cos(localAngle) * orbit;
        const y = center.y + Math.sin(localAngle) * orbit;
        positions.set(node.id, {
          x: Math.min(width - padding, Math.max(padding, x)),
          y: Math.min(height - padding, Math.max(padding, y)),
        });
      });
    });
    return { positions, centers };
  }, [nodes]);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="knowledge-network-svg" role="img" aria-label="Knowledge graph">
      <defs>
        <linearGradient id="knowledge-edge" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(0,122,255,0.34)" />
          <stop offset="100%" stopColor="rgba(50,215,255,0.18)" />
        </linearGradient>
      </defs>
      {[...layout.centers.entries()].map(([key, center]) => (
        <g key={key}>
          <circle cx={center.x} cy={center.y} r="64" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.26)" />
          <text x={center.x} y={center.y - 74} textAnchor="middle" className="knowledge-network-community">{key.replace(/^community:/, "")}</text>
        </g>
      ))}
      {edges.map(edge => {
        const from = layout.positions.get(edge.source);
        const to = layout.positions.get(edge.target);
        if (!from || !to) return null;
        const active = selectedId && (edge.source === selectedId || edge.target === selectedId);
        return (
          <line
            key={edge.id}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={active ? "rgba(0,122,255,0.52)" : "url(#knowledge-edge)"}
            strokeWidth={active ? 1.7 : 1}
            opacity={active ? 1 : 0.34}
          />
        );
      })}
      {nodes.map(node => {
        const pos = layout.positions.get(node.id);
        if (!pos) return null;
        const active = selectedId === node.id;
        const tone = nodeTone(node);
        return (
          <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`} className="knowledge-network-node" onClick={() => onSelect(node)}>
            <circle r={active ? 12 : 8} fill={`var(--${tone}-soft)`} stroke={`var(--${tone})`} strokeWidth={active ? 2.5 : 1.5} />
            {active && <circle r={18} fill="none" stroke={`var(--${tone})`} strokeOpacity="0.35" />}
            <text y={active ? 28 : 22} textAnchor="middle" className="knowledge-network-label">{node.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function GraphView({ stats, api }: { stats: GraphStats; api: ApiFetch | null }) {
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedPath, setSelectedPath] = useState("");
  const [candidateFilter, setCandidateFilter] = useState<"pending" | "promoted" | "archived">("pending");
  const [nodeTypeFilter, setNodeTypeFilter] = useState<"all" | "source" | "concept" | "entity">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshTask, setRefreshTask] = useState<WorkerTask | null>(null);
  const summary = useKnowledgeSummary(api, reloadKey);
  const knowledge = useKnowledgeGraph(api, reloadKey);
  const status = useKnowledgeStatus(api, reloadKey, 3000);
  const candidates = useKnowledgeCandidates(api, candidateFilter, reloadKey);
  const page = useKnowledgePage(api, selectedPath, reloadKey);
  const refreshTaskActive = refreshTask?.kind === "knowledge.refresh" && ["queued", "running"].includes(refreshTask.status);
  const refreshInFlight = status.refreshing || refreshTaskActive;
  const refreshStatusLabel = refreshTaskActive
    ? refreshTask.status === "queued" ? "Queued" : "Running"
    : status.refreshing ? "Running" : status.lastRefreshStatus;
  const refreshMeta = refreshTaskActive
    ? refreshTask.status === "queued"
      ? "Vault refresh is queued behind the current worker task."
      : "Vault refresh is running in the worker."
    : status.refreshing
      ? "Compile in progress..."
      : status.lastRefreshAt
        ? `Last refresh ${new Date(status.lastRefreshAt).toLocaleString()}`
        : "Ready to compile the vault again.";

  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    let timer: number | null = null;
    const loadRefreshTask = () => {
      api("/api/v1/tasks?limit=30")
        .then(r => (r.ok ? r.json() : Promise.reject(new Error("Task lookup failed"))))
        .then((payload: WorkerTasksPayload) => {
          if (cancelled) return;
          const task = [...(payload.active || []), ...(payload.recent || [])]
            .find(item => item.kind === "knowledge.refresh") || null;
          setRefreshTask(task);
        })
        .catch(() => {
          if (!cancelled) setRefreshTask(null);
        });
    };
    loadRefreshTask();
    timer = window.setInterval(loadRefreshTask, refreshInFlight ? 1500 : 5000);
    return () => {
      cancelled = true;
      if (timer !== null) window.clearInterval(timer);
    };
  }, [api, refreshInFlight]);

  useEffect(() => {
    if (!status.lastRefreshAt || refreshInFlight) return;
    setReloadKey(key => key + 1);
  }, [status.lastRefreshAt, refreshInFlight]);

  useEffect(() => {
    if (!selectedPath && summary.featuredPages.length) {
      setSelectedPath(summary.featuredPages[0].path);
    }
  }, [summary.featuredPages, selectedPath]);

  useEffect(() => {
    if (!candidates.items.length || selectedPath) return;
    if (candidateFilter === "pending") {
      setSelectedPath(candidates.items[0].path);
    }
  }, [candidateFilter, candidates.items, selectedPath]);

  const pagePathById = useMemo(() => {
    const map = new Map<string, string>();
    knowledge.pages.forEach(item => map.set(item.id, item.path));
    return map;
  }, [knowledge.pages]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleNodes = useMemo(() => {
    const filtered = knowledge.nodes.filter(node => {
      const typeOk = nodeTypeFilter === "all" || node.type === nodeTypeFilter;
      const queryOk = !normalizedQuery || node.label.toLowerCase().includes(normalizedQuery) || (node.type || "").toLowerCase().includes(normalizedQuery);
      return typeOk && queryOk;
    });
    return filtered.slice(0, 90);
  }, [knowledge.nodes, nodeTypeFilter, normalizedQuery]);
  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map(node => node.id)), [visibleNodes]);
  const visibleEdges = useMemo(
    () => knowledge.edges.filter(edge => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)).slice(0, 180),
    [knowledge.edges, visibleNodeIds],
  );

  const selectedNodeId = useMemo(() => {
    if (!selectedPath) return "";
    const match = knowledge.pages.find(item => item.path === selectedPath);
    return match?.id || "";
  }, [knowledge.pages, selectedPath]);

  const mappedStats = [
    { key: "JobLead", count: stats.joblead ?? 0, tone: "blue" },
    { key: "Candidate", count: stats.candidate ?? 0, tone: "purple" },
    { key: "Skill", count: stats.skill ?? 0, tone: "orange" },
    { key: "Experience", count: stats.experience ?? 0, tone: "green" },
    { key: "Project", count: stats.project ?? 0, tone: "pink" },
  ];
  const total = mappedStats.reduce((sum, item) => sum + item.count, 0);

  const onSelectNode = (node: KnowledgeGraphNode) => {
    const path = pagePathById.get(node.pageId || node.id);
    if (path) setSelectedPath(path);
  };

  const triggerRefresh = async () => {
    if (!api || refreshInFlight) return;
    const response = await api("/api/v1/knowledge/refresh", { method: "POST" });
    const payload = await response.json().catch(() => null);
    if (payload?.taskId) {
      setRefreshTask({
        id: String(payload.taskId),
        queue: "default",
        kind: "knowledge.refresh",
        payload: {},
        status: payload.lastRefreshStatus === "running" ? "running" : "queued",
        attempts: 0,
        max_attempts: 1,
        priority: 70,
        unique_key: "knowledge.refresh",
        available_at: "",
        created_at: "",
        updated_at: "",
      });
    }
    setReloadKey(key => key + 1);
  };

  const reviewCandidate = async (candidate: KnowledgeCandidate, action: "promote" | "archive" | "reset") => {
    if (!api) return;
    await api("/api/v1/knowledge/candidates/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: candidate.path, page_id: candidate.id, action }),
    });
    if (selectedPath === candidate.path) {
      setSelectedPath(candidate.path);
    }
    setReloadKey(key => key + 1);
  };

  return (
    <div className="scroll graph-page">
      <div className="graph-shell">
        <div className="card graph-overview">
          <div className="graph-overview-copy">
            <span className="eyebrow">Integrated project memory</span>
            <h1 style={{ fontSize: 34 }}>Knowledge Graph</h1>
            <p>
              SwarmVault is now part of the app’s process: this screen reads the compiled Obsidian vault directly,
              shows the knowledge graph in-product, and keeps the key project pages close to the workflows they support.
            </p>
          </div>
          <div className="graph-overview-stats">
            <div>
              <span className="eyebrow">Vault nodes</span>
              <div className="display tabular graph-total">{summary.nodeCount || knowledge.nodes.length}</div>
            </div>
            <div className="graph-mini-stats">
              <div><span>{summary.sourceCount}</span><small>Sources compiled</small></div>
              <div><span>{summary.pageCount}</span><small>Wiki pages</small></div>
            </div>
          </div>
        </div>

        <div className="graph-layout knowledge-ops-layout">
          <section className="card knowledge-ops-card">
            <div className="knowledge-card-head">
              <div>
                <h3 style={{ marginBottom: 4 }}>Knowledge Operations</h3>
                <div className="mono knowledge-meta-line">
                  {refreshMeta}
                </div>
              </div>
              <button className="knowledge-action-button" onClick={triggerRefresh} disabled={!api || refreshInFlight}>
                <Icon name={refreshInFlight ? "clock" : "spark"} size={14} />
                <span>{refreshInFlight ? refreshStatusLabel : "Refresh vault"}</span>
              </button>
            </div>
            <div className="knowledge-ops-grid">
              <div className="knowledge-status-row">
                <span className={`pill mono knowledge-status-pill ${status.lastRefreshStatus === "error" || refreshTask?.status === "failed" ? "error" : status.lastRefreshStatus === "ok" ? "success" : ""}`}>
                  {refreshStatusLabel}
                </span>
                {status.compiledAt && <span className="mono knowledge-meta-line">Compiled {new Date(status.compiledAt).toLocaleString()}</span>}
              </div>
              {refreshTaskActive && (
                <div className="knowledge-stale-banner">
                  <Icon name="clock" size={15} />
                  <div>
                    <strong>{refreshTask.status === "queued" ? "Refresh queued" : "Refresh running"}</strong>
                    <div className="knowledge-banner-copy">
                      {refreshTask.status === "queued"
                        ? "The worker will sync the vault after the current job finishes."
                        : "The worker is compiling the vault now."}
                    </div>
                  </div>
                </div>
              )}
              {status.stale && (
                <div className="knowledge-stale-banner">
                  <Icon name="clock" size={15} />
                  <div>
                    <strong>{status.changedSourceCount} source {status.changedSourceCount === 1 ? "change" : "changes"} detected</strong>
                    <div className="knowledge-banner-copy">
                      {status.latestSourceAt ? `Latest source change ${new Date(status.latestSourceAt).toLocaleString()}` : "The vault is older than one or more tracked files."}
                    </div>
                  </div>
                </div>
              )}
              {status.lastRefreshError && <div className="knowledge-error-copy">{status.lastRefreshError}</div>}
              {status.lastRefreshSummary && (
                <div className="knowledge-refresh-summary">
                  <span className="pill mono">{status.lastRefreshSummary.pageCount ?? "?"} pages</span>
                  <span className="pill mono">{status.lastRefreshSummary.sourceCount ?? "?"} sources</span>
                  {typeof status.lastRefreshSummary.candidatePageCount !== "undefined" && (
                    <span className="pill mono">{status.lastRefreshSummary.candidatePageCount} candidate pages</span>
                  )}
                </div>
              )}
              {status.changedSources.length > 0 && (
                <div className="knowledge-changed-sources">
                  <div className="eyebrow">Changed Sources</div>
                  <ul>
                    {status.changedSources.slice(0, 6).map(item => (
                      <li key={item.path}>
                        <span>{item.path}</span>
                        <small>{item.groupLabel}</small>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="knowledge-manifest-list">
                {status.manifest.sourceGroups.map(group => (
                  <div key={group.id} className="knowledge-manifest-group">
                    <div className="knowledge-manifest-head">
                      <span>{group.label}</span>
                      <small>{group.paths.length} paths</small>
                    </div>
                    <div className="knowledge-manifest-paths">{group.paths.join(" • ")}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="card knowledge-candidate-card">
            <div className="knowledge-card-head">
              <div>
                <h3 style={{ marginBottom: 4 }}>Candidate Review Queue</h3>
                <div className="mono knowledge-meta-line">Promote useful concepts and archive noisy ones so the graph gets cleaner over time.</div>
              </div>
              <div className="knowledge-filter-row">
                {(["pending", "promoted", "archived"] as const).map(filter => (
                  <button
                    key={filter}
                    className={`knowledge-filter-chip ${candidateFilter === filter ? "active" : ""}`}
                    onClick={() => setCandidateFilter(filter)}
                  >
                    <span>{filter}</span>
                    <small>{status.candidateCounts[filter]}</small>
                  </button>
                ))}
              </div>
            </div>
            <div className="knowledge-candidate-list">
              {candidates.items.slice(0, 8).map(candidate => (
                <button
                  key={candidate.path}
                  className={`knowledge-candidate-item ${selectedPath === candidate.path ? "active" : ""}`}
                  onClick={() => setSelectedPath(candidate.path)}
                >
                  <div className="knowledge-candidate-main">
                    <div className="knowledge-candidate-title-row">
                      <span>{candidate.title}</span>
                      <span className="pill mono">{candidate.category}</span>
                    </div>
                    <div className="knowledge-candidate-excerpt">{candidate.excerpt || "No summary yet."}</div>
                    <div className="knowledge-candidate-meta">{candidate.sourceIds.slice(0, 3).join(" • ") || "No source ids"}</div>
                  </div>
                  <div className="knowledge-candidate-actions" onClick={e => e.stopPropagation()}>
                    {candidate.reviewStatus !== "promoted" && (
                      <button className="knowledge-mini-action success" onClick={() => reviewCandidate(candidate, "promote")}>Promote</button>
                    )}
                    {candidate.reviewStatus !== "archived" && (
                      <button className="knowledge-mini-action warning" onClick={() => reviewCandidate(candidate, "archive")}>Archive</button>
                    )}
                    {candidate.reviewStatus !== "pending" && (
                      <button className="knowledge-mini-action" onClick={() => reviewCandidate(candidate, "reset")}>Reset</button>
                    )}
                  </div>
                </button>
              ))}
              {!candidates.items.length && (
                <div className="knowledge-empty-state">
                  <Icon name="check" size={18} />
                  <span>No candidate pages in this bucket right now.</span>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="graph-layout knowledge-layout">
          <section className="card graph-topology-card knowledge-explorer-card">
            <div className="knowledge-card-head">
              <div>
                <h3 style={{ marginBottom: 4 }}>Vault Explorer</h3>
                <div className="mono knowledge-meta-line">
                  {summary.compiledAt ? `Compiled ${new Date(summary.compiledAt).toLocaleString()}` : "Knowledge vault not compiled yet"}
                </div>
              </div>
              <span className="pill mono" style={{ background: summary.enabled ? "var(--green-soft)" : "var(--orange-soft)", color: summary.enabled ? "var(--green-ink)" : "var(--orange-ink)", border: `1px solid ${summary.enabled ? "var(--green)" : "var(--orange)"}` }}>
                {summary.enabled ? "Vault live" : "Not available"}
              </span>
            </div>
            {summary.enabled ? (
              <>
                <div className="knowledge-home-copy">{summary.home || "Open the featured pages to inspect the compiled project memory."}</div>
                <div className="knowledge-explorer-toolbar">
                  <div className="knowledge-search-box">
                    <Icon name="search" size={14} />
                    <input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Filter nodes"
                    />
                  </div>
                  <div className="knowledge-filter-row">
                    {(["all", "source", "concept", "entity"] as const).map(filter => (
                      <button
                        key={filter}
                        className={`knowledge-filter-chip ${nodeTypeFilter === filter ? "active" : ""}`}
                        onClick={() => setNodeTypeFilter(filter)}
                      >
                        <span>{filter}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <KnowledgeNetwork nodes={visibleNodes} edges={visibleEdges} selectedId={selectedNodeId} onSelect={onSelectNode} />
                <div className="knowledge-meta-line mono">
                  Showing {visibleNodes.length} nodes and {visibleEdges.length} edges
                  {normalizedQuery ? ` for "${searchQuery.trim()}"` : ""}
                </div>
                <div className="knowledge-featured-strip">
                  {summary.featuredPages.map(item => (
                    <button key={item.path} className={`knowledge-page-chip ${selectedPath === item.path ? "active" : ""}`} onClick={() => setSelectedPath(item.path)}>
                      <span>{item.title}</span>
                      <small>{item.kind || "page"}</small>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="knowledge-empty-state">
                <Icon name="layers" size={18} />
                <span>The Obsidian/SwarmVault vault is not available in this workspace yet.</span>
              </div>
            )}
          </section>

          <section className="card knowledge-detail-card">
            <div className="knowledge-card-head">
              <div>
                <h3 style={{ marginBottom: 4 }}>{page?.title || "Knowledge detail"}</h3>
                <div className="mono knowledge-meta-line">{page ? `${page.kind || "page"} · ${page.path}` : "Pick a node or featured page to inspect it."}</div>
              </div>
              {page?.status && <span className="pill mono">{page.status}</span>}
            </div>
            <div className="knowledge-detail-body">
              {page ? (
                <>
                  <div className="knowledge-detail-text">{page.excerpt || page.content || "No page content available."}</div>
                  {page.sourceIds.length > 0 && (
                    <div className="knowledge-source-list">
                      <div className="eyebrow">Grounded In</div>
                      <div className="row gap-2" style={{ flexWrap: "wrap", marginTop: 8 }}>
                        {page.sourceIds.map(source => <span key={source} className="pill mono">{source}</span>)}
                      </div>
                    </div>
                  )}
                  {page.reviewStatus && (
                    <div className="knowledge-source-list">
                      <div className="eyebrow">Review State</div>
                      <div className="row gap-2" style={{ flexWrap: "wrap", marginTop: 8 }}>
                        <span className="pill mono">{page.reviewStatus}</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="knowledge-empty-state">
                  <Icon name="spark" size={18} />
                  <span>Select a graph node or page chip to inspect the compiled wiki content.</span>
                </div>
              )}
            </div>
            {summary.openQuestions.length > 0 && (
              <div className="knowledge-open-questions">
                <div className="eyebrow">Open Questions</div>
                <ul>
                  {summary.openQuestions.slice(0, 6).map(item => <li key={item}>{item}</li>)}
                </ul>
              </div>
            )}
          </section>
        </div>

        <div className="graph-layout">
          <div className="card graph-topology-card">
            <div className="knowledge-card-head">
              <div>
                <h3 style={{ marginBottom: 4 }}>App Runtime Graph</h3>
                <div className="mono knowledge-meta-line">Candidate, skill, project, and lead counts from the local app database.</div>
              </div>
              <span className="pill mono" style={{ background: "var(--blue-soft)", color: "var(--blue-ink)", border: "1px solid var(--blue)" }}>Live app data</span>
            </div>
            <PentagonGraph stats={mappedStats} />
          </div>

          <div className="graph-node-list">
            {mappedStats.map(s => {
              const pct = total ? Math.round((s.count / total) * 100) : 0;
              return (
                <div key={s.key} className="card-flat graph-node-card">
                  <div className="graph-node-icon" style={{ background: `var(--${s.tone}-soft)`, color: `var(--${s.tone}-ink)` }}>
                    <Icon name={s.key === "JobLead" ? "search" : s.key === "Candidate" ? "user" : s.key === "Skill" ? "spark" : s.key === "Experience" ? "brief" : "layers"} size={16} />
                  </div>
                  <div className="graph-node-main">
                    <div className="row" style={{ justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{s.key}</div>
                        <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Operational graph node count</div>
                      </div>
                      <div className="display tabular" style={{ fontSize: 34, color: `var(--${s.tone}-ink)` }}>{s.count}</div>
                    </div>
                    <div className="graph-node-meter"><span style={{ width: `${pct}%`, background: `var(--${s.tone})` }} /></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
