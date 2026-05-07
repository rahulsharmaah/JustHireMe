import { useState } from "react";
import type { LogLine } from "../types";

export function ActivityView({ logs }: { logs: LogLine[] }) {
  const [actTab, setActTab] = useState<"all"|"scout"|"eval"|"customize"|"system">("all");
  return (
    <div className="activity-page scroll">
      <div className="activity-tabs">
        {(["all","scout","eval","customize","system"] as const).map(tab => (
          <button key={tab} className={actTab === tab ? "active" : ""} onClick={() => setActTab(tab)}>
            {tab === "all" ? "All" : tab === "scout" ? "Scout" : tab === "eval" ? "Eval" : tab === "customize" ? "Customize" : "System"}
          </button>
        ))}
      </div>
      <div className="card activity-hero">
        <span className="eyebrow">Real-time stream</span>
        <h1>Agent activity</h1>
        <p>Live backend events, scan updates, evaluation notes, and system status in one stream.</p>
      </div>
      <div className="card activity-stream-card">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <h3>Stream</h3>
          <span className="pill" style={{ background: "var(--green)", color: "#fff" }}>
            <span className="dot pulse-soft" /> live
          </span>
        </div>
        <div style={{ height: 440, display: "flex" }}>
          <div className="scroll terminal activity-terminal">
            {logs.filter(l => {
              if (actTab === "all") return l.kind !== "heartbeat";
              if (actTab === "scout") return l.src === "scout" || (l.kind === "agent" && l.msg.toLowerCase().includes("scout"));
              if (actTab === "eval")  return l.src === "eval"  || (l.kind === "agent" && (l.msg.toLowerCase().includes("eval") || l.msg.toLowerCase().includes("scor")));
              if (actTab === "customize") return l.src === "apply" || (l.kind === "agent" && (l.msg.toLowerCase().includes("custom") || l.msg.toLowerCase().includes("generat") || l.msg.toLowerCase().includes("package")));
              if (actTab === "system") return l.kind === "system";
              return true;
            }).map((ln) => {
              const tone = ln.kind === "heartbeat" ? "blue" : ln.kind === "agent" ? "green" : "yellow";
              return (
                <div key={ln.id} className="row gap-3" style={{ marginBottom: 5, alignItems: "baseline" }}>
                  <span className="mono tabular activity-log-time">{ln.ts}</span>
                  <span className="mono activity-log-kind" style={{ background: `var(--${tone})`, color: `var(--${tone}-ink)` }}>{ln.kind}</span>
                  <span className="activity-log-source">{ln.src}</span>
                  <span style={{ flex: 1 }}>{ln.msg}</span>
                </div>
              );
            })}
            <div className="row gap-2" style={{ marginTop: 4 }}>
              <span style={{ color: "var(--accent)" }}>›</span>
              <span className="blink">▌</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   PROFILE VIEW
══════════════════════════════════════ */
