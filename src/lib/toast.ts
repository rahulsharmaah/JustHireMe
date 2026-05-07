export type ToastTone = "success" | "error" | "loading" | "info";

export type AppToast = {
  id?: string;
  tone: ToastTone;
  title: string;
  message?: string;
  duration?: number;
};

export function showToast(toast: AppToast) {
  window.dispatchEvent(new CustomEvent<AppToast>("app-toast", { detail: toast }));
}
