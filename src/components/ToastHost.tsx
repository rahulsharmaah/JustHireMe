import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import type { AppToast } from "../lib/toast";

type LiveToast = Required<Pick<AppToast, "id" | "tone" | "title">> & Omit<AppToast, "id" | "tone" | "title">;

const DEFAULT_DURATION = 3800;
const LOADING_DURATION = 45000;

export function ToastHost() {
  const [toasts, setToasts] = useState<LiveToast[]>([]);
  const timers = useRef(new Map<string, number>());

  useEffect(() => {
    const dismiss = (id: string) => {
      const timer = timers.current.get(id);
      if (timer) window.clearTimeout(timer);
      timers.current.delete(id);
      setToasts(prev => prev.filter(t => t.id !== id));
    };

    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<AppToast>).detail;
      if (!detail?.title) return;
      const id = detail.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const toast: LiveToast = {
        ...detail,
        id,
        tone: detail.tone || "info",
        title: detail.title,
      };

      const previousTimer = timers.current.get(id);
      if (previousTimer) window.clearTimeout(previousTimer);

      setToasts(prev => [toast, ...prev.filter(t => t.id !== id)].slice(0, 4));

      if (toast.tone === "loading") {
        timers.current.set(id, window.setTimeout(() => {
          setToasts(prev => prev.map(t => (
            t.id === id
              ? {
                  ...t,
                  tone: "info",
                  title: `${t.title} is still running`,
                  message: t.message || "You can keep working while this finishes.",
                  duration: 6000,
                }
              : t
          )));
          timers.current.set(id, window.setTimeout(() => dismiss(id), 6000));
        }, toast.duration ?? LOADING_DURATION));
      } else {
        const duration = toast.duration ?? DEFAULT_DURATION;
        timers.current.set(id, window.setTimeout(() => dismiss(id), duration));
      }
    };

    window.addEventListener("app-toast", onToast);
    return () => {
      window.removeEventListener("app-toast", onToast);
      timers.current.forEach(timer => window.clearTimeout(timer));
      timers.current.clear();
    };
  }, []);

  const close = (id: string) => {
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      <AnimatePresence initial={false}>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 18, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={`toast toast-${toast.tone}`}
          >
            <div className="toast-icon">
              {toast.tone === "loading" ? <span className="spinner toast-spinner" /> : (
                <Icon name={toast.tone === "success" ? "check" : toast.tone === "error" ? "x" : "spark"} size={15} />
              )}
            </div>
            <div className="toast-copy">
              <strong>{toast.title}</strong>
              {toast.message && <span>{toast.message}</span>}
            </div>
            <button className="toast-close" onClick={() => close(toast.id)} aria-label="Dismiss notification">
              <Icon name="x" size={13} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
