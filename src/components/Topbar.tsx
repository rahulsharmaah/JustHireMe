import Icon from "./Icon";
import type { View, WorkerTasksPayload, WorkerTask } from "../types";

export function Topbar({
  view,
  sidebarCollapsed,
  onToggleSidebar,
  tasks,
  onRefreshTasks,
}: {
  view: View;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  tasks?: WorkerTasksPayload;
  onRefreshTasks?: () => void;
}) {
  const titles: Record<View, string> = {
    apply:     "Customize Package",
    dashboard: "Command Center",
    inbox:     "Leads",
    pipeline:  "Job Pipeline",
    graph:     "Knowledge Graph",
    activity:  "Live Activity",
    profile:   "Profile",
    ingestion: "Add Context",
  };
  return (
    <header className="topbar">
      <div className="row gap-3" style={{ flex: 1 }}>
        <button className="btn btn-icon topbar-sidebar-toggle" onClick={onToggleSidebar} aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
          <Icon name="arrow-right" size={14} style={{ transform: sidebarCollapsed ? "rotate(0deg)" : "rotate(180deg)" }} />
        </button>
        <h2 className="type-topbar-title">{titles[view]}</h2>
        <span className="pill mono type-view-pill" style={{ background: "var(--paper-3)", color: "var(--ink-3)" }}>
          {view.toUpperCase()}
        </span>
      </div>
      <div className="row gap-2">
        {tasks && <WorkerQueueIndicator tasks={tasks} onRefresh={onRefreshTasks} />}
        {view === "profile" && (
          <button className="btn" onClick={() => window.dispatchEvent(new CustomEvent("profile-export"))}>
            <Icon name="download" size={13} /> Export Graph
          </button>
        )}
      </div>
    </header>
  );
}

function taskLabel(task: WorkerTask) {
  const jobId = task.payload?.job_id ? ` · ${String(task.payload.job_id).slice(0, 16)}` : "";
  return `${task.kind.replace(/\./g, " ")}${jobId}`;
}

function WorkerQueueIndicator({ tasks, onRefresh }: { tasks: WorkerTasksPayload; onRefresh?: () => void }) {
  const activeCount = tasks.active.length;
  const failed = tasks.counts.failed || 0;
  const tone = failed ? "var(--red)" : activeCount ? "var(--blue)" : "var(--green)";
  const label = tasks.enabled
    ? activeCount
      ? `${activeCount} active`
      : failed
        ? `${failed} failed`
        : "Queue idle"
    : "Queue off";

  return (
    <details className="queue-popover">
      <summary className="btn queue-summary" style={{ borderColor: tone, color: tone }}>
        <Icon name={activeCount ? "pulse" : failed ? "x" : "check"} size={13} />
        <span>{label}</span>
      </summary>
      <div className="queue-menu">
        <div className="row gap-2" style={{ justifyContent: "space-between" }}>
          <div>
            <div className="type-metric-label">Worker Queue</div>
            <div className="type-metric-sub">Concurrency {tasks.concurrency}</div>
          </div>
          <button className="btn btn-icon" onClick={onRefresh} title="Refresh queue">
            <Icon name="pulse" size={13} />
          </button>
        </div>
        <div className="queue-counts">
          <span>Queued {tasks.counts.queued}</span>
          <span>Running {tasks.counts.running}</span>
          <span>Done {tasks.counts.succeeded}</span>
          <span>Failed {tasks.counts.failed}</span>
        </div>
        <div className="queue-list">
          {(tasks.active.length ? tasks.active : tasks.recent.slice(0, 5)).map(task => (
            <div key={task.id} className="queue-row">
              <span className={`queue-dot queue-${task.status}`} />
              <div>
                <div className="queue-title">{taskLabel(task)}</div>
                <div className="type-metric-sub">{task.status} · attempt {task.attempts}/{task.max_attempts}</div>
              </div>
            </div>
          ))}
          {!tasks.active.length && !tasks.recent.length && (
            <div className="type-metric-sub">No worker tasks yet.</div>
          )}
        </div>
      </div>
    </details>
  );
}

/* ══════════════════════════════════════
   DASHBOARD VIEW
══════════════════════════════════════ */

export const StatCard = ({ tone, label, value, sub, icon }: any) => (
  <div className="stat-card" style={{
    background: `linear-gradient(180deg, rgba(255,255,255,0.78), var(--${tone}-soft))`,
    borderColor: `var(--${tone})`,
  }}>
    <div style={{
      width: 30, height: 30, borderRadius: "var(--radius-tight)",
      background: `var(--${tone})`, color: "#fff",
      display: "grid", placeItems: "center",
      boxShadow: `0 10px 22px var(--${tone}-soft)`,
    }}>
      <Icon name={icon} size={15} />
    </div>
      <div className="col" style={{ gap: 4 }}>
      <div className="display tabular type-metric-value type-metric-value-lg" style={{ color: `var(--${tone}-ink)` }}>{value}</div>
      <div className="type-metric-label">{label}</div>
      <div className="type-metric-sub">{sub}</div>
    </div>
  </div>
);
