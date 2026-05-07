import Icon from "./Icon";
import type { View } from "../types";

const NAV = [
  { id: "apply",     label: "Customize",     icon: "spark",  tone: "green"  },
  { id: "dashboard", label: "Dashboard",     icon: "home",   tone: "blue"   },
  { id: "inbox",     label: "Leads",         icon: "plus",   tone: "orange" },
  { id: "pipeline",  label: "Job Pipeline",  icon: "layers", tone: "purple" },
  { id: "graph",     label: "Knowledge",     icon: "graph",  tone: "green"  },
  { id: "activity",  label: "Activity",      icon: "pulse",  tone: "orange" },
  { id: "profile",   label: "Profile",       icon: "user",   tone: "pink"   },
  { id: "ingestion", label: "Add Context",   icon: "plus",   tone: "teal"   },
];

export function Sidebar({ view, setView, leadCounts, online, port, beat, onSettings, onSetup, collapsed, onToggleCollapsed }: {
  view: View; setView: (v: View) => void;
  leadCounts: any; online: boolean; port: number | null; beat: number;
  onSettings: () => void;
  onSetup?: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="row gap-3 sidebar-brand" style={{ padding: collapsed ? "4px 4px 18px 4px" : "4px 8px 18px 8px", justifyContent: collapsed ? "center" : "space-between" }}>
        <div className="row gap-3" style={{ minWidth: 0 }}>
        <Icon name="logo" size={32} />
          {!collapsed && (
            <div className="col" style={{ lineHeight: 1.1 }}>
              <div className="type-brand">JustHireMe</div>
              <div className="type-version">v0.1-alpha</div>
            </div>
          )}
        </div>
        {!collapsed && (
          <button className="btn btn-icon sidebar-collapse-btn" onClick={onToggleCollapsed} aria-label="Collapse sidebar" title="Collapse sidebar">
            <Icon name="arrow-right" size={13} style={{ transform: "rotate(180deg)" }} />
          </button>
        )}
      </div>

      {!collapsed && <div className="eyebrow" style={{ padding: "0 12px", marginBottom: 4 }}>Workspace</div>}
      <div className="col gap-1">
        {NAV.map(n => {
          const active = view === n.id;
          const count = n.id === "pipeline" ? leadCounts.total : null;
          return (
            <div key={n.id} className={"nav-item " + (active ? "active" : "")} onClick={() => setView(n.id as View)} title={collapsed ? n.label : undefined}>
              <div className="nav-icon" style={{
                background: active ? "var(--ui-nav-icon-active-bg)" : "var(--ui-nav-icon-idle-bg)",
                color: active ? "var(--ui-nav-icon-active-color)" : "var(--ui-nav-icon-idle-color)",
                border: active ? "1px solid var(--ui-nav-icon-active-border)" : "1px solid var(--ui-nav-icon-idle-border)",
                boxShadow: active ? "var(--ui-nav-icon-active-shadow)" : "none",
              }}>
                <Icon name={n.icon} size={15} stroke={1.9} />
              </div>
              {!collapsed && <span style={{ flex: 1 }}>{n.label}</span>}
              {!collapsed && count != null && (
                <span className="mono tabular type-count-pill" style={{
                  color: active ? "#fff" : "rgba(255,255,255,0.42)",
                  background: active ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.06)",
                  padding: "2px 7px", borderRadius: "var(--radius-pill)",
                }}>{count}</span>
              )}
            </div>
          );
        })}
      </div>

      {!collapsed && <div className="eyebrow" style={{ padding: "16px 12px 4px 12px" }}>Status breakdown</div>}
      {!collapsed && <div className="col gap-1">
        {[
          ["evaluating",   "Evaluating",   "accent",  leadCounts.evaluating],
          ["approved",     "Approved",     "accent",  leadCounts.approved],
          ["applied",      "Applied",      "accent",  leadCounts.applied],
          ["interviewing", "Interviewing", "accent",  leadCounts.interviewing],
          ["accepted",     "Accepted",     "accent",  leadCounts.accepted],
          ["rejected",     "Rejected",     "accent",  leadCounts.rejected],
        ].map(([k, label, tone, n]) => (
          <div key={k} className="row" style={{
            padding: "7px 12px", fontSize: 12, color: "rgba(255,255,255,0.60)", justifyContent: "space-between",
            borderRadius: "var(--radius-tight)",
          }}>
            <div className="row gap-2">
              <span style={{ width: 8, height: 8, borderRadius: 3, background: `var(--${tone})`, border: `1px solid var(--${tone}-ink)`, opacity: 0.85 }} />
              <span>{label}</span>
            </div>
            <span className="mono tabular type-count-pill" style={{ color: "rgba(255,255,255,0.34)" }}>{n || 0}</span>
          </div>
        ))}
      </div>}

      <div className="grow" />

      <button className="profile-add-context" onClick={collapsed ? onToggleCollapsed : onSetup} style={{ marginBottom: 10, minHeight: 44 }} title={collapsed ? "Expand sidebar" : "Setup Guide"}>
        <Icon name={collapsed ? "arrow-right" : "spark"} size={14} style={collapsed ? undefined : undefined} /> {!collapsed && "Setup Guide"}
      </button>

      <div className="card-flat" style={{ padding: 10, background: "var(--card)" }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          {!collapsed ? (
            <div className="col" style={{ gap: 2 }}>
              <div className="row gap-2">
                <span style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: online ? "var(--ok)" : "var(--bad)",
                  boxShadow: `0 0 0 3px ${online ? 'rgba(46,211,163,0.18)' : 'rgba(240,82,104,0.18)'}`,
                  animation: online ? "blink 2s ease-in-out infinite" : "none",
                }} />
                <span className="type-metric-label" style={{ fontSize: "11.5px", color: "inherit" }}>{online ? `Online · :${port}` : "Offline"}</span>
              </div>
              <span className="mono tabular type-count-pill" style={{ color: "var(--ink-3)" }}>♥ {beat}</span>
            </div>
          ) : (
            <span style={{
              width: 9, height: 9, borderRadius: "50%",
              background: online ? "var(--ok)" : "var(--bad)",
              boxShadow: `0 0 0 3px ${online ? 'rgba(46,211,163,0.18)' : 'rgba(240,82,104,0.18)'}`,
              animation: online ? "blink 2s ease-in-out infinite" : "none",
              marginInline: "auto",
            }} />
          )}
          <button className="btn btn-icon" onClick={onSettings} aria-label="Settings"><Icon name="settings" size={15} /></button>
        </div>
      </div>
    </aside>
  );
}

/* ══════════════════════════════════════
   TOPBAR
══════════════════════════════════════ */
