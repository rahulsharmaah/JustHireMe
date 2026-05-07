import { useCallback, useEffect, useRef, useState } from "react";
import type { ConnSt, Lead, LogLine } from "../types";
import { showToast } from "../lib/toast";

export function useWS() {
  const browserDevBackend =
    import.meta.env.DEV
    && typeof window !== "undefined"
    && ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const devPort = Number(import.meta.env.VITE_JHM_PORT || 0) || (browserDevBackend ? 43118 : null);
  const devToken = import.meta.env.VITE_JHM_TOKEN || (browserDevBackend ? "local-dev-token" : null);
  const [conn, setConn] = useState<ConnSt>("disconnected");
  const [port, setPort] = useState<number | null>(devPort);
  const [apiToken, setApiToken] = useState<string | null>(devToken);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [beat, setBeat] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const idRef = useRef(0);

  const addLog = useCallback((msg: string, kind: LogLine["kind"], src = "sys") => {
    setLogs(p => [
      { id: idRef.current++, ts: String(idRef.current).padStart(4, "0"), msg, src, kind },
      ...p.slice(0, 149),
    ]);
  }, []);

  const connect = useCallback((p: number, token: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    setConn("connecting");
    const ws = new WebSocket(`ws://127.0.0.1:${p}/ws?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;
    ws.onopen    = () => { setConn("connected"); addLog("WebSocket connected", "system", "ws"); };
    ws.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.type === "heartbeat") {
          setBeat(d.beat);
          if (d.beat % 10 === 1)
            addLog(`Heartbeat #${d.beat} — uptime ${d.uptime_seconds.toFixed(0)}s`, "heartbeat", "hb");
        } else if (d.type === "agent") {
          addLog(d.msg ?? d.event, "agent", d.event ?? "agent");
          if (typeof d.event === "string" && d.event.startsWith("worker_")) {
            window.dispatchEvent(new CustomEvent("worker-task-refresh"));
            const message = String(d.msg || "");
            if (d.event === "worker_done" && message.includes("lead.generate")) {
              window.dispatchEvent(new CustomEvent("leads-refresh"));
              showToast({ id: "apply-package", tone: "success", title: "Package generated", message: "Resume and cover letter assets are ready." });
              if (d.job_id) showToast({ id: `generate-${d.job_id}`, tone: "success", title: "Generation complete" });
            }
            if (d.event === "worker_failed" && message.includes("lead.generate")) {
              window.dispatchEvent(new CustomEvent("leads-refresh"));
              showToast({ id: "apply-package", tone: "error", title: "Package failed", message: d.msg || "Document generation failed." });
              if (d.job_id) showToast({ id: `generate-${d.job_id}`, tone: "error", title: "Generation failed", message: d.msg || "Document generation failed." });
            }
          }
          if (d.event === "eval_done") window.dispatchEvent(new CustomEvent("scan-done"));
          if (d.event === "reeval_done") {
            window.dispatchEvent(new CustomEvent("reevaluate-done"));
            window.dispatchEvent(new CustomEvent("leads-refresh"));
          }
          if (d.event === "cleanup_done") {
            window.dispatchEvent(new CustomEvent("cleanup-done"));
            window.dispatchEvent(new CustomEvent("leads-refresh"));
          }
          if (d.event === "free_scout_done" || d.event === "free_scout_task_done") {
            window.dispatchEvent(new CustomEvent("worker-task-refresh"));
            window.dispatchEvent(new CustomEvent("leads-refresh"));
          }
          if (d.event === "auto_discard_done") window.dispatchEvent(new CustomEvent("leads-refresh"));
        } else if (d.type === "LEAD_UPDATED" && d.data) {
          window.dispatchEvent(new CustomEvent("lead-updated", { detail: d.data }));
        } else if (d.type === "HOT_X_LEAD" && d.data) {
          window.dispatchEvent(new CustomEvent("hot-x-lead", { detail: d.data }));
          if ("Notification" in window && Notification.permission === "granted") {
            const lead = d.data as Lead;
            new Notification("Hot X lead", { body: `${lead.company}: ${lead.title}` });
          }
        }
      } catch { /* ignore */ }
    };
    ws.onclose = () => { setConn("disconnected"); wsRef.current = null; setTimeout(() => connect(p, token), 3000); };
    ws.onerror = () => ws.close();
  }, [addLog]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const tauriInternals = typeof window !== "undefined"
      ? (window as Window & { __TAURI_INTERNALS__?: { invoke?: unknown; transformCallback?: unknown } }).__TAURI_INTERNALS__
      : undefined;
    const isTauri = Boolean(
      tauriInternals
      && typeof tauriInternals.invoke === "function"
      && typeof tauriInternals.transformCallback === "function",
    );
    (async () => {
      let token: string | null = null;
      let currentPort: number | null = null;
      if (devPort && devToken) {
        token = devToken;
        currentPort = devPort;
        connect(devPort, devToken);
      }
      if (!isTauri) return;
      const [{ invoke }, { listen }] = await Promise.all([
        import("@tauri-apps/api/core"),
        import("@tauri-apps/api/event"),
      ]);
      try { token = await invoke<string>("get_api_token"); setApiToken(token); } catch { /* not ready */ }
      try {
        const p = await invoke<number>("get_sidecar_port");
        currentPort = p;
        setPort(p);
        if (token) connect(p, token);
      } catch { /* not ready */ }
      try {
        unlisten = await listen<number>("sidecar-port", ev => {
          currentPort = ev.payload;
          setPort(ev.payload);
          if (token) connect(ev.payload, token);
        });
        const unlistenToken = await listen<string>("sidecar-token", ev => {
          token = ev.payload;
          setApiToken(ev.payload);
          if (currentPort) connect(currentPort, ev.payload);
        });
        const prevUnlisten = unlisten;
        unlisten = () => { prevUnlisten?.(); unlistenToken(); };
      } catch { /* browser dev mode */ }
    })();
    return () => { unlisten?.(); wsRef.current?.close(); };
  }, [connect, devPort, devToken]);

  return { conn, port, apiToken, logs, beat, addLog };
}
