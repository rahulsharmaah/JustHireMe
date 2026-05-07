import Icon from "./Icon";
import type { View } from "../types";

export function Topbar({ view, sidebarCollapsed, onToggleSidebar }: { view: View; sidebarCollapsed: boolean; onToggleSidebar: () => void }) {
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
      {view === "profile" && (
        <button className="btn" onClick={() => window.dispatchEvent(new CustomEvent("profile-export"))}>
          <Icon name="download" size={13} /> Export Graph
        </button>
      )}
    </header>
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
