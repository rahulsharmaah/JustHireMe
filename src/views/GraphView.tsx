import { useEffect, useMemo, useState } from "react";
import Icon from "../components/Icon";
import { LoadingPanel, SkeletonGrid, SkeletonLine } from "../components/LoadingState";
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
  zoom,
  selectedId,
  onSelect,
}: {
  nodes: KnowledgeGraphNode[];
  edges: { source: string; target: string; id: string }[];
  zoom: number;
  selectedId: string;
  onSelect: (node: KnowledgeGraphNode) => void;
}) {
  const width = 1160;
  const height = 760;
  const clusterGap = 22;
  const columns = nodes.length > 18 ? 3 : 2;
  const clusterWidth = (width - clusterGap * (columns + 1)) / columns;
  const clusterHeight = 180;
  const labelWidth = Math.min(154, clusterWidth / 2 - 20);
  const truncate = (value: string, max = 22) => value.length > max ? `${value.slice(0, max - 1)}...` : value;
  const layout = useMemo(() => {
    const groups = new Map<string, KnowledgeGraphNode[]>();
    nodes.forEach(node => {
      const key = node.communityId || node.type || "misc";
      const bucket = groups.get(key) || [];
      bucket.push(node);
      groups.set(key, bucket);
    });
    const groupEntries = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
    const clusterRows = Math.max(1, Math.ceil(groupEntries.length / columns));
    const computedClusterHeight = Math.max(148, Math.min(clusterHeight, (height - clusterGap * (clusterRows + 1)) / clusterRows));
    const clusters = new Map<string, { x: number; y: number; width: number; height: number; label: string; hidden: number }>();
    const positions = new Map<string, { x: number; y: number; width: number; height: number; label: string; hidden?: boolean }>();
    groupEntries.forEach(([key, group]) => {
      const groupIndex = groupEntries.findIndex(([entryKey]) => entryKey === key);
      const col = groupIndex % columns;
      const row = Math.floor(groupIndex / columns);
      const x = clusterGap + col * (clusterWidth + clusterGap);
      const y = clusterGap + row * (computedClusterHeight + clusterGap);
      const sorted = [...group].sort((a, b) => (b.degree || 0) - (a.degree || 0) || a.label.localeCompare(b.label));
      const maxItems = computedClusterHeight > 166 ? 8 : 6;
      const visible = sorted.slice(0, maxItems);
      const hidden = Math.max(0, sorted.length - visible.length);
      clusters.set(key, { x, y, width: clusterWidth, height: computedClusterHeight, label: key.replace(/^community:/, ""), hidden });
      visible.forEach((node, index) => {
        const nodeCol = index % 2;
        const nodeRow = Math.floor(index / 2);
        const pillX = x + 18 + nodeCol * (clusterWidth / 2);
        const pillY = y + 48 + nodeRow * 31;
        positions.set(node.id, {
          x: pillX,
          y: pillY,
          width: labelWidth,
          height: 24,
          label: truncate(node.label),
        });
      });
      if (hidden > 0 && visible.length) {
        const summaryX = x + 18 + (visible.length % 2) * (clusterWidth / 2);
        const summaryY = y + 48 + Math.floor(visible.length / 2) * 31;
        positions.set(`${key}:more`, {
          x: summaryX,
          y: summaryY,
          width: labelWidth,
          height: 24,
          label: `+${hidden} more`,
          hidden: true,
        });
      }
    });
    return { positions, clusters };
  }, [nodes, clusterWidth, labelWidth]);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="knowledge-network-svg" role="img" aria-label="Knowledge graph">
      <defs>
        <linearGradient id="knowledge-edge" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(0,122,255,0.34)" />
          <stop offset="100%" stopColor="rgba(50,215,255,0.18)" />
        </linearGradient>
      </defs>
      <g transform={`translate(${width / 2} ${height / 2}) scale(${zoom}) translate(${-width / 2} ${-height / 2})`}>
        {[...layout.clusters.entries()].map(([key, cluster]) => (
          <g key={key} className="knowledge-network-cluster">
            <rect x={cluster.x} y={cluster.y} width={cluster.width} height={cluster.height} rx="10" />
            <text x={cluster.x + 16} y={cluster.y + 24} className="knowledge-network-community">{truncate(cluster.label, 28)}</text>
            <text x={cluster.x + cluster.width - 16} y={cluster.y + 24} textAnchor="end" className="knowledge-network-count">
              {cluster.hidden ? `${cluster.hidden} hidden` : ""}
            </text>
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
              x1={from.x + from.width / 2}
              y1={from.y + from.height / 2}
              x2={to.x + to.width / 2}
              y2={to.y + to.height / 2}
              stroke={active ? "rgba(0,122,255,0.52)" : "url(#knowledge-edge)"}
              strokeWidth={active ? 1.7 : 1}
              opacity={active ? 0.9 : 0.16}
            />
          );
        })}
        {nodes.map(node => {
          const pos = layout.positions.get(node.id);
          if (!pos) return null;
          const active = selectedId === node.id;
          const tone = nodeTone(node);
          return (
            <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`} className={`knowledge-network-node ${active ? "active" : ""}`} onClick={() => onSelect(node)}>
              <title>{node.label}</title>
              <rect width={pos.width} height={pos.height} rx="7" fill={`var(--${tone}-soft)`} stroke={`var(--${tone})`} strokeWidth={active ? 2 : 1.2} />
              <circle cx="12" cy="12" r="4" fill={`var(--${tone})`} />
              <text x="22" y="16" className="knowledge-network-label">{pos.label}</text>
            </g>
          );
        })}
        {[...layout.positions.entries()].filter(([, pos]) => pos.hidden).map(([key, pos]) => (
          <g key={key} transform={`translate(${pos.x}, ${pos.y})`} className="knowledge-network-more">
            <rect width={pos.width} height={pos.height} rx="7" />
            <text x={pos.width / 2} y="16" textAnchor="middle">{pos.label}</text>
          </g>
        ))}
      </g>
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
  const [graphZoom, setGraphZoom] = useState(0.85);
  const summaryResource = useKnowledgeSummary(api, reloadKey);
  const knowledgeResource = useKnowledgeGraph(api, reloadKey);
  const statusResource = useKnowledgeStatus(api, reloadKey, 3000);
  const candidatesResource = useKnowledgeCandidates(api, candidateFilter, reloadKey);
  const pageResource = useKnowledgePage(api, selectedPath, reloadKey);
  const summary = summaryResource.data;
  const knowledge = knowledgeResource.data;
  const status = statusResource.data;
  const candidates = candidatesResource.data;
  const page = pageResource.data;
  const initialKnowledgeLoading = Boolean(api) && (!summaryResource.loaded || !knowledgeResource.loaded || !statusResource.loaded);
  const candidatesLoading = initialKnowledgeLoading || candidatesResource.loading;
  const pageLoading = Boolean(selectedPath) && pageResource.loading;
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
  const vaultEnabled = summary.enabled || status.enabled;
  const vaultCompiledAt = summary.compiledAt || status.compiledAt;
  const vaultNodeCount = summary.nodeCount || status.nodeCount || knowledge.nodes.length;
  const vaultSourceCount = summary.sourceCount || status.sourceCount;
  const vaultPageCount = summary.pageCount || status.pageCount;
  const vaultAvailabilityLabel = vaultEnabled ? "Vault live" : api ? "Loading" : "Not available";

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
    return filtered
      .sort((a, b) => (b.degree || 0) - (a.degree || 0) || a.label.localeCompare(b.label))
      .slice(0, normalizedQuery ? 60 : 36);
  }, [knowledge.nodes, nodeTypeFilter, normalizedQuery]);
  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map(node => node.id)), [visibleNodes]);
  const visibleEdges = useMemo(
    () => knowledge.edges.filter(edge => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)).slice(0, 100),
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

  const setClampedGraphZoom = (nextZoom: number) => {
    setGraphZoom(Math.min(1.6, Math.max(0.65, Math.round(nextZoom * 100) / 100)));
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
            <h1>Knowledge Graph</h1>
            <p>Explore the compiled project memory, inspect connected pages, and refresh the vault when sources change.</p>
          </div>
          <div className="graph-overview-stats">
            <div>
              <span className="eyebrow">Vault nodes</span>
              {initialKnowledgeLoading ? <SkeletonLine width="48px" /> : <div className="display tabular graph-total">{vaultNodeCount}</div>}
            </div>
            <div className="graph-mini-stats">
              <div>{initialKnowledgeLoading ? <SkeletonLine width="36px" /> : <span>{vaultSourceCount}</span>}<small>Sources compiled</small></div>
              <div>{initialKnowledgeLoading ? <SkeletonLine width="36px" /> : <span>{vaultPageCount}</span>}<small>Wiki pages</small></div>
            </div>
          </div>
        </div>

        <div className="graph-layout knowledge-ops-layout">
          <section className="card knowledge-ops-card">
            <div className="knowledge-card-head">
              <div>
                <h3 style={{ marginBottom: 4 }}>Vault Operations</h3>
                <div className="mono knowledge-meta-line">
                  {initialKnowledgeLoading ? "Loading vault status..." : refreshMeta}
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
                  {initialKnowledgeLoading ? "Loading" : refreshStatusLabel}
                </span>
                {initialKnowledgeLoading ? (
                  <SkeletonLine width="220px" />
                ) : status.compiledAt && <span className="mono knowledge-meta-line">Compiled {new Date(status.compiledAt).toLocaleString()}</span>}
              </div>
              {initialKnowledgeLoading ? (
                <SkeletonGrid count={2} rows={2} />
              ) : refreshTaskActive && (
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
              {!initialKnowledgeLoading && status.stale && (
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
              {!initialKnowledgeLoading && status.lastRefreshError && <div className="knowledge-error-copy">{status.lastRefreshError}</div>}
              {!initialKnowledgeLoading && status.lastRefreshSummary && (
                <div className="knowledge-refresh-summary">
                  <span className="pill mono">{status.lastRefreshSummary.pageCount ?? "?"} pages</span>
                  <span className="pill mono">{status.lastRefreshSummary.sourceCount ?? "?"} sources</span>
                  {typeof status.lastRefreshSummary.candidatePageCount !== "undefined" && (
                    <span className="pill mono">{status.lastRefreshSummary.candidatePageCount} candidate pages</span>
                  )}
                </div>
              )}
              {!initialKnowledgeLoading && status.changedSources.length > 0 && (
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
              {!initialKnowledgeLoading && (
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
              )}
            </div>
          </section>

          <section className="card knowledge-candidate-card">
            <div className="knowledge-card-head">
              <div>
                <h3 style={{ marginBottom: 4 }}>Review Queue</h3>
                <div className="mono knowledge-meta-line">Promote useful concepts and archive noisy ones.</div>
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
              {candidatesLoading ? (
                <SkeletonGrid count={4} rows={3} />
              ) : candidates.items.slice(0, 8).map(candidate => (
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
              {!candidatesLoading && !candidates.items.length && (
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
                <h3 style={{ marginBottom: 4 }}>Graph Explorer</h3>
                <div className="mono knowledge-meta-line">
                  {vaultCompiledAt ? `Compiled ${new Date(vaultCompiledAt).toLocaleString()}` : api ? "Loading knowledge vault..." : "Knowledge vault not compiled yet"}
                </div>
              </div>
              <span className="pill mono" style={{ background: vaultEnabled ? "var(--green-soft)" : "var(--orange-soft)", color: vaultEnabled ? "var(--green-ink)" : "var(--orange-ink)", border: `1px solid ${vaultEnabled ? "var(--green)" : "var(--orange)"}` }}>
                {vaultAvailabilityLabel}
              </span>
            </div>
            {initialKnowledgeLoading ? (
              <LoadingPanel title="Loading knowledge graph" rows={5} />
            ) : vaultEnabled ? (
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
                  <div className="knowledge-zoom-controls" aria-label="Graph zoom controls">
                    <button
                      className="knowledge-zoom-button"
                      onClick={() => setClampedGraphZoom(graphZoom - 0.1)}
                      disabled={graphZoom <= 0.65}
                      aria-label="Zoom out"
                      title="Zoom out"
                    >
                      <Icon name="minus" size={14} />
                    </button>
                    <button
                      className="knowledge-zoom-value"
                      onClick={() => setClampedGraphZoom(1)}
                      aria-label="Reset zoom"
                      title="Reset zoom"
                    >
                      <Icon name="reset" size={13} />
                      <span>{Math.round(graphZoom * 100)}%</span>
                    </button>
                    <button
                      className="knowledge-zoom-button"
                      onClick={() => setClampedGraphZoom(graphZoom + 0.1)}
                      disabled={graphZoom >= 1.6}
                      aria-label="Zoom in"
                      title="Zoom in"
                    >
                      <Icon name="plus" size={14} />
                    </button>
                  </div>
                </div>
                <KnowledgeNetwork nodes={visibleNodes} edges={visibleEdges} zoom={graphZoom} selectedId={selectedNodeId} onSelect={onSelectNode} />
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
              ) : pageLoading ? (
                <LoadingPanel title="Loading page detail" rows={4} />
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
                <h3 style={{ marginBottom: 4 }}>Runtime Counts</h3>
                <div className="mono knowledge-meta-line">Local app database totals.</div>
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
