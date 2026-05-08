import Icon from "../components/Icon";
import type { Lead, LogLine, View } from "../types";
import { StatCard } from "../components/Topbar";
import { SkeletonGrid, LoadingPanel } from "../components/LoadingState";
import { leadSignal, needsTodayAction, todayActionLabel } from "../lib/leadUtils";

export function DashboardView({
  leads, dueFollowups, logs, setView, openDrawer,
  scanning, reevaluating, cleaning, onScan, onStopScan, onReevaluate, onStopReevaluate, onCleanup, scanErr, loading,
}: {
  leads: Lead[]; dueFollowups: Lead[]; logs: LogLine[]; setView: (v: View) => void; openDrawer: (l: Lead) => void;
  scanning: boolean; reevaluating: boolean; cleaning: boolean;
  onScan: () => void; onStopScan: () => void; onReevaluate: () => void; onStopReevaluate: () => void; onCleanup: () => void; scanErr: string | null;
  loading: boolean;
}) {
  const counts = {
    total:      leads.length,
    discovered: leads.filter(l=>l.status==="discovered").length,
    evaluated:  leads.filter(l=>l.score > 0).length,
    tailoring:  leads.filter(l=>l.status==="tailoring").length,
    approved:   leads.filter(l=>l.status==="approved").length,
    applied:    leads.filter(l=>l.status==="applied").length,
  };
  const todayQueue = [...leads]
    .filter(needsTodayAction)
    .sort((a, b) => Number(Boolean(b.followup_due_at)) - Number(Boolean(a.followup_due_at)) || leadSignal(b) - leadSignal(a))
    .slice(0, 8);
  const dailyHot = [...leads]
    .filter(l => l.status !== "discarded")
    .sort((a, b) => leadSignal(b) - leadSignal(a))
    .slice(0, 6);

  return (
    <div className="dashboard-page scroll">
      <div className="card dashboard-command">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "stretch", gap: 22, flexWrap: "wrap" }}>
          <div className="dashboard-command-copy">
            <h1>Dashboard</h1>
            <div className="dashboard-summary">
              <span><b>{leads.length}</b> leads</span>
              <span><b>{todayQueue.length}</b> need action</span>
              <span><b>{counts.evaluated}</b> evaluated</span>
              <span><b>{counts.tailoring + counts.approved}</b> tailored</span>
            </div>
            <div className="dashboard-actions">
              <button className="btn btn-accent" onClick={onScan} disabled={scanning || reevaluating || cleaning} aria-busy={scanning}>
                {scanning ? <><span className="dot pulse-soft" /> Scanning...</> : <><Icon name="spark" size={13} /> Start scan</>}
              </button>
              {scanning && (
                <button className="btn danger-soft" onClick={onStopScan}>
                  <Icon name="x" size={13} color="var(--bad)" /> Stop scan
                </button>
              )}
              {reevaluating ? (
                <button className="btn danger-soft" onClick={onStopReevaluate}>
                  <Icon name="x" size={13} color="var(--bad)" /> Stop re-eval
                </button>
              ) : (
                <button onClick={onReevaluate} disabled={scanning || leads.length === 0} className="btn" aria-busy={reevaluating} style={{
                  opacity: scanning || leads.length === 0 ? 0.58 : 1,
                  cursor: scanning || leads.length === 0 ? "not-allowed" : "pointer",
                }}>
                  <Icon name="pulse" size={13} /> Re-evaluate jobs
                </button>
              )}
              <button onClick={onCleanup} disabled={scanning || reevaluating || cleaning || leads.length === 0} className="btn" aria-busy={cleaning} style={{
                opacity: scanning || reevaluating || cleaning || leads.length === 0 ? 0.58 : 1,
                cursor: cleaning ? "wait" : scanning || reevaluating || leads.length === 0 ? "not-allowed" : "pointer",
              }}>
                <Icon name="trash" size={13} /> {cleaning ? "Cleaning..." : "Clean bad data"}
              </button>
              <button className="btn btn-accent" onClick={() => setView("pipeline")}>Open pipeline <Icon name="arrow-right" size={13} /></button>
              <button className="btn" onClick={() => setView("inbox")}><Icon name="plus" size={13} /> Paste lead</button>
              <button className="btn" onClick={() => setView("activity")}><Icon name="pulse" size={13} /> Live activity</button>
            </div>
            {scanErr && <div style={{ marginTop: 6, fontSize: 12, color: "var(--bad)", fontWeight: 500 }}>⚠ {scanErr}</div>}
          </div>
        </div>
      </div>

      {loading ? (
        <SkeletonGrid count={5} rows={2} />
      ) : (
        <div className="dashboard-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 18 }}>
          <StatCard tone="blue"   label="Leads found"      value={counts.discovered} sub="Awaiting eval"   icon="layers" />
          <StatCard tone="yellow" label="Evaluated"         value={counts.evaluated}  sub="Non-zero scores" icon="spark"  />
          <StatCard tone="purple" label="Resumes tailored"  value={counts.tailoring}  sub="PDFs cached"     icon="file"   />
          <StatCard tone="green"  label="Awaiting approval" value={counts.approved}   sub="Ready to fire"   icon="check"  />
          <StatCard tone="orange" label="Applications sent" value={counts.applied}    sub="Success"         icon="arrow-up" />
        </div>
      )}

      <div className="dashboard-work-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginBottom: 18 }}>
        <div className="card dashboard-panel dashboard-action-panel" style={{ padding: 18 }}>
          <div className="row dashboard-panel-head" style={{ justifyContent: "space-between", marginBottom: 12 }}>
            <h3>Today action queue</h3>
            <button className="btn btn-ghost" onClick={() => setView("pipeline")} style={{ fontSize: 12 }}>Pipeline <Icon name="arrow-right" size={12} /></button>
          </div>
          <div className="col gap-2 dashboard-panel-list">
            {loading ? (
              <LoadingPanel title="Loading action queue" rows={4} />
            ) : todayQueue.length === 0 ? (
              <div className="card-flat" style={{ padding: 14, color: "var(--ink-3)", fontSize: 12 }}>Nothing urgent. Run a scan, paste a lead, or review the full pipeline.</div>
            ) : todayQueue.map(lead => {
              const signal = leadSignal(lead);
              const nextAction = todayActionLabel(lead);
              return (
                <div key={lead.job_id} onClick={() => openDrawer(lead)} className="lift dashboard-lead-row" style={{ padding: 12, borderRadius: "var(--radius-card)", border: "1px solid var(--line)", background: "var(--card)", cursor: "pointer", display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.title}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.learning_reason || lead.signal_reason || lead.reason || nextAction}</div>
                    <div className="row gap-2" style={{ marginTop: 4, flexWrap: "wrap" }}>
                      <span className="pill mono" style={{ fontSize: 9 }}>{lead.platform}</span>
                      <span className="pill mono" style={{ fontSize: 9 }}>{lead.kind || "job"}</span>
                      <span className="pill mono" style={{ fontSize: 9, background: "var(--green-soft)", color: "var(--green-ink)" }}>{nextAction}</span>
                      {!!lead.learning_delta && <span className="pill mono" style={{ fontSize: 9, background: lead.learning_delta > 0 ? "var(--green-soft)" : "var(--bad-soft)", color: lead.learning_delta > 0 ? "var(--green-ink)" : "var(--bad)" }}>learn {lead.learning_delta > 0 ? "+" : ""}{lead.learning_delta}</span>}
                      {lead.budget && <span className="pill mono" style={{ fontSize: 9, background: "var(--green-soft)", color: "var(--green-ink)" }}>{lead.budget}</span>}
                    </div>
                  </div>
                  <span className="mono" style={{ alignSelf: "center", fontSize: 13, fontWeight: 800, color: signal >= 80 ? "var(--orange-ink)" : "var(--ink-3)" }}>{signal}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card dashboard-panel dashboard-strong-panel" style={{ padding: 18, background: "var(--blue-soft)" }}>
          <div className="row dashboard-panel-head" style={{ justifyContent: "space-between", marginBottom: 12 }}>
            <h3>Strong leads</h3>
            <span className="pill mono" style={{ background: "var(--blue)", color: "var(--blue-ink)" }}>{dailyHot.length}</span>
          </div>
          <div className="col gap-2 dashboard-panel-list">
            {loading ? (
              <LoadingPanel title="Loading strong leads" rows={4} />
            ) : dailyHot.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.45 }}>No scored leads yet.</div>
            ) : dailyHot.slice(0, 5).map(lead => (
              <div key={lead.job_id} onClick={() => openDrawer(lead)} className="lift dashboard-lead-row" style={{ padding: 10, borderRadius: "var(--radius-control)", border: "1px solid var(--line)", background: "var(--card)", cursor: "pointer", display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.title}</div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 3 }}>{lead.company}</div>
                </div>
                <span className="mono" style={{ fontSize: 12, fontWeight: 800, color: "var(--blue-ink)" }}>{leadSignal(lead)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card dashboard-panel dashboard-followup-panel" style={{ padding: 18, background: "var(--green-soft)" }}>
          <div className="row dashboard-panel-head" style={{ justifyContent: "space-between", marginBottom: 12 }}>
            <h3>Follow-ups due</h3>
            <span className="pill mono" style={{ background: "var(--green)", color: "var(--green-ink)" }}>{dueFollowups.length}</span>
          </div>
          <div className="col gap-2 dashboard-panel-list">
            {dueFollowups.length === 0 ? (
              <div className="dashboard-empty-state">
                <span><Icon name="check" size={22} /></span>
                <p>No follow-ups due right now.</p>
              </div>
            ) : dueFollowups.slice(0, 5).map(lead => (
              <div key={lead.job_id} onClick={() => openDrawer(lead)} className="lift dashboard-lead-row" style={{ padding: 10, borderRadius: "var(--radius-control)", border: "1px solid var(--line)", background: "var(--card)", cursor: "pointer" }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.title}</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 3 }}>{lead.company}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card dashboard-events-panel" style={{ padding: 18, background: "var(--yellow-soft)" }}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <h3>Recent agent events</h3>
          <button className="btn btn-ghost" onClick={() => setView("activity")} style={{ fontSize: 12 }}>See all <Icon name="arrow-right" size={12} /></button>
        </div>
        <div className="col gap-1" style={{ fontSize: 12 }}>
          {logs.slice(0, 6).map((ln, i) => (
              <div key={ln.id} className="row gap-3" style={{ padding: "7px 10px", borderRadius: "var(--radius-tight)", background: i === 0 ? "var(--card)" : "transparent" }}>
                <span className="mono tabular" style={{ fontSize: 10, color: "var(--ink-3)", minWidth: 50 }}>{ln.ts}</span>
                <span className={`mono event-kind-badge event-kind-${ln.kind}`}>{ln.kind}</span>
                <span style={{ fontSize: 12, flex: 1, color: "var(--ink-2)" }}>{ln.msg}</span>
              </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   JOB CARD (shared across tabs)
══════════════════════════════════════ */
