import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiFetch, WorkerTasksPayload } from "../types";

const EMPTY: WorkerTasksPayload = {
  enabled: false,
  concurrency: 0,
  active: [],
  recent: [],
  counts: { queued: 0, running: 0, succeeded: 0, failed: 0, cancelled: 0 },
};

export function useWorkerTasks(api: ApiFetch | null) {
  const [tasks, setTasks] = useState<WorkerTasksPayload>(EMPTY);
  const [loading, setLoading] = useState(true);
  const hasLoaded = useRef(false);

  const refresh = useCallback(async () => {
    if (!api) {
      hasLoaded.current = false;
      setTasks(EMPTY);
      setLoading(false);
      return;
    }
    try {
      if (!hasLoaded.current) setLoading(true);
      const r = await api("/api/v1/tasks?limit=20");
      if (!r.ok) throw new Error("tasks unavailable");
      setTasks(await r.json());
    } catch {
      setTasks(prev => ({ ...prev, enabled: false }));
    } finally {
      hasLoaded.current = true;
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 5000);
    const events = [
      "worker-task-refresh",
      "scan-done",
      "reevaluate-done",
      "leads-refresh",
    ];
    events.forEach(name => window.addEventListener(name, refresh));
    return () => {
      window.clearInterval(timer);
      events.forEach(name => window.removeEventListener(name, refresh));
    };
  }, [refresh]);

  return { tasks, refreshTasks: refresh, loading };
}
