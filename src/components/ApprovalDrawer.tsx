import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { openUrl } from "@tauri-apps/plugin-opener";
import Icon from "./Icon";
import type { ApiFetch, ApplyPreviewResult, ApplyRunResult, KeywordCoverage, Lead } from "../types";
import { cleanLeadText, getTone, leadDisplayHeading } from "../lib/leadUtils";
import { FormReader } from "./FormReader";
import { showToast } from "../lib/toast";

function formatTimelineAction(action: string) {
  const raw = String(action || "").trim();
  if (!raw) return { label: "Activity recorded", detail: "" };
  if (raw.startsWith("created")) return { label: "Lead discovered", detail: raw.replace(/^created\s*/, "") };
  if (raw.startsWith("score=")) {
    const score = raw.match(/score=(\d+)/)?.[1];
    const status = raw.match(/status=([^\s]+)/)?.[1]?.replace("preserved:", "");
    return { label: "Lead scored", detail: [score ? `${score}/100 match` : "", status ? `Status ${status.replace(/_/g, " ")}` : ""].filter(Boolean).join(" - ") };
  }
  if (raw.startsWith("assets=") || raw.startsWith("asset=")) return { label: "Package generated", detail: raw.replace(/^assets?=/, "") };
  if (raw.startsWith("contact_lookup=")) return { label: "Contact lookup", detail: raw.replace("contact_lookup=", "").replace(/_/g, " ") };
  if (raw === "submitted application") return { label: "Application submitted", detail: "" };
  if (raw.startsWith("status_changed=")) return { label: "Status changed", detail: raw.replace("status_changed=", "").replace(/_/g, " ") };
  if (raw.startsWith("feedback=")) return { label: "Feedback saved", detail: raw.replace("feedback=", "").replace(/_/g, " ") };
  if (raw.startsWith("followup_due=")) return { label: "Follow-up scheduled", detail: raw.replace("followup_due=", "") };
  return { label: raw.includes(":") ? raw.split(":")[0] : "Activity recorded", detail: raw.includes(":") ? raw.split(":").slice(1).join(":").trim() : raw };
}

function formatTimelineTime(ts: string) {
  if (!ts) return "";
  const normalized = ts.includes("T") ? ts : `${ts.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return ts;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function ApprovalDrawer({ j, api, onClose, onFired }: {
  j: Lead; api: ApiFetch; onClose: () => void; onFired: () => void;
}) {
  type DocKind = "resume" | "cover";
  type VersionEntry = { version: number; resume?: string; cover_letter?: string };
  const [done,   setDone]   = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeDoc, setActiveDoc] = useState<DocKind>("resume");
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoadErr, setPdfLoadErr] = useState<string | null>(null);
  const [pdfRetry, setPdfRetry] = useState(0);
  const [generateErr, setGenerateErr] = useState<string | null>(null);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineMsg, setPipelineMsg] = useState<string | null>(null);
  const [feedbackBusy, setFeedbackBusy] = useState<string | null>(null);
  const [feedbackErr, setFeedbackErr] = useState<string | null>(null);
  const [followupBusy, setFollowupBusy] = useState<number | null>(null);
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [versionErr, setVersionErr] = useState<string | null>(null);
  const [experimentalAutoApply, setExperimentalAutoApply] = useState(false);
  const [applyBusy, setApplyBusy] = useState<"preview" | "fill" | "submit" | null>(null);
  const [applyPreview, setApplyPreview] = useState<ApplyPreviewResult | null>(null);
  const [applyResult, setApplyResult] = useState<ApplyRunResult | null>(null);
  const [applyErr, setApplyErr] = useState<string | null>(null);

  const resumeReady = Boolean(j.resume_asset || j.asset);
  const coverReady = Boolean(j.cover_letter_asset);
  const currentVersion = versions[0]?.version ?? j.resume_version ?? null;
  const selectedVersionRecord = selectedVersion
    ? versions.find(v => v.version === selectedVersion)
    : null;
  const activeReady = selectedVersionRecord
    ? Boolean(activeDoc === "resume" ? selectedVersionRecord.resume : selectedVersionRecord.cover_letter)
    : activeDoc === "resume" ? resumeReady : coverReady;
  const activeDocPath = activeReady
    ? `/api/v1/leads/${j.job_id}/pdf?kind=${activeDoc === "resume" ? "resume" : "cover_letter"}${selectedVersionRecord ? `&version=${selectedVersionRecord.version}` : ""}`
    : null;
  const selectedProjects = j.selected_projects || [];
  const coverage = (j.keyword_coverage || j.source_meta?.keyword_coverage || {}) as KeywordCoverage;
  const missingTerms: string[] = Array.isArray(coverage.missing_terms) ? coverage.missing_terms : [];
  const incorporatedTerms: string[] = Array.isArray(coverage.incorporated_terms) ? coverage.incorporated_terms : [];
  const coveredTerms: string[] = Array.isArray(coverage.covered_terms) ? coverage.covered_terms : [];
  const coveragePct = typeof coverage.coverage_pct === "number" ? coverage.coverage_pct : null;
  const hasCoverage = missingTerms.length > 0 || incorporatedTerms.length > 0 || coveredTerms.length > 0;
  const qualityScore = Number(j.lead_quality_score || j.source_meta?.lead_quality_score || 0);
  const qualityReason = String(j.lead_quality_reason || j.source_meta?.lead_quality_reason || "");
  const timeline = (j.events || []).slice().reverse();
  const canPreviewApply = resumeReady && coverReady && !applyBusy;
  const canFillApply = Boolean(applyPreview?.can_fill) && !applyBusy;
  const canSubmitApply = experimentalAutoApply && Boolean(applyResult?.ready_to_submit || applyPreview?.can_submit) && !applyBusy;
  const display = leadDisplayHeading(j);
  const originalTitle = cleanLeadText(j.title);
  const descriptionText = cleanLeadText(j.description);
  const jobDescription = [
    originalTitle && originalTitle !== display.role ? `Original listing title:\n${originalTitle}` : "",
    descriptionText ? `Description:\n${descriptionText}` : "",
  ].filter(Boolean).join("\n\n") || "No job description extracted yet.";

  const loadVersions = useCallback(async () => {
    setVersionErr(null);
    try {
      const r = await api(`/api/v1/leads/${j.job_id}/versions`);
      if (!r.ok) throw new Error(`Server returned ${r.status}`);
      const items = await r.json() as VersionEntry[];
      setVersions(items);
      setSelectedVersion(prev => {
        if (prev && items.some(item => item.version === prev)) return prev;
        return items[0]?.version ?? null;
      });
    } catch (err) {
      setVersionErr(err instanceof Error ? err.message : "Version history failed to load");
    }
  }, [api, j.job_id]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions, j.resume_asset, j.cover_letter_asset, j.resume_version]);

  useEffect(() => {
    api("/api/v1/settings")
      .then(r => r.ok ? r.json() : {})
      .then((cfg: Record<string, string>) => setExperimentalAutoApply(cfg.auto_apply === "true"))
      .catch(() => setExperimentalAutoApply(false));
  }, [api]);

  // Tauri WebView blocks <iframe src="http://..."> for localhost � fetch as blob instead
  useEffect(() => {
    if (!activeDocPath) { setPdfBlobUrl(null); setPdfLoadErr(null); return; }
    let revoke: string | null = null;
    let alive = true;
    setPdfLoadErr(null);
    setPdfBlobUrl(null);
    api(activeDocPath)
      .then(r => { if (!r.ok) throw new Error(`Server returned ${r.status}`); return r.blob(); })
      .then(blob => {
        if (!alive) return;
        const url = URL.createObjectURL(blob);
        revoke = url;
        setPdfBlobUrl(url);
      })
      .catch(err => {
        if (!alive) return;
        setPdfLoadErr(String(err));
        setPdfBlobUrl(null);
      });
    return () => {
      alive = false;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [activeDocPath, api, pdfRetry]);

  // Clear generating flag when the lead actually receives its generated documents.
  useEffect(() => {
    if (generating && resumeReady && coverReady) setGenerating(false);
  }, [resumeReady, coverReady, generating]);

  const runApplyStage = async (stage: "preview" | "fill" | "submit") => {
    if (applyBusy) return;
    if ((stage === "preview" && !canPreviewApply) || (stage === "fill" && !canFillApply) || (stage === "submit" && !canSubmitApply)) return;
    setApplyBusy(stage);
    setApplyErr(null);
    showToast({
      id: `apply-${j.job_id}`,
      tone: "loading",
      title: stage === "preview" ? "Reading application" : stage === "fill" ? "Filling application" : "Submitting application",
      message: display.company,
    });
    try {
      const r = await api(`/api/v1/leads/${j.job_id}/apply/${stage}`, {
        method: "POST",
        headers: stage === "submit" ? { "Content-Type": "application/json" } : undefined,
        body: stage === "submit" ? JSON.stringify({ confirm: true }) : undefined,
      });
      if (!r.ok) {
        const detail = await r.json().then(d => d.detail).catch(() => "");
        throw new Error(detail || `Server returned ${r.status}`);
      }
      const data = await r.json();
      if (stage === "preview") setApplyPreview(data);
      else setApplyResult(data);
      if (stage === "submit") {
        setDone(true);
        window.setTimeout(onFired, 1200);
      }
      showToast({
        id: `apply-${j.job_id}`,
        tone: "success",
        title: stage === "preview" ? "Preview ready" : stage === "fill" ? "Form filled" : "Application submitted",
        message: display.company,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : `${stage} failed`;
      setApplyErr(message);
      showToast({ id: `apply-${j.job_id}`, tone: "error", title: "Apply automation failed", message });
    } finally {
      setApplyBusy(null);
    }
  };

  const generatePdf = async () => {
    setGenerating(true);
    setGenerateErr(null);
    setPdfBlobUrl(null);
    setPdfLoadErr(null);
    setActiveDoc("resume");
    showToast({ id: `generate-${j.job_id}`, tone: "loading", title: "Generating package", message: `${display.role} at ${display.company}` });
    try {
      const r = await api(`/api/v1/leads/${j.job_id}/generate`, { method: "POST" });
      if (!r.ok) throw new Error(`Server returned ${r.status}`);
      await loadVersions();
      showToast({ id: `generate-${j.job_id}`, tone: "success", title: "Generation started", message: "Documents will refresh when ready." });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setGenerateErr(message);
      setGenerating(false);
      showToast({ id: `generate-${j.job_id}`, tone: "error", title: "Generation failed", message });
    }
  };

  const runPipeline = async () => {
    if (pipelineRunning) return;
    setPipelineRunning(true);
    setPipelineMsg(null);
    showToast({ id: `pipeline-${j.job_id}`, tone: "loading", title: "Pipeline started", message: display.role });
    try {
      const r = await api(`/api/v1/leads/${j.job_id}/pipeline/run`, { method: "POST" });
      if (!r.ok) throw new Error(`Server returned ${r.status}`);
      setPipelineMsg("Pipeline running...");
      showToast({ id: `pipeline-${j.job_id}`, tone: "success", title: "Pipeline queued", message: "Watch Activity for completion." });
      window.setTimeout(() => setPipelineRunning(false), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Pipeline failed to start";
      setPipelineMsg(message);
      setPipelineRunning(false);
      showToast({ id: `pipeline-${j.job_id}`, tone: "error", title: "Pipeline failed", message });
    }
  };

  const openPdf = () => { if (pdfBlobUrl) openUrl(pdfBlobUrl); };

  const copyText = async (value: string) => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard is unavailable");
      await navigator.clipboard.writeText(value);
      showToast({ tone: "success", title: "Copied" });
    } catch (err) {
      showToast({ tone: "error", title: "Copy failed", message: err instanceof Error ? err.message : "Clipboard access was blocked." });
    }
  };

  const submitFeedback = async (feedback: string) => {
    setFeedbackBusy(feedback);
    setFeedbackErr(null);
    showToast({ id: `feedback-${j.job_id}`, tone: "loading", title: "Saving feedback" });
    try {
      const r = await api(`/api/v1/leads/${j.job_id}/feedback`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback }),
      });
      if (!r.ok) {
        const detail = await r.json().then(d => d.detail).catch(() => "");
        throw new Error(detail || `Server returned ${r.status}`);
      }
      showToast({ id: `feedback-${j.job_id}`, tone: "success", title: "Feedback saved" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Feedback failed";
      setFeedbackErr(message);
      showToast({ id: `feedback-${j.job_id}`, tone: "error", title: "Feedback failed", message });
    } finally {
      setFeedbackBusy(null);
    }
  };

  const scheduleFollowup = async (days: number) => {
    setFollowupBusy(days);
    setFeedbackErr(null);
    showToast({ id: `followup-${j.job_id}`, tone: "loading", title: "Scheduling follow-up" });
    try {
      const r = await api(`/api/v1/leads/${j.job_id}/followup`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
      if (!r.ok) {
        const detail = await r.json().then(d => d.detail).catch(() => "");
        throw new Error(detail || `Server returned ${r.status}`);
      }
      showToast({ id: `followup-${j.job_id}`, tone: "success", title: "Follow-up scheduled", message: `${days} days from now.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Follow-up save failed";
      setFeedbackErr(message);
      showToast({ id: `followup-${j.job_id}`, tone: "error", title: "Follow-up failed", message });
    } finally {
      setFollowupBusy(null);
    }
  };

  const extractedDetails = [
    ["Tech stack", (j.tech_stack || []).join(", ")],
    ["Location", j.location || ""],
    ["Urgency", j.urgency || ""],
    ["Budget", j.budget || ""],
  ].filter(([, value]) => value);

  const draftBlock = (label: string, value?: string) => value ? (
    <div key={label} style={{ background: "var(--paper-3)", border: "1px solid var(--line)", borderRadius: "var(--radius-control)", padding: "10px 12px" }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span className="mono approval-mini-label" style={{ color: "var(--ink-3)" }}>{label}</span>
        <button className="btn btn-ghost" style={{ fontSize: 11, padding: "3px 8px" }} onClick={() => copyText(value)}>Copy</button>
      </div>
      <div className="approval-copy" style={{ whiteSpace: "pre-wrap" }}>{value}</div>
    </div>
  ) : null;

  return (
    <div className="drawer-backdrop" onClick={onClose} style={{ zIndex: 100, display: "grid", placeItems: "center", padding: 16, overflow: "auto" }}>
      <motion.div className="card"
        initial={{ opacity: 0, y: 24, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: 0.985 }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        onClick={e => e.stopPropagation()}
        style={{ width: "min(1240px, calc(100vw - 32px))", height: "min(900px, calc(100vh - 32px))", maxHeight: "calc(100vh - 32px)", display: "flex", flexDirection: "column", background: "var(--paper)", zIndex: 101, overflow: "hidden", borderRadius: "var(--radius-card)" }}>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "18px 22px 16px", borderBottom: "1px solid var(--line)", flexShrink: 0, gap: 16, background: "var(--paper)", flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div className="row gap-2" style={{ marginBottom: 7, flexWrap: "wrap" }}>
              <span className="pill" style={{ background: `var(--${getTone(j.status)})`, color: `var(--${getTone(j.status)}-ink)` }}>{j.status}</span>
              <span className="pill mono" style={{ background: "var(--paper-3)", color: "var(--ink-3)" }}>{j.platform}</span>
              {j.budget && <span className="pill mono" style={{ background: "var(--green-soft)", color: "var(--green-ink)", border: "1px solid var(--green)" }}>{j.budget}</span>}
              {(j.signal_score || 0) > 0 && <span className="pill mono" style={{ background: (j.signal_score || 0) >= 80 ? "var(--orange-soft)" : "var(--yellow-soft)", color: (j.signal_score || 0) >= 80 ? "var(--orange-ink)" : "var(--yellow-ink)", border: `1px solid ${(j.signal_score || 0) >= 80 ? "var(--orange)" : "var(--yellow)"}` }}>Lead signal {j.signal_score}</span>}
              {!!j.learning_delta && <span className="pill mono" style={{ background: j.learning_delta > 0 ? "var(--green-soft)" : "var(--bad-soft)", color: j.learning_delta > 0 ? "var(--green-ink)" : "var(--bad)", border: `1px solid ${j.learning_delta > 0 ? "var(--green)" : "var(--bad)"}` }}>Learning {j.learning_delta > 0 ? "+" : ""}{j.learning_delta}</span>}
              {j.feedback && <span className="pill mono" style={{ background: "var(--blue-soft)", color: "var(--blue-ink)", border: "1px solid var(--blue)" }}>{j.feedback.replace(/_/g, " ")}</span>}
              {j.score > 0 && <span className="pill mono" style={{ background: j.score >= 85 ? "var(--green-soft)" : j.score >= 60 ? "var(--yellow-soft)" : "var(--bad-soft)", color: j.score >= 85 ? "var(--green-ink)" : j.score >= 60 ? "var(--yellow-ink)" : "var(--bad)" }}>{j.score}/100 match</span>}
            </div>
            <h2 className="approval-title" style={{ overflowWrap: "anywhere" }}>
              {display.role} <span style={{ color: "var(--ink-3)", fontWeight: 700 }}>||</span> {display.company}
            </h2>
            <p className="approval-platform" style={{ marginTop: 2 }}>{j.platform}</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            <button
              onClick={() => openUrl(j.url)}
              title="Open original job posting"
              className="btn"
              style={{ fontSize: 12, borderColor: "var(--teal)", background: "var(--teal-soft)", color: "var(--teal)" }}
            >
              <Icon name="external-link" size={12} color="var(--teal)" /> View Posting
            </button>
            <button className="btn btn-icon" onClick={onClose}><Icon name="x" size={15} /></button>
          </div>
        </div>

        <div className="approval-modal-grid" style={{ flex: 1, overflow: "hidden", display: "grid", minHeight: 0 }}>
          {/* Left: PDF */}
          <div className="approval-doc-pane" style={{ padding: 18, borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div className="eyebrow">Application Package</div>
                <div className="approval-copy-compact" style={{ marginTop: 3 }}>Resume and cover letter are generated separately for this role.</div>
              </div>
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                {pdfBlobUrl && (
                  <button onClick={openPdf} title="Open PDF in system viewer" style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "5px 12px", borderRadius: "var(--radius-tight)", fontSize: 11, fontWeight: 700,
                    border: "1px solid var(--teal)", background: "var(--teal-soft)", color: "var(--teal)", cursor: "pointer",
                  }}>
                    <Icon name="download" size={12} color="var(--teal)" /> Open PDF
                  </button>
                )}
                <button onClick={generatePdf} disabled={generating} aria-busy={generating} style={{
                  padding: "5px 12px", borderRadius: "var(--radius-tight)", fontSize: 11, fontWeight: 700,
                  border: "1px solid var(--purple)", background: "var(--purple-soft)", color: "var(--purple-ink)", cursor: generating ? "wait" : "pointer",
                }}>{generating ? "Generating..." : resumeReady || coverReady ? "Regenerate Package" : "Generate Package"}</button>
                <button onClick={runPipeline} disabled={pipelineRunning} aria-busy={pipelineRunning} style={{
                  padding: "5px 12px", borderRadius: "var(--radius-tight)", fontSize: 11, fontWeight: 700,
                  border: "1px solid var(--blue)", background: "var(--blue-soft)", color: "var(--blue-ink)", cursor: pipelineRunning ? "wait" : "pointer",
                }}>{pipelineRunning ? "Pipeline running..." : "Run full pipeline"}</button>
              </div>
            </div>
            {pipelineMsg && <div className="approval-copy-compact" style={{ color: pipelineMsg.includes("failed") || pipelineMsg.includes("Server") ? "var(--bad)" : "var(--blue-ink)" }}>{pipelineMsg}</div>}
            <div className="row gap-2" style={{ background: "var(--paper-3)", padding: 5, borderRadius: "var(--radius-control)", flexShrink: 0 }}>
              {[
                ["resume", "Resume", resumeReady],
                ["cover", "Cover Letter", coverReady],
              ].map(([kind, label, ready]) => (
                <button key={kind as string} onClick={() => setActiveDoc(kind as DocKind)} style={{
                  flex: 1, padding: "8px 10px", borderRadius: "var(--radius-tight)", border: "none", cursor: "pointer",
                  background: activeDoc === kind ? "var(--card)" : "transparent",
                  color: activeDoc === kind ? "var(--ink)" : "var(--ink-3)",
                  fontSize: 12, fontWeight: 700, boxShadow: activeDoc === kind ? "var(--shadow-xs)" : "none",
                  display: "flex", justifyContent: "center", alignItems: "center", gap: 7,
                }}>
                  {label}
                  <span className="dot" style={{ color: ready ? "var(--ok)" : "var(--ink-4)" }} />
                </button>
              ))}
            </div>
            {versions.length > 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <div className="eyebrow">Version history</div>
                <select
                  className="field-input"
                  value={selectedVersion ?? ""}
                  onChange={e => setSelectedVersion(Number(e.target.value))}
                  style={{ fontSize: 12, padding: "8px 10px" }}
                >
                  {versions.map(version => (
                    <option key={version.version} value={version.version}>
                      v{version.version}{version.version === currentVersion ? " (current)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {versionErr && <div style={{ color: "var(--bad)", fontSize: 12 }}>{versionErr}</div>}
            {selectedProjects.length > 0 && (
              <div className="row gap-2" style={{ flexWrap: "wrap" }}>
                <span className="eyebrow" style={{ marginRight: 2 }}>Projects used</span>
                {selectedProjects.map((p, i) => (
                  <span key={i} className="pill" style={{ background: "var(--green-soft)", color: "var(--green-ink)", border: "1px solid var(--green)" }}>{p}</span>
                ))}
              </div>
            )}
            {hasCoverage && (
              <div style={{ background: "var(--blue-soft)", border: "1px solid var(--blue)", borderRadius: "var(--radius-control)", padding: "10px 12px" }}>
                <div className="row" style={{ justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 7 }}>
                  <span className="eyebrow" style={{ color: "var(--blue-ink)" }}>Coverage</span>
                  {coveragePct !== null && <span className="mono approval-score-value" style={{ color: "var(--blue-ink)" }}>{coveragePct}% JD keywords</span>}
                </div>
                <div className="approval-copy">
                  {missingTerms.length > 0
                    ? <>You're missing these terms from the JD: <b>{missingTerms.slice(0, 6).join(", ")}</b>. We've incorporated the supported matches where applicable.</>
                    : <>Strong keyword coverage. We've incorporated supported JD terms where they fit the profile.</>
                  }
                </div>
                {incorporatedTerms.length > 0 && (
                  <div className="row gap-2" style={{ flexWrap: "wrap", marginTop: 8 }}>
                    <span className="eyebrow" style={{ marginRight: 2 }}>In resume</span>
                    {incorporatedTerms.slice(0, 8).map((term, i) => (
                      <span key={i} className="pill" style={{ background: "var(--paper)", color: "var(--blue-ink)", border: "1px solid var(--blue)" }}>{term}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
            {generateErr && (
              <div className="approval-copy-compact" style={{ color: "var(--bad)", padding: "8px 10px", background: "var(--bad-soft)", border: "1px solid var(--bad)", borderRadius: "var(--radius-tight)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span>{generateErr}</span>
                <button className="btn btn-ghost" onClick={generatePdf} disabled={generating} aria-busy={generating} style={{ fontSize: 11, padding: "3px 8px" }}>Retry</button>
              </div>
            )}
            <div style={{ flex: 1, minHeight: 0, background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--radius-card)", overflow: "hidden" }}>
              {activeReady && pdfBlobUrl && (
                <iframe
                  key={pdfBlobUrl}
                  src={pdfBlobUrl}
                  title={activeDoc === "resume" ? "Resume" : "Cover Letter"}
                  width="100%"
                  style={{ height: "100%", minHeight: 520, border: "none", display: "block" }}
                />
              )}
              {generating && !pdfBlobUrl && (
              <div className="approval-copy-compact" style={{ height: "100%", minHeight: 420, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "var(--ink-3)", padding: 24, textAlign: "center" }}>
                <div className="mono pulse">Tailoring resume and cover letter for {j.company}...</div>
                  <div style={{ maxWidth: 360, lineHeight: 1.5 }}>The generator is choosing the strongest profile projects for this job description.</div>
                </div>
              )}
              {!generating && activeReady && !pdfBlobUrl && (
                <div className="approval-copy-compact" style={{ height: "100%", minHeight: 420, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "var(--ink-3)", padding: 24, textAlign: "center" }}>
                  {pdfLoadErr
                    ? (
                      <>
                        <div style={{ color: "var(--bad)" }}>Failed to load PDF: {pdfLoadErr}</div>
                        <button className="btn" onClick={() => setPdfRetry(v => v + 1)} style={{ fontSize: 12 }}>Retry PDF</button>
                      </>
                    )
                    : <div>Loading {activeDoc === "resume" ? "resume" : "cover letter"}...</div>
                  }
                </div>
              )}
              {!generating && !activeReady && (
                <div className="approval-copy-compact" style={{ height: "100%", minHeight: 420, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "var(--ink-3)", padding: 24, textAlign: "center" }}>
                  <Icon name="file" size={26} color="var(--ink-4)" />
                  <div style={{ fontWeight: 700, color: "var(--ink-2)" }}>
                    No tailored {activeDoc === "resume" ? "resume" : "cover letter"} yet.
                  </div>
                  <div style={{ maxWidth: 380, lineHeight: 1.5 }}>
                    Generate the application package to create separate PDFs using the job description, company context, and best-matching projects.
                  </div>
                  <button onClick={generatePdf} disabled={generating} aria-busy={generating} style={{ padding: "8px 18px", borderRadius: "var(--radius-tight)", fontSize: 12, fontWeight: 700, border: "1px solid var(--purple)", background: "var(--purple-soft)", color: "var(--purple-ink)", cursor: generating ? "wait" : "pointer" }}>
                    Generate Package
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Score + actions */}
          <div className="approval-detail-pane" style={{ display: "flex", flexDirection: "column", minHeight: 0, background: "var(--paper)" }}>
            <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", minHeight: 0, flex: 1 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Timeline</div>
              {timeline.length > 0 ? (
                <div className="lead-timeline">
                  {timeline.map((event, idx) => {
                    const item = formatTimelineAction(event.action);
                    return (
                      <div key={`${event.ts}-${event.action}-${idx}`} className="lead-timeline-item">
                        <span className="lead-timeline-dot" />
                        <div className="lead-timeline-copy">
                          <div className="lead-timeline-title">
                            <span>{item.label}</span>
                            <time>{formatTimelineTime(event.ts)}</time>
                          </div>
                          {item.detail && <div className="lead-timeline-detail">{item.detail}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="lead-timeline-empty">Timeline appears after discovery, scoring, generation, feedback, and follow-up activity.</div>
              )}
            </div>

            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Job Description</div>
              <div className="approval-copy" style={{ background: "var(--paper-3)", borderRadius: "var(--radius-tight)", padding: "10px 12px", border: "1px solid var(--line)", whiteSpace: "pre-wrap" }}>
                {jobDescription}
              </div>
            </div>

            {extractedDetails.length > 0 && (
              <div>
                <div className="approval-section-label" style={{ marginBottom: 6 }}>Extracted Details</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
                  {extractedDetails.map(([label, value]) => (
                    <div key={label} style={{ background: "var(--paper-3)", border: "1px solid var(--line)", borderRadius: "var(--radius-tight)", padding: "9px 10px", minWidth: 0 }}>
                      <div className="mono approval-mini-label" style={{ color: "var(--ink-3)", marginBottom: 4 }}>{label}</div>
                      <div className="approval-copy" style={{ overflowWrap: "anywhere" }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="eyebrow">Match Reasoning</div>

            {(j.signal_score || j.signal_reason || (j.signal_tags?.length ?? 0) > 0) && (
              <div>
                <div className="approval-section-label" style={{ marginBottom: 6 }}>Lead Signal</div>
                <div style={{ background: "var(--orange-soft)", border: "1px solid var(--orange)", borderRadius: "var(--radius-control)", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <span className="type-metric-label" style={{ color: "var(--orange-ink)" }}>Signal score</span>
                    <span className="mono approval-score-value" style={{ color: "var(--orange-ink)" }}>{j.signal_score || 0}/100</span>
                  </div>
                  {!!j.learning_delta && (
                    <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--radius-tight)", padding: "8px 10px" }}>
                      <div className="row" style={{ justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                        <span className="mono approval-mini-label" style={{ color: "var(--ink-3)" }}>Feedback learning</span>
                        <span className="mono approval-score-value" style={{ color: j.learning_delta > 0 ? "var(--green-ink)" : "var(--bad)" }}>
                          {(j.base_signal_score ?? 0) || ((j.signal_score || 0) - j.learning_delta)} {j.learning_delta > 0 ? "+" : ""}{j.learning_delta}
                        </span>
                      </div>
                      {j.learning_reason && <div className="approval-copy" style={{ marginTop: 5, lineHeight: 1.45 }}>{j.learning_reason}</div>}
                    </div>
                  )}
                  {j.signal_reason && <div className="approval-copy">{j.signal_reason}</div>}
                  {(j.signal_tags?.length ?? 0) > 0 && (
                    <div className="row gap-2" style={{ flexWrap: "wrap" }}>
                      {j.signal_tags!.slice(0, 8).map(tag => (
                        <span key={tag} className="pill mono" style={{ fontSize: 9, background: "var(--paper)", color: "var(--ink-3)", border: "1px solid var(--line)" }}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {((j.fit_bullets?.length ?? 0) > 0 || j.proof_snippet) && (
              <div>
                <div className="approval-section-label" style={{ marginBottom: 6 }}>Proof Pack</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(j.fit_bullets?.length ?? 0) > 0 && (
                    <div style={{ background: "var(--green-soft)", border: "1px solid var(--green)", borderRadius: "var(--radius-control)", padding: "10px 12px" }}>
                      <div className="mono approval-mini-label" style={{ color: "var(--green-ink)", marginBottom: 6 }}>Why I fit</div>
                      <div className="col gap-1">
                        {j.fit_bullets!.map((bullet, idx) => (
                          <div key={idx} className="approval-copy" style={{ lineHeight: 1.45 }}>{bullet}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {j.proof_snippet && draftBlock("Proof snippet", j.proof_snippet)}
                </div>
              </div>
            )}

            {(j.outreach_reply || j.outreach_dm || j.outreach_email || j.proposal_draft) && (
              <div>
                <div className="approval-section-label" style={{ marginBottom: 6 }}>Outreach Messages</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {j.outreach_reply && (
                    <div style={{ background: "var(--purple-soft)", border: "1px solid var(--purple)", borderRadius: "var(--radius-control)", padding: "10px 12px" }}>
                      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span className="mono approval-mini-label" style={{ color: "var(--purple-ink)", fontWeight: 700 }}>3-Line Founder Message</span>
                        <button className="btn btn-ghost" style={{ fontSize: 11, padding: "3px 8px" }} onClick={() => copyText(j.outreach_reply!)}>Copy</button>
                      </div>
                      <div className="profile-body-copy" style={{ color: "var(--ink)", whiteSpace: "pre-wrap", fontWeight: 500 }}>{j.outreach_reply}</div>
                    </div>
                  )}
                  {draftBlock("LinkedIn Note", j.outreach_dm)}
                  {draftBlock("Cold Email", j.outreach_email)}
                  {draftBlock("Proposal", j.proposal_draft)}
                </div>
              </div>
            )}

            <div>
              <div className="approval-section-label" style={{ marginBottom: 6 }}>Lead Feedback</div>
              <div className="row gap-2" style={{ flexWrap: "wrap" }}>
                {[
                  ["relevant", "Relevant"],
                  ["not_relevant", "Not Relevant"],
                  ["duplicate", "Duplicate"],
                  ["low_quality", "Low Quality"],
                  ["incorrect_category", "Incorrect Category"],
                  ["already_contacted", "Contacted"],
                ].map(([id, label]) => {
                  const active = j.feedback === id;
                  return (
                    <button key={id} onClick={() => submitFeedback(id)} disabled={feedbackBusy === id} aria-busy={feedbackBusy === id} style={{
                      padding: "5px 10px", borderRadius: "var(--radius-tight)", fontSize: 11.5, fontWeight: 700, cursor: feedbackBusy === id ? "wait" : "pointer",
                      border: `1px solid ${active ? "var(--blue)" : "var(--line)"}`,
                      background: active ? "var(--blue-soft)" : "var(--paper-3)",
                      color: active ? "var(--blue-ink)" : "var(--ink-2)",
                    }}>{feedbackBusy === id ? "Saving..." : label}</button>
                  );
                })}
              </div>
              {feedbackErr && <div className="job-card-note" style={{ marginTop: 6, color: "var(--bad)" }}>{feedbackErr}</div>}
            </div>

            <div>
              <div className="approval-section-label" style={{ marginBottom: 6 }}>Follow-up</div>
              <div className="row gap-2" style={{ flexWrap: "wrap" }}>
                {[2, 5, 10].map(days => (
                  <button key={days} onClick={() => scheduleFollowup(days)} disabled={followupBusy === days} aria-busy={followupBusy === days} style={{
                    padding: "5px 10px", borderRadius: "var(--radius-tight)", fontSize: 11.5, fontWeight: 700, cursor: followupBusy === days ? "wait" : "pointer",
                    border: "1px solid var(--green)", background: "var(--green-soft)", color: "var(--green-ink)",
                  }}>{followupBusy === days ? "Saving..." : `${days} days`}</button>
                ))}
              </div>
              {j.followup_due_at && <div className="mono type-meta" style={{ marginTop: 6 }}>Due {j.followup_due_at}</div>}
              {(j.followup_sequence?.length ?? 0) > 0 && (
                <div style={{ marginTop: 8, background: "var(--paper-3)", border: "1px solid var(--line)", borderRadius: "var(--radius-control)", padding: "9px 11px" }}>
                  <div className="mono approval-mini-label" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Suggested sequence</div>
                  <div className="col gap-1">
                    {j.followup_sequence!.map((step, idx) => (
                      <div key={idx} className="approval-copy" style={{ lineHeight: 1.45 }}>{step}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Score bar */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span className="approval-section-label">Match Score</span>
                <span className="approval-score-value" style={{
                  color:       j.score >= 85 ? "var(--green-ink)" : j.score >= 60 ? "var(--yellow-ink)" : "var(--bad)",
                  background:  j.score >= 85 ? "var(--green-soft)" : j.score >= 60 ? "var(--yellow-soft)" : "var(--bad-soft)",
                  padding: "2px 10px", borderRadius: "var(--radius-pill)",
                }}>{j.score ?? 0}/100</span>
              </div>
              <div style={{ height: 6, background: "var(--paper-3)", borderRadius: "var(--radius-pill)", marginBottom: 16 }}>
                <div style={{ height: "100%", borderRadius: "var(--radius-pill)", width: `${Math.min(100, j.score ?? 0)}%`, background: j.score >= 85 ? "var(--green)" : j.score >= 60 ? "var(--yellow)" : "var(--bad)", transition: "width 0.4s ease" }} />
              </div>
            </div>

            {j.reason && (
              <div>
                <div className="approval-section-label" style={{ marginBottom: 4 }}>Evaluator Reasoning</div>
                <div className="approval-copy" style={{ background: "var(--paper)", borderRadius: "var(--radius-control)", padding: "10px 12px", border: "1px solid var(--line)" }}>{j.reason}</div>
              </div>
            )}

            {qualityReason && (
              <div>
                <div className="approval-section-label" style={{ marginBottom: 4 }}>Why This Lead Was Shown</div>
                <div className="approval-copy" style={{ background: "var(--blue-soft)", borderRadius: "var(--radius-control)", padding: "10px 12px", border: "1px solid var(--blue)" }}>
                  {qualityScore ? `Quality ${qualityScore}: ` : ""}{qualityReason}
                </div>
              </div>
            )}

            {j.match_points?.length > 0 && (
              <div>
                <div className="approval-section-label" style={{ marginBottom: 6 }}>Match Points</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {j.match_points.map((pt, i) => (
                    <div key={i} className="approval-copy-compact" style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "var(--ink-2)" }}>
                      <span style={{ color: "var(--ok)", fontWeight: 700, flexShrink: 0 }}>?</span>
                      <span style={{ lineHeight: 1.5 }}>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {j.gaps && j.gaps.length > 0 && (
              <div>
                <div className="approval-section-label" style={{ marginBottom: 6 }}>Skill Gaps</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {j.gaps.map((g, i) => (
                    <div key={i} className="approval-copy-compact" style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "var(--ink-2)" }}>
                      <span style={{ color: "var(--bad)", fontWeight: 700, flexShrink: 0 }}>?</span>
                      <span style={{ lineHeight: 1.5 }}>{g}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <FormReader
              jobId={j.job_id}
              defaultUrl={j.url}
              api={api}
            />

            </div>
            <div style={{ textAlign: "center", padding: 16, borderTop: "1px solid var(--line)", background: "var(--paper)", flexShrink: 0 }}>
              {done
                ? <div style={{ fontSize: 15, color: "var(--ok)", fontWeight: 700 }}>Application submitted</div>
                : <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                      <button className="btn" onClick={() => runApplyStage("preview")} disabled={!canPreviewApply} aria-busy={applyBusy === "preview"} style={{ justifyContent: "center" }}>
                        <Icon name="search" size={14} /> {applyBusy === "preview" ? "Reading..." : "Preview"}
                      </button>
                      <button className="btn" onClick={() => runApplyStage("fill")} disabled={!canFillApply} aria-busy={applyBusy === "fill"} style={{ justifyContent: "center" }}>
                        <Icon name="spark" size={14} /> {applyBusy === "fill" ? "Filling..." : "Fill"}
                      </button>
                      <button className="btn btn-accent" onClick={() => runApplyStage("submit")} disabled={!canSubmitApply} aria-busy={applyBusy === "submit"} style={{ justifyContent: "center", opacity: canSubmitApply ? 1 : 0.58 }}>
                        <Icon name="fire" size={14} color="#fff" /> {applyBusy === "submit" ? "Submitting..." : "Submit"}
                      </button>
                    </div>
                    {applyPreview ? (
                      <div style={{ marginTop: 10, textAlign: "left", border: "1px solid var(--line)", borderRadius: "var(--radius-tight)", padding: 10, background: "var(--paper-2)", fontSize: 11.5, lineHeight: 1.45 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 6 }}>
                          <strong>{applyPreview.platform_label || "Application form"}</strong>
                          <span className="pill mono">{applyPreview.can_submit ? "ready" : "review"}</span>
                        </div>
                        <div>{applyPreview.fields.filter(f => f.found_on_page).length} matched fields detected.</div>
                        {applyPreview.missing_answers.length > 0 ? (
                          <div style={{ color: "var(--bad)", marginTop: 5 }}>Missing: {applyPreview.missing_answers.join(", ")}</div>
                        ) : null}
                        {applyPreview.sensitive_labels.length > 0 ? (
                          <div style={{ color: "var(--warn)", marginTop: 5 }}>Needs approval: {applyPreview.sensitive_labels.join(", ")}</div>
                        ) : null}
                        {applyPreview.error ? (
                          <div style={{ color: "var(--bad)", marginTop: 5 }}>{applyPreview.error}</div>
                        ) : null}
                      </div>
                    ) : null}
                    {applyResult ? (
                      <div className="approval-copy-compact" style={{ marginTop: 8 }}>
                        Fill result: {(applyResult.fields_filled || []).join(", ") || "no fields reported"}; resume {applyResult.resume_uploaded ? "uploaded" : "not uploaded"}.
                      </div>
                    ) : null}
                    {applyErr ? (
                      <div className="approval-copy-compact" style={{ marginTop: 8, color: "var(--bad)" }}>
                        {applyErr}
                      </div>
                    ) : null}
                    {!experimentalAutoApply ? (
                      <div className="approval-copy-compact" style={{ marginTop: 8 }}>
                        Preview and fill are available after package generation. Enable Experimental Auto Apply only when you are ready to allow the final submit click.
                      </div>
                    ) : !resumeReady || !coverReady ? (
                      <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.45 }}>
                        Generate the resume and cover letter before running apply automation.
                      </div>
                    ) : null}
                  </>
              }
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
