import { useEffect, useMemo, useState } from "react";
import Icon from "./components/Icon";
import { AutomationSettings } from "./settings/AutomationSettings";
import { DiscoverySettings } from "./settings/DiscoverySettings";
import { GlobalSettings } from "./settings/GlobalSettings";
import { StepSettings } from "./settings/StepSettings";
import { EMPTY, getSettingsIssues, type Cfg, type SettingsSectionId } from "./settings/shared";
import type { ApiFetch } from "./types";
import { showToast } from "./lib/toast";

interface Props { api: ApiFetch; onClose: () => void; }

export default function SettingsModal({ api, onClose }: Props) {
  const [cfg, setCfg]       = useState<Cfg>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("models");
  const settingsIssues = useMemo(() => getSettingsIssues(cfg), [cfg]);

  useEffect(() => {
    api("/api/v1/settings")
      .then(r => r.json())
      .then(d => setCfg(c => ({ ...c, ...d })))
      .catch(() => {});
  }, [api]);

  const set = (k: keyof Cfg) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setCfg(c => ({ ...c, [k]: e.target.value }));

  const onChange = (k: keyof Cfg, v: string) => setCfg(c => ({ ...c, [k]: v }));

  const save = async () => {
    const issues = getSettingsIssues(cfg);
    const blockingIssue = issues.find(issue => issue.level === "error");
    if (blockingIssue) {
      setActiveSection(blockingIssue.section);
      showToast({ id: "settings-save", tone: "error", title: "Settings need attention", message: blockingIssue.message });
      return;
    }
    setSaving(true);
    showToast({ id: "settings-save", tone: "loading", title: issues.length ? "Saving with warnings" : "Saving settings", message: issues[0]?.message });
    try {
      const res = await api("/api/v1/settings", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cfg),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      if (cfg.x_enable_notifications === "true" && "Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
      setSaved(true); setTimeout(() => setSaved(false), 2000);
      showToast({ id: "settings-save", tone: "success", title: "Settings saved" });
    } catch (err: any) {
      showToast({ id: "settings-save", tone: "error", title: "Settings save failed", message: err?.message || "Please try again." });
    } finally { setSaving(false); }
  };

  const prov = cfg.llm_provider || "ollama";
  const sections = [
    { id: "models" as const, icon: "settings", label: "Model provider", sub: "Default LLM and keys" },
    { id: "steps" as const, icon: "layers", label: "Workflow steps", sub: "Per-step overrides" },
    { id: "discovery" as const, icon: "search", label: "Discovery", sub: "Sources and signals" },
    { id: "automation" as const, icon: "ghost", label: "Automation", sub: "Experimental browser lab" },
  ];

  return (
    <>
      <div className="drawer-backdrop settings-backdrop" onClick={onClose} />
      <section className="settings-modal" role="dialog" aria-modal="true" aria-label="Settings">
        <header className="settings-header">
          <div className="settings-title-block">
            <h2>Settings</h2>
            <p>Configure providers, workflow behavior, and discovery sources.</p>
          </div>
          <button className="btn btn-icon settings-close" onClick={onClose} aria-label="Close settings"><Icon name="x" size={15} /></button>
        </header>

        <div className="settings-body">
          <nav className="settings-nav" aria-label="Settings sections">
            {sections.map(section => {
              const active = activeSection === section.id;
              return (
                <button key={section.id} className={active ? "active" : ""} onClick={() => setActiveSection(section.id)}>
                  <span className="settings-nav-icon"><Icon name={section.icon} size={15} /></span>
                  <span>
                    <strong>{section.label}</strong>
                    <small>{section.sub}</small>
                  </span>
                </button>
              );
            })}
          </nav>

          <main className="settings-panel scroll">
            {activeSection === "models" && (
              <SettingsSectionHeading
                title="Model provider"
                description="Set the default provider used across the app. Step-specific overrides live in Workflow steps."
              />
            )}
            {activeSection === "steps" && (
              <SettingsSectionHeading
                title="Workflow steps"
                description="Keep most steps on the global default, and only override the parts that need a different provider or model."
              />
            )}
            {activeSection === "discovery" && (
              <SettingsSectionHeading
                title="Discovery"
                description="Tune job sources, public signals, contact lookup, and notification thresholds."
              />
            )}
            {activeSection === "automation" && (
              <SettingsSectionHeading
                title="Automation"
                description="Experimental browser controls for contributors and debugging."
              />
            )}

            <div className="settings-panel-content">
              {activeSection === "models" && <GlobalSettings cfg={cfg} set={set} onChange={onChange} prov={prov} api={api} issues={settingsIssues.filter(issue => issue.section === "models")} />}
              {activeSection === "steps" && <StepSettings cfg={cfg} onChange={onChange} issues={settingsIssues.filter(issue => issue.section === "steps")} />}
              {activeSection === "discovery" && <DiscoverySettings cfg={cfg} set={set} onChange={onChange} />}
              {activeSection === "automation" && <AutomationSettings cfg={cfg} onChange={onChange} />}
            </div>
          </main>
        </div>

        <footer className="settings-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-accent" onClick={save} disabled={saving} aria-busy={saving}>
            {saved ? "Saved" : saving ? "Saving..." : "Save settings"}
          </button>
        </footer>
      </section>
    </>
  );
}

function SettingsSectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="settings-panel-heading">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
