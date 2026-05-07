import { useState } from "react";
import Icon from "../components/Icon";
import type { ApiFetch, Lead } from "../types";
import { showToast } from "../lib/toast";

export function LeadInboxView({ port, api, onCreated }: { port: number | null; api: ApiFetch | null; onCreated: (l: Lead) => void }) {
  const kind = "job";
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [scanningFree, setScanningFree] = useState(false);

  const submit = async () => {
    if (!port || !api || busy) return;
    setBusy(true);
    setErr(null);
    showToast({ id: "lead-save", tone: "loading", title: "Saving lead", message: "Extracting signal and scoring fit." });
    try {
      const r = await api(`/api/v1/leads/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, url, text }),
      });
      if (!r.ok) {
        const detail = await r.json().then(d => d.detail).catch(() => "");
        throw new Error(detail || `Server returned ${r.status}`);
      }
      const lead = await r.json();
      setText("");
      setUrl("");
      onCreated(lead);
      showToast({ id: "lead-save", tone: "success", title: "Lead saved", message: lead.company ? `${lead.company} is ready to review.` : "New lead is ready to review." });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Lead save failed";
      setErr(message);
      showToast({ id: "lead-save", tone: "error", title: "Could not save lead", message });
    } finally {
      setBusy(false);
    }
  };

  const scanFree = async () => {
    if (!port || !api || scanningFree) return;
    setScanningFree(true);
    setErr(null);
    showToast({ id: "free-scout", tone: "loading", title: "Free scout started", message: "Scanning configured public sources." });
    try {
      const r = await api(`/api/v1/free-sources/scan`, { method: "POST" });
      if (!r.ok) throw new Error(`Free source scan returned ${r.status}`);
      showToast({ id: "free-scout", tone: "success", title: "Free scout queued", message: "Leads will refresh as results land." });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Free source scan failed";
      setErr(message);
      showToast({ id: "free-scout", tone: "error", title: "Free scout failed", message });
    } finally {
      setScanningFree(false);
    }
  };

  return (
    <div className="lead-inbox-page scroll">
      <div className="lead-inbox-shell">
        <div className="card lead-inbox-composer">
          <div className="lead-inbox-head">
            <div className="eyebrow">Manual lead inbox</div>
            <h2>Paste anything useful</h2>
          </div>
          <div className="lead-inbox-copy">
            Drop a job URL, founder post, Discord message, Reddit comment, HN lead, or client brief. The app extracts signal score and outreach drafts.
          </div>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="Source URL"
            className="mono field-input lead-url-input"
          />
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={12}
            placeholder={"Paste job text here...\n\nExample: AI Engineer role posted today. Python, FastAPI, React. Remote or hybrid. Include the seniority/years if visible."}
            className="field-input lead-text-input"
          />
          {err && <div style={{ color: "var(--bad)", fontSize: 12, marginTop: 10 }}>{err}</div>}
          <button className="btn btn-accent lead-save-action" onClick={submit} disabled={busy} aria-busy={busy}>
            <Icon name="plus" size={13} /> {busy ? "Saving..." : "Save and score lead"}
          </button>
        </div>

        <div className="lead-inbox-rail">
          <div className="card lead-source-card">
            <div className="eyebrow">Free sources</div>
            <h3>Run the free scout</h3>
            <div className="lead-rail-copy">
              Checks the configured ATS company watchlist plus GitHub issues, HN comments, and Reddit searches without paid scraping APIs.
            </div>
            <button className="btn lead-source-action" onClick={scanFree} disabled={scanningFree} aria-busy={scanningFree}>
              <Icon name="search" size={13} /> {scanningFree ? "Scanning..." : "Scan free sources"}
            </button>
          </div>
          <div className="card lead-playbook-card">
            <div className="eyebrow">Zero-cost playbook</div>
            <div className="lead-playbook-list">
              <div><b>1.</b> Paste high-signal leads as you browse.</div>
              <div><b>2.</b> Keep 10-30 target companies in Settings.</div>
              <div><b>3.</b> Use GitHub/HN/Reddit scans for founder and dev-community demand.</div>
              <div><b>4.</b> Mark contacted leads so follow-ups appear in the dashboard.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
