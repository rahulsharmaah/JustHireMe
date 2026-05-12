import { useEffect, useRef, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import Icon from "../components/Icon";
import type { ApiFetch, ContactLookup, KeywordCoverage, Lead } from "../types";
import { roleFromLead } from "../lib/leadUtils";
import { showToast } from "../lib/toast";

export function ApplyJobView({ port, api, backendReady, leads, openDrawer, initialInput, autoFocus }: { port: number | null; api: ApiFetch | null; backendReady: boolean; leads: Lead[]; openDrawer: (l: Lead) => void; initialInput?: string; autoFocus?: boolean }) {
  const [input, setInput] = useState("");
  const initialApplied = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const completionToastShown = useRef(false);
  const [lead, setLead] = useState<Lead | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resumeBlobUrl, setResumeBlobUrl] = useState<string | null>(null);
  const [coverBlobUrl, setCoverBlobUrl] = useState<string | null>(null);
  const [resumeLoadErr, setResumeLoadErr] = useState<string | null>(null);
  const [coverLoadErr, setCoverLoadErr] = useState<string | null>(null);
  const [generationTaskId, setGenerationTaskId] = useState<string | null>(null);

  const liveLead = lead ? (leads.find(l => l.job_id === lead.job_id) || lead) : null;
  const resumeReady = Boolean(liveLead?.resume_asset || liveLead?.asset);
  const coverReady = Boolean(liveLead?.cover_letter_asset);
  const generating = Boolean(liveLead && (!resumeReady || !coverReady) && (busy || liveLead.status === "tailoring" || liveLead.status === "approved"));
  const resumeDocPath = liveLead && resumeReady ? `/api/v1/leads/${liveLead.job_id}/pdf?kind=resume` : null;
  const coverDocPath = liveLead && coverReady ? `/api/v1/leads/${liveLead.job_id}/pdf?kind=cover_letter` : null;
  const coverage = (liveLead?.keyword_coverage || liveLead?.source_meta?.keyword_coverage || {}) as KeywordCoverage;
  const contactLookup = (liveLead?.contact_lookup || liveLead?.source_meta?.contact_lookup || {}) as ContactLookup;
  const applicationAnswers = (liveLead?.application_answers || liveLead?.source_meta?.application_answers || []) as {
    key: string;
    label: string;
    question: string;
    answer: string;
    short_answer?: string;
    long_answer?: string;
  }[];
  const generationPlan = (liveLead?.generation_artifacts || liveLead?.source_meta?.generation_artifacts || {}) as {
    artifacts?: { fit_summary?: string; company_hook?: string; target_role_summary?: string; selected_evidence?: string[] };
  };
  const primaryContact = contactLookup.primary_contact;
  const missingTerms: string[] = Array.isArray(coverage.missing_terms) ? coverage.missing_terms : [];
  const incorporatedTerms: string[] = Array.isArray(coverage.incorporated_terms) ? coverage.incorporated_terms : [];
  const coveragePct = typeof coverage.coverage_pct === "number" ? coverage.coverage_pct : null;

  useEffect(() => {
    if (initialInput && !initialApplied.current) {
      initialApplied.current = true;
      setInput(initialInput);
    }
  }, [initialInput]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (!lead?.job_id || !port || !api || (resumeReady && coverReady)) return;
    let alive = true;
    const timer = setInterval(async () => {
      try {
        const r = await api(`/api/v1/leads/${lead.job_id}`);
        if (!r.ok) return;
        const updated = await r.json();
        if (alive) setLead(updated);
      } catch { /* keep waiting */ }
    }, 1800);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [lead?.job_id, port, resumeReady, coverReady]);

  useEffect(() => {
    if (!generationTaskId || !api || !busy) return;
    let alive = true;
    const timer = setInterval(async () => {
      try {
        const r = await api(`/api/v1/tasks/${generationTaskId}`);
        if (!r.ok) return;
        const task = await r.json();
        if (!alive) return;
        if (task.status === "failed" || task.status === "cancelled") {
          const message = task.last_error || "Document generation failed.";
          setGenerationTaskId(null);
          setBusy(false);
          setErr(message);
          showToast({ id: "apply-package", tone: "error", title: "Package failed", message });
        } else if (task.status === "succeeded") {
          setGenerationTaskId(null);
        }
      } catch { /* queue status is best-effort */ }
    }, 1400);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [generationTaskId, api, busy]);

  useEffect(() => {
    if (!resumeDocPath || !api) { setResumeBlobUrl(null); setResumeLoadErr(null); return; }
    let revoke: string | null = null;
    let alive = true;
    setResumeLoadErr(null);
    setResumeBlobUrl(null);
    api(resumeDocPath)
      .then(r => {
        if (!r.ok) throw new Error("Resume PDF not ready");
        return r.blob();
      })
      .then(blob => {
        if (!alive) return;
        revoke = URL.createObjectURL(blob);
        setResumeBlobUrl(revoke);
      })
      .catch(e => alive && setResumeLoadErr(e instanceof Error ? e.message : "Resume failed to load"));
    return () => {
      alive = false;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [resumeDocPath, api]);

  useEffect(() => {
    if (!coverDocPath || !api) { setCoverBlobUrl(null); setCoverLoadErr(null); return; }
    let revoke: string | null = null;
    let alive = true;
    setCoverLoadErr(null);
    setCoverBlobUrl(null);
    api(coverDocPath)
      .then(r => {
        if (!r.ok) throw new Error("Cover letter PDF not ready");
        return r.blob();
      })
      .then(blob => {
        if (!alive) return;
        revoke = URL.createObjectURL(blob);
        setCoverBlobUrl(revoke);
      })
      .catch(e => alive && setCoverLoadErr(e instanceof Error ? e.message : "Cover letter failed to load"));
    return () => {
      alive = false;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [coverDocPath, api]);

  useEffect(() => {
    if (busy && resumeReady && coverReady) {
      setBusy(false);
      if (!completionToastShown.current) {
        completionToastShown.current = true;
        showToast({ id: "apply-package", tone: "success", title: "Package generated", message: "Resume and cover letter are ready." });
      }
    }
  }, [busy, resumeReady, coverReady]);

  const submit = async () => {
    if (busy || !input.trim()) return;
    if (!port || !api || !backendReady) {
      const message = "Backend is still connecting. Wait for the sidebar to show Online, then try again.";
      setErr(message);
      showToast({ id: "apply-package", tone: "error", title: "Backend offline", message });
      return;
    }
    setBusy(true);
    setErr(null);
    setResumeBlobUrl(null);
    setCoverBlobUrl(null);
    setGenerationTaskId(null);
    completionToastShown.current = false;
    showToast({ id: "apply-package", tone: "loading", title: "Generating package", message: "Analysing the role and tailoring documents." });
    try {
      const trimmed = input.trim();
      const url = trimmed.match(/https?:\/\/\S+/)?.[0] || "";
      const r = await api(`/api/v1/leads/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "job", url, text: trimmed }),
      });
      if (!r.ok) {
        const detail = await r.json().then(d => d.detail).catch(() => "");
        throw new Error(detail || `Server returned ${r.status}`);
      }
      const created = await r.json();
      setLead(created);
      const gen = await api(`/api/v1/leads/${created.job_id}/generate`, { method: "POST" });
      if (!gen.ok) throw new Error(`Generation returned ${gen.status}`);
      const genPayload = await gen.json().catch(() => null);
      if (genPayload?.task_id) setGenerationTaskId(String(genPayload.task_id));
      showToast({ id: "apply-package", tone: "loading", title: "Tailoring in progress", message: "Waiting for resume and cover letter assets." });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Application package failed";
      setErr(message);
      setBusy(false);
      showToast({ id: "apply-package", tone: "error", title: "Package failed", message });
    }
  };

  const copyText = async (value: string) => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard is unavailable");
      await navigator.clipboard?.writeText(value);
      showToast({ tone: "success", title: "Copied" });
    } catch {
      showToast({ tone: "error", title: "Copy failed", message: "Clipboard access was blocked." });
    }
  };
  const stepTone = (done: boolean, active: boolean) => done ? "green" : active ? "purple" : "blue";
  const stepPill = (label: string, done: boolean, active: boolean) => {
    const tone = stepTone(done, active);
    return (
      <div className="pill mono apply-progress-pill" style={{ background: `var(--${tone}-soft)`, color: `var(--${tone}-ink)`, border: `1px solid var(--${tone})`, fontSize: 10 }}>
        {done ? "Done" : active ? "Working" : "Waiting"} - {label}
      </div>
    );
  };

  return (
    <div className="apply-page">
      <div className={liveLead ? "apply-shell apply-shell-result" : "apply-shell"}>
        <section className="card apply-composer">
          <div className="apply-composer-head">
            <div className="apply-composer-kicker">
              <span className="dot" />
              <span>Customize for this job</span>
            </div>
            <h2>Paste a job URL.</h2>
            <div className="apply-composer-subtitle">Analyse fit, generate the resume and cover letter, then copy outreach drafts from one page.</div>
          </div>
          <textarea
            ref={inputRef}
            className="field-input apply-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Paste job URL or full job description"
            rows={liveLead ? 8 : 12}
          />
          <button className="btn btn-accent apply-primary-action" onClick={submit} disabled={!backendReady || !port || !api || busy || !input.trim()} aria-busy={busy}>
            <Icon name="spark" size={15} color="#fff" /> {busy ? "Analysing and generating..." : "Analyse & Generate"}
          </button>
          {!backendReady && (
            <div style={{ color: "var(--orange-ink)", background: "var(--orange-soft)", border: "1px solid var(--orange)", borderRadius: 8, padding: "9px 11px", fontSize: 12 }}>
              Backend is connecting. Keep this page open until the sidebar shows Online.
            </div>
          )}
          {err && <div style={{ color: "var(--bad)", background: "var(--bad-soft)", border: "1px solid var(--bad)", borderRadius: 8, padding: "9px 11px", fontSize: 12 }}>{err}</div>}
          <div className="apply-run-strip">
            <div className="apply-run-step">
              <span className="apply-run-index">01</span>
              <span>Capture</span>
            </div>
            <div className="apply-run-step">
              <span className="apply-run-index">02</span>
              <span>Tailor</span>
            </div>
            <div className="apply-run-step">
              <span className="apply-run-index">03</span>
              <span>Review</span>
            </div>
          </div>
          {liveLead && (
            <div className="apply-progress-stack">
              {stepPill("Job captured", true, false)}
              {stepPill("Resume generated", resumeReady, generating && !resumeReady)}
              {stepPill("Cover letter generated", coverReady, generating && resumeReady && !coverReady)}
              <button className="btn" onClick={() => openDrawer(liveLead)} style={{ justifyContent: "center" }}>Open full details</button>
            </div>
          )}
        </section>

        {liveLead && (
          <section style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
            <div className="card" style={{ padding: 18, display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
              <div className="eyebrow">Customization Package</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 5 }}>{roleFromLead(liveLead)}</h3>
                <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 3 }}>{liveLead.company || "Unknown company"}</div>
              </div>
              <div className="row gap-2" style={{ flexWrap: "wrap" }}>
                {coveragePct !== null && <span className="pill mono" style={{ background: "var(--blue-soft)", color: "var(--blue-ink)", border: "1px solid var(--blue)" }}>{coveragePct}% coverage</span>}
                <span className="pill mono" style={{ background: resumeReady && coverReady ? "var(--green-soft)" : "var(--purple-soft)", color: resumeReady && coverReady ? "var(--green-ink)" : "var(--purple-ink)", border: `1px solid ${resumeReady && coverReady ? "var(--green)" : "var(--purple)"}` }}>
                  {resumeReady && coverReady ? "Ready" : "Generating"}
                </span>
              </div>
            </div>

            {(missingTerms.length > 0 || incorporatedTerms.length > 0) && (
              <div className="card" style={{ padding: 16, borderColor: "var(--blue)", background: "var(--blue-soft)" }}>
                <div className="row" style={{ justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 8 }}>
                  <span className="eyebrow" style={{ color: "var(--blue-ink)" }}>Coverage</span>
                  {coveragePct !== null && <span className="mono" style={{ fontSize: 11, fontWeight: 800, color: "var(--blue-ink)" }}>{coveragePct}% JD keywords</span>}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
                  {missingTerms.length
                    ? <>You're missing these terms from the JD: <b>{missingTerms.slice(0, 8).join(", ")}</b>. We've incorporated supported matches where applicable.</>
                    : <>Strong keyword coverage. Supported JD terms were incorporated where they fit.</>
                  }
                </div>
                {incorporatedTerms.length > 0 && (
                  <div className="row gap-2" style={{ flexWrap: "wrap", marginTop: 10 }}>
                    {incorporatedTerms.slice(0, 10).map(term => (
                      <span key={term} className="pill" style={{ background: "var(--paper)", color: "var(--blue-ink)", border: "1px solid var(--blue)" }}>{term}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="card" style={{ padding: 16, borderColor: primaryContact ? "var(--green)" : "var(--line)", background: primaryContact ? "var(--green-soft)" : "var(--paper)" }}>
              <div className="row" style={{ justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <div className="eyebrow" style={{ color: primaryContact ? "var(--green-ink)" : "var(--ink-3)" }}>Who to contact</div>
                  {primaryContact ? (
                    <>
                      <h3 style={{ fontSize: 17, fontWeight: 800, marginTop: 5 }}>{primaryContact.name || "Company contact"}</h3>
                      <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 3 }}>{primaryContact.title || "Hiring contact"}{contactLookup.domain ? ` at ${contactLookup.domain}` : ""}</div>
                    </>
                  ) : (
                    <>
                      <h3 style={{ fontSize: 17, fontWeight: 800, marginTop: 5 }}>Contact lookup</h3>
                      <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 3 }}>
                        {contactLookup.message || (resumeReady && coverReady ? "Add a Hunter.io API key in Settings to find recruiter and founder emails." : "Contact lookup runs after the package is generated.")}
                      </div>
                    </>
                  )}
                </div>
                {contactLookup.status && (
                  <span className="pill mono" style={{ background: primaryContact ? "var(--paper)" : "var(--paper-3)", color: primaryContact ? "var(--green-ink)" : "var(--ink-3)", border: `1px solid ${primaryContact ? "var(--green)" : "var(--line)"}` }}>
                    {contactLookup.status.replace(/_/g, " ")}
                  </span>
                )}
              </div>
              {primaryContact && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 10, marginTop: 12 }}>
                  <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8, padding: 12 }}>
                    <div className="eyebrow">Direct line</div>
                    <div className="col gap-2" style={{ marginTop: 8, fontSize: 12.5, color: "var(--ink-2)" }}>
                      {primaryContact.email && (
                        <button className="btn btn-ghost" style={{ justifyContent: "space-between" }} onClick={() => copyText(primaryContact.email || "")}>
                          <span className="mono" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{primaryContact.email}</span>
                          <span>Copy</span>
                        </button>
                      )}
                      {primaryContact.linkedin_url && (
                        <button className="btn btn-ghost" style={{ justifyContent: "space-between" }} onClick={() => copyText(primaryContact.linkedin_url || "")}>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>LinkedIn profile</span>
                          <span>Copy</span>
                        </button>
                      )}
                      {typeof primaryContact.confidence === "number" && primaryContact.confidence > 0 && (
                        <div className="mono" style={{ color: "var(--green-ink)", fontSize: 11 }}>{primaryContact.confidence}% Hunter confidence</div>
                      )}
                    </div>
                  </div>
                  {primaryContact.personalized_email && (
                    <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8, padding: 12 }}>
                      <div className="row" style={{ justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                        <span className="eyebrow">Cold email</span>
                        <button className="btn btn-ghost" style={{ fontSize: 11, padding: "3px 8px" }} onClick={() => copyText(primaryContact.personalized_email || "")}>Copy</button>
                      </div>
                      <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{primaryContact.personalized_email}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 14 }}>
              {[
                { label: "Resume", ready: resumeReady, blob: resumeBlobUrl, error: resumeLoadErr },
                { label: "Cover Letter", ready: coverReady, blob: coverBlobUrl, error: coverLoadErr },
              ].map(doc => (
                <div key={doc.label} className="card" style={{ minHeight: 600, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div className="row" style={{ padding: 11, borderBottom: "1px solid var(--line)", background: "var(--paper-3)", justifyContent: "space-between", gap: 10 }}>
                    <div className="row gap-2">
                      <span style={{ fontSize: 13, fontWeight: 800 }}>{doc.label}</span>
                      <span className="dot" style={{ color: doc.ready ? "var(--ok)" : "var(--ink-4)" }} />
                    </div>
                    <button className="btn btn-ghost" disabled={!doc.blob} onClick={() => doc.blob && openUrl(doc.blob)} style={{ fontSize: 11, padding: "4px 9px" }}>
                      <Icon name="download" size={12} /> Download PDF
                    </button>
                  </div>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    {doc.ready && doc.blob && (
                      <iframe key={doc.blob} src={doc.blob} title={doc.label} width="100%" style={{ height: "100%", minHeight: 548, border: "none", display: "block" }} />
                    )}
                    {doc.ready && !doc.blob && !doc.error && (
                      <div style={{ minHeight: 548, display: "grid", placeItems: "center", color: "var(--ink-3)", fontSize: 12 }}>Loading PDF...</div>
                    )}
                    {doc.error && (
                      <div style={{ minHeight: 548, display: "grid", placeItems: "center", color: "var(--bad)", fontSize: 12 }}>{doc.error}</div>
                    )}
                    {!doc.ready && (
                      <div style={{ minHeight: 548, display: "grid", placeItems: "center", color: "var(--ink-3)", fontSize: 12, textAlign: "center", padding: 24 }}>
                        {generating ? `Generating ${doc.label.toLowerCase()}...` : `${doc.label} will appear here.`}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {(liveLead.outreach_reply || liveLead.outreach_dm || liveLead.outreach_email || (liveLead.fit_bullets?.length ?? 0) > 0) && (
              <div className="card" style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 10 }}>
                {[
                  ["3-line pitch", liveLead.outreach_reply],
                  ["Cold email", liveLead.outreach_email],
                  ["LinkedIn note", liveLead.outreach_dm],
                  ["Fit bullets", (liveLead.fit_bullets || []).join("\n")],
                ].filter(([, value]) => Boolean(value)).map(([label, value]) => (
                  <div key={label} style={{ background: "var(--paper-3)", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 12px" }}>
                    <div className="row" style={{ justifyContent: "space-between", gap: 8, marginBottom: 7 }}>
                      <span className="eyebrow">{label}</span>
                      <button className="btn btn-ghost" style={{ fontSize: 11, padding: "3px 8px" }} onClick={() => copyText(String(value))}>Copy</button>
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{value}</div>
                  </div>
                ))}
              </div>
            )}

            {(applicationAnswers.length > 0 || generationPlan.artifacts?.fit_summary || generationPlan.artifacts?.selected_evidence?.length) && (
              <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="row" style={{ justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <div className="eyebrow">Application answers</div>
                    <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 4 }}>
                      Reusable answers for the common “why this company / why this role” questions across job platforms.
                    </div>
                  </div>
                  <span className="pill mono" style={{ background: "var(--blue-soft)", color: "var(--blue-ink)", border: "1px solid var(--blue)" }}>
                    {applicationAnswers.length} saved answers
                  </span>
                </div>
                {generationPlan.artifacts?.fit_summary && (
                  <div style={{ background: "var(--paper-3)", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 12px" }}>
                    <div className="eyebrow">Fit summary</div>
                    <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.55, marginTop: 6 }}>
                      {generationPlan.artifacts.fit_summary}
                    </div>
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 10 }}>
                  {applicationAnswers.map(item => (
                    <div key={item.key} style={{ background: "var(--paper-3)", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 12px" }}>
                      <div className="row" style={{ justifyContent: "space-between", gap: 8, marginBottom: 7, alignItems: "center" }}>
                        <span className="eyebrow">{item.label}</span>
                        <button className="btn btn-ghost" style={{ fontSize: 11, padding: "3px 8px" }} onClick={() => copyText(item.answer)}>Copy</button>
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 5 }}>{item.question}</div>
                      <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{item.answer}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card" style={{ padding: 16, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>Ready package: use the generated documents and outreach drafts wherever you apply.</div>
              <button className="btn" onClick={() => liveLead && openDrawer(liveLead)} disabled={!liveLead} style={{ minWidth: 170, justifyContent: "center" }}>
                <Icon name="file" size={14} /> Review Package
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
