import Icon from "./Icon";
import type { View } from "../types";

type ThemeMode = "light" | "dark" | "device";

const NAV = [
  { id: "apply",     label: "Customize",     icon: "spark",  tone: "green"  },
  { id: "dashboard", label: "Dashboard",     icon: "home",   tone: "blue"   },
  { id: "inbox",     label: "Leads",         icon: "plus",   tone: "orange" },
  { id: "pipeline",  label: "Job Pipeline",  icon: "layers", tone: "purple" },
  { id: "jobs",      label: "Jobs",          icon: "pulse",  tone: "blue"   },
  { id: "graph",     label: "Knowledge",     icon: "graph",  tone: "green"  },
  { id: "activity",  label: "Activity",      icon: "pulse",  tone: "orange" },
  { id: "profile",   label: "Profile",       icon: "user",   tone: "pink"   },
  { id: "ingestion", label: "Add Context",   icon: "plus",   tone: "teal"   },
];

export function Sidebar({ view, setView, leadCounts, online, onSettings, onSetup, collapsed, onToggleCollapsed, themeMode, onThemeModeChange }: {
  view: View; setView: (v: View) => void;
  leadCounts: any; online: boolean;
  onSettings: () => void;
  onSetup?: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
}) {
  const cycleTheme = () => {
    onThemeModeChange(themeMode === "device" ? "dark" : themeMode === "dark" ? "light" : "device");
  };

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="row gap-3 sidebar-brand" style={{ padding: collapsed ? "4px 4px 18px 4px" : "4px 8px 18px 8px", justifyContent: collapsed ? "center" : "space-between" }}>
        <div className="row gap-3" style={{ minWidth: 0 }}>
        <Icon name="logo" size={32} />
          {!collapsed && (
            <div className="col" style={{ lineHeight: 1.1 }}>
              <div className="type-brand">JustHireMe</div>
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

      <div className="grow" />

      <div className={`sidebar-theme-switch ${collapsed ? "collapsed" : ""}`}>
        {!collapsed ? (
          <>
            <div className="sidebar-theme-label">Theme</div>
            <div className="sidebar-theme-options" role="group" aria-label="Theme mode">
              {([
                { id: "light", label: "Light", icon: "sun" },
                { id: "dark", label: "Dark", icon: "moon" },
                { id: "device", label: "Device", icon: "monitor" },
              ] as const).map(option => (
                <button
                  key={option.id}
                  type="button"
                  className={themeMode === option.id ? "active" : ""}
                  onClick={() => onThemeModeChange(option.id)}
                  title={`${option.label} theme`}
                >
                  <Icon name={option.icon} size={13} />
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <button
            type="button"
            className="sidebar-theme-cycle"
            onClick={cycleTheme}
            title={`Theme: ${themeMode}`}
            aria-label={`Theme: ${themeMode}`}
          >
            <Icon name={themeMode === "dark" ? "moon" : themeMode === "light" ? "sun" : "monitor"} size={15} />
          </button>
        )}
      </div>

      <button className="profile-add-context" onClick={collapsed ? onToggleCollapsed : onSetup} style={{ marginBottom: 10, minHeight: 40 }} title={collapsed ? "Expand sidebar" : "Setup"}>
        <Icon name={collapsed ? "arrow-right" : "spark"} size={14} /> {!collapsed && "Setup"}
      </button>

      <div className="card-flat" style={{ padding: 10, background: "var(--card)" }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          {!collapsed ? (
            <div className="col" style={{ gap: 2 }}>
              <div className="row gap-2">
                <span style={{
                  width: 8, height: 8, borderRadius: 2,
                  background: online ? "var(--accent)" : "var(--ink-4)",
                  border: "1px solid rgba(255,255,255,0.22)",
                }} />
                <span className="type-metric-label" style={{ color: "inherit" }}>{online ? "Online" : "Offline"}</span>
              </div>
            </div>
          ) : (
            <span style={{
              width: 9, height: 9, borderRadius: 2,
              background: online ? "var(--accent)" : "var(--ink-4)",
              border: "1px solid rgba(255,255,255,0.22)",
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
