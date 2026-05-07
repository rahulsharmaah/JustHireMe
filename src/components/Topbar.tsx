import Icon from "./Icon";
import type { View } from "../types";

export function Topbar({ view }: { view: View }) {
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
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>{titles[view]}</h2>
        <span className="pill mono" style={{ fontSize: 9.5, background: "var(--paper-3)", color: "var(--ink-3)" }}>
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
      width: 30, height: 30, borderRadius: 9,
      background: `var(--${tone})`, color: "#fff",
      display: "grid", placeItems: "center",
      boxShadow: `0 10px 22px var(--${tone}-soft)`,
    }}>
      <Icon name={icon} size={15} />
    </div>
    <div className="col" style={{ gap: 4 }}>
      <div className="display tabular" style={{ fontSize: 34, color: `var(--${tone}-ink)`, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 760, color: "var(--ink)" }}>{label}</div>
      <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{sub}</div>
    </div>
  </div>
);
