import type { Cfg, SettingsIssue } from "./shared";
import { SectionLabel, STEPS, StepCard } from "./shared";

export function StepSettings({ cfg, onChange, issues = [] }: { cfg: Cfg; onChange: (k: keyof Cfg, v: string) => void; issues?: SettingsIssue[] }) {
  return (
    <>
{/* 2. Per-step */}
          <div>
            <SectionLabel label="Per-Step Configuration" sub="reuse the global key, or give any step its own provider, key & model" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {STEPS.map(step => (
                <StepCard
                  key={step.id}
                  step={step}
                  cfg={cfg}
                  onChange={onChange}
                  issues={issues.filter(issue => String(issue.field).startsWith(step.id))}
                />
              ))}
            </div>
          </div>
    </>
  );
}
