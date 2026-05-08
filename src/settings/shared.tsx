import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import Icon from "../components/Icon";

export interface Cfg {
  llm_provider: string;
  anthropic_key: string; openai_api_key: string; openai_model: string;
  deepseek_api_key: string; groq_api_key: string; nvidia_api_key: string;
  nvidia_model: string; ollama_url: string; ollama_model: string;
  scout_provider: string;     scout_api_key: string;     scout_model: string;
  evaluator_provider: string; evaluator_api_key: string; evaluator_model: string;
  generator_provider: string; generator_api_key: string; generator_model: string;
  ingestor_provider: string;  ingestor_api_key: string;  ingestor_model: string;
  actuator_provider: string;  actuator_api_key: string;  actuator_model: string;
  apify_token: string; apify_actor: string; linkedin_cookie: string; x_bearer_token: string; x_search_queries: string; x_watchlist: string;
  hunter_api_key: string; proxycurl_api_key: string; contact_lookup_enabled: string;
  x_max_requests_per_scan: string; x_max_results_per_query: string; x_min_signal_score: string; x_hot_lead_threshold: string; x_enable_notifications: string;
  free_sources_enabled: string; free_source_targets: string; company_watchlist: string; free_source_max_requests: string; free_source_min_signal_score: string;
  job_boards: string; job_market_focus: string;
  ghost_mode: string; auto_apply: string; headed_browser: string;
}

export const EMPTY: Cfg = {
  llm_provider: "ollama",
  anthropic_key: "", openai_api_key: "", openai_model: "gpt-4o-mini",
  deepseek_api_key: "", groq_api_key: "", nvidia_api_key: "",
  nvidia_model: "z-ai/glm-5.1", ollama_url: "http://localhost:11434/v1", ollama_model: "gemma2",
  scout_provider: "", scout_api_key: "", scout_model: "",
  evaluator_provider: "", evaluator_api_key: "", evaluator_model: "",
  generator_provider: "", generator_api_key: "", generator_model: "",
  ingestor_provider: "", ingestor_api_key: "", ingestor_model: "",
  actuator_provider: "", actuator_api_key: "", actuator_model: "",
  apify_token: "", apify_actor: "", linkedin_cookie: "", x_bearer_token: "", x_search_queries: "", x_watchlist: "",
  hunter_api_key: "", proxycurl_api_key: "", contact_lookup_enabled: "true",
  x_max_requests_per_scan: "5", x_max_results_per_query: "50", x_min_signal_score: "60", x_hot_lead_threshold: "80", x_enable_notifications: "false",
  free_sources_enabled: "false", free_source_targets: "", company_watchlist: "", free_source_max_requests: "20", free_source_min_signal_score: "60",
  job_boards: "", job_market_focus: "global",
  ghost_mode: "false", auto_apply: "false", headed_browser: "false",
};

export const PROVIDERS = [
  { id: "deepseek",  label: "DeepSeek",  tone: "teal",   sub: "V3 / R1"   },
  { id: "nvidia",    label: "NVIDIA",    tone: "green",  sub: "GLM / NIM" },
  { id: "groq",      label: "Groq",      tone: "orange", sub: "Llama 3.3" },
  { id: "openai",    label: "OpenAI",    tone: "blue",   sub: "GPT-4o"    },
  { id: "anthropic", label: "Anthropic", tone: "purple", sub: "Claude"    },
  { id: "ollama",    label: "Ollama",    tone: "pink",   sub: "Local"     },
];

export const MODEL_HINTS: Record<string, string[]> = {
  deepseek:  ["deepseek-chat", "deepseek-reasoner"],
  nvidia:    ["z-ai/glm-5.1", "meta/llama-3.1-70b-instruct", "nvidia/llama-3.3-nemotron-super-49b-v1"],
  groq:      ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
  openai:    ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"],
  anthropic: ["claude-sonnet-4-6", "claude-haiku-4-5-20251001", "claude-opus-4-6"],
  ollama:    ["gemma2", "llama3.2", "mistral", "qwen2.5", "codellama"],
};

export const STEPS = [
  { id: "scout",     label: "Scout",     icon: "search", tone: "blue",
    desc: "Discovers job listings — a fast cheap model is ideal here" },
  { id: "evaluator", label: "Evaluator", icon: "pulse",  tone: "purple",
    desc: "Scores job fit — use a reasoning model (DeepSeek R1) for best results" },
  { id: "generator", label: "Generator", icon: "file",   tone: "orange",
    desc: "Writes tailored resumes + cover letters — quality matters here" },
  { id: "ingestor",  label: "Ingestor",  icon: "upload", tone: "green",
    desc: "Parses your resume into the knowledge graph" },
  { id: "actuator",  label: "Experimental Actuator",  icon: "ghost",  tone: "pink",
    desc: "Unsupported browser automation lab — not part of the core OSS workflow" },
];

export const GLOBAL_SOURCE_PRESET = [
  "hn-hiring,",
  "https://remoteok.com/api,",
  "https://remotive.com/api/remote-jobs?search=junior,",
  "https://remotive.com/api/remote-jobs?search=python,",
  "https://remotive.com/api/remote-jobs?search=react,",
  "https://remotive.com/api/remote-jobs?search=ai,",
  "https://jobicy.com/api/v2/remote-jobs?count=50&tag=python,",
  "https://jobicy.com/api/v2/remote-jobs?count=50&tag=react,",
  "https://jobicy.com/feed/newjobs,",
  "https://weworkremotely.com/categories/remote-programming-jobs.rss,",
  "https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss,",
  "site:boards.greenhouse.io,",
  "site:jobs.lever.co,",
  "site:jobs.ashbyhq.com,",
  "site:apply.workable.com,",
  "site:wellfound.com/jobs,",
  "site:linkedin.com/jobs,",
  "site:indeed.com/jobs,",
  "site:naukri.com,",
  "site:instahyre.com,",
  "site:cutshort.io/jobs,",
].join("\n");

export const INDIA_SOURCE_PRESET = [
  "site:wellfound.com/jobs India startup,",
  "site:cutshort.io/jobs software engineer India startup,",
  "site:instahyre.com software engineer India,",
  "site:naukri.com software engineer startup India,",
  "site:linkedin.com/jobs software engineer India startup,",
  "site:indeed.com/jobs software engineer India startup,",
  "site:boards.greenhouse.io India,",
  "site:jobs.lever.co India,",
  "site:jobs.ashbyhq.com India,",
  "site:apply.workable.com India,",
].join("\n");

export const KEY_FIELD: Record<string, keyof Cfg> = {
  anthropic: "anthropic_key", groq: "groq_api_key",
  nvidia: "nvidia_api_key", openai: "openai_api_key", deepseek: "deepseek_api_key",
};

export type SettingsSectionId = "appearance" | "models" | "steps" | "discovery" | "automation";

export interface SettingsIssue {
  section: SettingsSectionId;
  field: keyof Cfg;
  level: "error" | "warning";
  message: string;
}

export const providerLabel = (provider: string) =>
  PROVIDERS.find(p => p.id === provider)?.label || provider || "Provider";

export const isConfiguredSecret = (value: string | undefined) => {
  const raw = String(value || "").trim();
  return !!raw;
};

export const hasProviderCredential = (cfg: Cfg, provider: string, stepKey?: keyof Cfg) => {
  if (!provider || provider === "ollama") return true;
  if (stepKey && isConfiguredSecret(cfg[stepKey] as string)) return true;
  const globalKey = KEY_FIELD[provider];
  return !!globalKey && isConfiguredSecret(cfg[globalKey] as string);
};

export const hasProviderModel = (cfg: Cfg, provider: string, stepModelKey?: keyof Cfg) => {
  if (stepModelKey && String(cfg[stepModelKey] || "").trim()) return true;
  if (provider === "ollama") return !!String(cfg.ollama_model || "").trim();
  if (provider === "openai") return !!String(cfg.openai_model || "").trim();
  if (provider === "nvidia") return !!String(cfg.nvidia_model || "").trim();
  return true;
};

export const getSettingsIssues = (cfg: Cfg): SettingsIssue[] => {
  const issues: SettingsIssue[] = [];
  const globalProvider = cfg.llm_provider || "ollama";

  if (globalProvider === "ollama") {
    if (!String(cfg.ollama_url || "").trim()) {
      issues.push({ section: "models", field: "ollama_url", level: "error", message: "Ollama needs a base URL before settings can be saved." });
    }
    if (!String(cfg.ollama_model || "").trim()) {
      issues.push({ section: "models", field: "ollama_model", level: "warning", message: "Choose a local Ollama model such as gemma2, llama3.2, or mistral." });
    }
  } else if (!hasProviderCredential(cfg, globalProvider)) {
    issues.push({ section: "models", field: KEY_FIELD[globalProvider] || "llm_provider", level: "error", message: `${providerLabel(globalProvider)} needs an API key before settings can be saved.` });
  }

  if (!hasProviderModel(cfg, globalProvider)) {
    issues.push({
      section: "models",
      field: globalProvider === "nvidia" ? "nvidia_model" : globalProvider === "ollama" ? "ollama_model" : "openai_model",
      level: "warning",
      message: `${providerLabel(globalProvider)} has no model selected.`,
    });
  }

  for (const step of STEPS) {
    const provKey = `${step.id}_provider` as keyof Cfg;
    const apiKey = `${step.id}_api_key` as keyof Cfg;
    const modelKey = `${step.id}_model` as keyof Cfg;
    const stepProvider = String(cfg[provKey] || "").trim();
    if (!stepProvider) continue;
    if (stepProvider === "ollama" && !String(cfg.ollama_url || "").trim()) {
      issues.push({ section: "steps", field: provKey, level: "error", message: `${step.label} is set to Ollama, but the Ollama URL is missing.` });
    }
    if (stepProvider !== "ollama" && !hasProviderCredential(cfg, stepProvider, apiKey)) {
      issues.push({ section: "steps", field: apiKey, level: "error", message: `${step.label} uses ${providerLabel(stepProvider)}, but no usable API key is configured.` });
    }
    if (!String(cfg[modelKey] || "").trim()) {
      issues.push({ section: "steps", field: modelKey, level: "warning", message: `${step.label} has a provider override but no model selected.` });
    }
  }

  return issues;
};

/* helpers */
export function LabelledField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-semibold text-[color:var(--ink-2)]">{label}</span>
        {hint && <span className="text-[11px] text-[color:var(--ink-3)]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function SectionLabel({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <span className="text-[13px] font-bold">{label}</span>
      {sub && <span className="font-mono text-[11px] text-[color:var(--ink-3)]">{sub}</span>}
    </div>
  );
}

export function ProviderPills({ value, onChange, small }: { value: string; onChange: (v: string) => void; small?: boolean }) {
  return (
    <div className={cn("flex flex-wrap", small ? "gap-1.5" : "gap-2")}>
      {PROVIDERS.map(p => {
        const active = value === p.id;
        return (
          <Button
            key={p.id}
            type="button"
            variant="outline"
            size={small ? "sm" : "default"}
            onClick={() => onChange(p.id)}
            className={cn(
              "h-auto cursor-pointer flex-col items-center justify-center rounded-[11px] border-[1.5px] bg-[color:var(--card)] shadow-none transition-all",
              small ? "min-w-0 gap-0.5 px-2.5 py-1.5 rounded-lg" : "min-w-[78px] gap-1.5 px-3 py-2.5",
              active
                ? `border-[color:var(--${p.tone})] bg-[color:var(--${p.tone}-soft)] text-[color:var(--${p.tone}-ink)]`
                : "border-[color:var(--line)] text-[color:var(--ink-2)]"
            )}
          >
            <span className={cn(small ? "text-[12px]" : "text-[13px]", "font-semibold")}>{p.label}</span>
            {!small && <span className="font-mono text-[9.5px] text-[color:var(--ink-3)]">{p.sub}</span>}
          </Button>
        );
      })}
    </div>
  );
}

export function ModelChips({ provider, value, onChange }: { provider: string; value: string; onChange: (v: string) => void }) {
  const hints = MODEL_HINTS[provider] || [];
  const placeholder = hints[0] || "model-id";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {hints.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {hints.map(m => (
            <Button
              key={m}
              type="button"
              variant={value === m ? "default" : "outline"}
              size="sm"
              onClick={() => onChange(m)}
              className={cn(
                "h-7 rounded-md px-2.5 font-mono text-[11px] shadow-none",
                value === m
                  ? "bg-[color:var(--ink)] text-[color:var(--paper)]"
                  : "border-[color:var(--line)] bg-[color:var(--paper-3)] text-[color:var(--ink-3)]"
              )}
            >
              {m}
            </Button>
          ))}
        </div>
      )}
      <Input type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder={`custom model — e.g. ${placeholder}`}
        className="mono field-input"
        style={{ width: "100%", fontSize: 12 }}
      />
    </div>
  );
}

export function ApiKeyInput({ value, onChange, provider, isStep, disabled = false, placeholder }: {
  value: string; onChange: (v: string) => void; provider: string; isStep?: boolean; disabled?: boolean; placeholder?: string;
}) {
  if (provider === "ollama") return null;
  const ph: Record<string, string> = { anthropic: "sk-ant-••••", groq: "gsk_••••", nvidia: "nvapi-••••", openai: "sk-••••", deepseek: "sk-••••" };
  return (
    <Input type="password" value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
      placeholder={placeholder || (isStep ? `API key for ${provider}` : ph[provider] || "API key")}
      className="mono field-input"
      style={{ width: "100%", fontSize: 12, opacity: disabled ? 0.75 : 1, cursor: disabled ? "not-allowed" : "text" }}
    />
  );
}

export function StepCard({ step, cfg, onChange, issues = [] }: { step: typeof STEPS[0]; cfg: Cfg; onChange: (k: keyof Cfg, v: string) => void; issues?: SettingsIssue[] }) {
  const provKey  = `${step.id}_provider` as keyof Cfg;
  const apiKey   = `${step.id}_api_key`  as keyof Cfg;
  const modelKey = `${step.id}_model`    as keyof Cfg;
  const isCustom = !!(cfg[provKey] as string);
  const stepProv = (cfg[provKey] as string) || cfg.llm_provider || "ollama";
  const [forceStepKey, setForceStepKey] = useState(false);
  const usesGlobalKey = stepProv !== "ollama" && !forceStepKey && !(cfg[apiKey] as string);
  const keySourceLabel = stepProv === cfg.llm_provider
    ? `Use global ${stepProv} API key`
    : `Use saved ${stepProv} API key`;
  const missingCredential = isCustom && stepProv !== "ollama" && !hasProviderCredential(cfg, stepProv, apiKey);
  const missingModel = isCustom && !String(cfg[modelKey] || "").trim();
  const enable  = () => { setForceStepKey(false); onChange(provKey, cfg.llm_provider || "ollama"); };
  const disable = () => { setForceStepKey(false); onChange(provKey, ""); onChange(apiKey, ""); onChange(modelKey, ""); };

  return (
    <Card
      className={cn(
        "gap-0 rounded-[14px] border-[1.5px] py-0 shadow-none transition-all",
        isCustom
          ? `border-[color:var(--${step.tone})] bg-[color:var(--card)]`
          : "border-[color:var(--line)] bg-[color:var(--paper-2)]"
      )}
    >
      <CardHeader className={cn("px-3.5 py-3.5", isCustom ? "pb-3" : "pb-3.5")}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "grid size-[26px] shrink-0 place-items-center rounded-[7px]",
                  isCustom
                    ? `bg-[color:var(--${step.tone}-soft)] text-[color:var(--${step.tone}-ink)]`
                    : "bg-[color:var(--paper-3)] text-[color:var(--ink-3)]"
                )}
              >
                <Icon name={step.icon} size={13} />
              </div>
              <CardTitle className="text-[13px] font-bold">{step.label}</CardTitle>
              {isCustom && (
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.1em] shadow-none",
                    `border-[color:var(--${step.tone})] bg-[color:var(--${step.tone}-soft)] text-[color:var(--${step.tone}-ink)]`
                  )}
                >
                  {stepProv}{cfg[modelKey] ? ` · ${cfg[modelKey]}` : ""}
                </Badge>
              )}
            </div>
            <div className="pl-[33px] text-[11.5px] leading-[1.4] text-[color:var(--ink-3)]">{step.desc}</div>
          </div>
          <Button
            type="button"
            variant={isCustom ? "default" : "outline"}
            size="sm"
            onClick={isCustom ? disable : enable}
            className={cn(
              "h-7 shrink-0 rounded-full border-[1.5px] px-3 font-mono text-[11px] uppercase tracking-[0.08em] shadow-none",
              isCustom
                ? "border-[color:var(--ink)] bg-[color:var(--ink)] text-[color:var(--paper)]"
                : "border-[color:var(--line)] bg-[color:var(--paper-3)] text-[color:var(--ink-3)]"
            )}
          >
            {isCustom ? "reset" : "override"}
          </Button>
        </div>
      </CardHeader>
      {isCustom && (
        <CardContent className="flex flex-col gap-2.5 px-3.5 pb-3.5">
          {issues.length > 0 && (
            <div className="settings-alert-stack">
              {issues.map(issue => (
                <div key={`${issue.field}-${issue.message}`} className={`settings-alert ${issue.level}`}>
                  {issue.message}
                </div>
              ))}
            </div>
          )}
            <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7 }}>Provider</div>
            <ProviderPills value={stepProv} onChange={v => { setForceStepKey(false); onChange(provKey, v); onChange(apiKey, ""); }} small />
          </div>
          {stepProv !== "ollama" && (
            <div className="flex flex-col gap-1.5">
              <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[color:var(--ink-2)] select-none">
                <Switch
                  checked={usesGlobalKey}
                  onCheckedChange={checked => {
                    if (checked) {
                      setForceStepKey(false);
                      onChange(apiKey, "");
                    } else {
                      setForceStepKey(true);
                    }
                  }}
                  size="sm"
                />
                <span>{keySourceLabel}</span>
              </label>
              <ApiKeyInput
                value={usesGlobalKey ? "" : (cfg[apiKey] as string)}
                onChange={v => { setForceStepKey(true); onChange(apiKey, v); }}
                provider={stepProv}
                isStep
                disabled={usesGlobalKey}
                placeholder={usesGlobalKey ? "Using global key; choose any model below" : `Optional ${stepProv} key for this step`}
              />
              {missingCredential && (
                <div className="settings-inline-warning">Add a step key, or configure a saved {providerLabel(stepProv)} key in Model provider.</div>
              )}
            </div>
          )}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7 }}>Model</div>
            <ModelChips provider={stepProv} value={cfg[modelKey] as string} onChange={v => onChange(modelKey, v)} />
            {missingModel && (
              <div className="settings-inline-warning">Pick a model for this override or reset the step to global.</div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function BigToggle({ active, onToggle, icon, label, badge, sub, tone }: { active: boolean; onToggle: () => void; icon: string; label: string; badge: string; sub: string; tone: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-[14px] border px-3.5 py-3.5 text-left transition-all",
        active
          ? `border-[color:var(--${tone})] bg-[color:var(--${tone}-soft)]`
          : "border-[color:var(--line)] bg-[color:var(--paper-2)]"
      )}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-[9px] transition-all",
            active
              ? `bg-[color:var(--${tone})] text-[color:var(--${tone}-ink)]`
              : "bg-[color:var(--paper-3)] text-[color:var(--ink-3)]"
          )}
        >
          <Icon name={icon} size={15} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold">{label}</span>
            <Badge
              variant="outline"
              className={cn(
                "rounded-full px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] shadow-none",
                active
                  ? `border-[color:var(--${tone})] bg-[color:var(--${tone})] text-[color:var(--${tone}-ink)]`
                  : "border-[color:var(--line)] bg-[color:var(--paper-3)] text-[color:var(--ink-3)]"
              )}
            >
              {badge}
            </Badge>
          </div>
          <div className="mt-0.5 text-[11.5px] text-[color:var(--ink-3)]">{sub}</div>
        </div>
      </div>
      <Switch
        checked={active}
        onCheckedChange={onToggle}
        onClick={e => e.stopPropagation()}
      />
    </button>
  );
}

export function FieldInput(props: React.ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      className={cn("mono field-input w-full bg-[color:var(--card)] text-[12px]", props.className)}
    />
  );
}

export function FieldTextarea(props: React.ComponentProps<typeof Textarea>) {
  return (
    <Textarea
      {...props}
      className={cn("mono field-input w-full bg-[color:var(--card)] text-[11.5px] leading-[1.6]", props.className)}
    />
  );
}
