import { useMemo, useState } from "react";
import Icon from "../components/Icon";
import type { WorkerTask, WorkerTasksPayload, WorkerTaskStatus } from "../types";

const FILTERS: Array<{ id: "all" | WorkerTaskStatus; label: string }> = [
  { id: "all", label: "All" },
  { id: "running", label: "Running" },
  { id: "queued", label: "Queued" },
  { id: "succeeded", label: "Completed" },
  { id: "failed", label: "Failed" },
  { id: "cancelled", label: "Cancelled" },
];

function compactKind(kind: string) {
  return kind.replace(/\./g, " ");
}

function jobLabel(task: WorkerTask) {
  const jobId = task.payload?.job_id ? String(task.payload.job_id).slice(0, 12) : "";
  return jobId ? `${compactKind(task.kind)} · ${jobId}` : compactKind(task.kind);
}

function formatTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function statusLabel(status: WorkerTaskStatus) {
  if (status === "succeeded") return "Completed";
  return status[0].toUpperCase() + status.slice(1);
}

export function JobsView({ tasks, onRefresh }: { tasks: WorkerTasksPayload; onRefresh?: () => void }) {
  const [filter, setFilter] = useState<"all" | WorkerTaskStatus>("all");
  const rows = useMemo(() => {
    const seen = new Set<string>();
    return [...tasks.active, ...tasks.recent]
      .filter(task => {
        if (seen.has(task.id)) return false;
        seen.add(task.id);
        return filter === "all" || task.status === filter;
      })
      .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
  }, [tasks.active, tasks.recent, filter]);

  return (
    <div className="jobs-page scroll">
      <div className="jobs-header card">
        <div>
          <h1>Jobs</h1>
        </div>
        <button className="btn btn-accent" onClick={onRefresh}>
          <Icon name="pulse" size={13} /> Refresh
        </button>
      </div>

      <div className="jobs-metrics">
        <div className="jobs-metric"><span>Running</span><b>{tasks.counts.running}</b></div>
        <div className="jobs-metric"><span>Queued</span><b>{tasks.counts.queued}</b></div>
        <div className="jobs-metric"><span>Completed</span><b>{tasks.counts.succeeded}</b></div>
        <div className="jobs-metric"><span>Failed</span><b>{tasks.counts.failed}</b></div>
      </div>

      <div className="jobs-tabs">
        {FILTERS.map(item => (
          <button key={item.id} className={`btn jobs-tab ${filter === item.id ? "active" : ""}`} onClick={() => setFilter(item.id)}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="card jobs-table-card">
        <div className="jobs-table-head">
          <span>Job</span>
          <span>Status</span>
          <span>Attempts</span>
          <span>Updated</span>
        </div>
        {rows.length === 0 ? (
          <div className="jobs-empty">
            <Icon name="check" size={18} />
            <span>No jobs in this view.</span>
          </div>
        ) : rows.map(task => (
          <div key={task.id} className="jobs-row">
            <div className="jobs-row-main">
              <span className={`queue-dot queue-${task.status}`} />
              <div>
                <b>{jobLabel(task)}</b>
                {task.last_error && <p>{task.last_error}</p>}
              </div>
            </div>
            <span className={`jobs-status jobs-status-${task.status}`}>{statusLabel(task.status)}</span>
            <span className="tabular">{task.attempts}/{task.max_attempts}</span>
            <span>{formatTime(task.updated_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
