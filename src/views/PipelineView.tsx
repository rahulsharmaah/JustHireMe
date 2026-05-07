import { useEffect, useMemo, useState } from "react";
import Icon from "../components/Icon";
import { LeadFilterBar } from "../components/LeadFilterBar";
import { PipelineJobCard, PipelineSkeleton } from "../components/JobCard";
import type { ApiFetch, Lead, LeadSort, PipelineFilterState, PipelineTab, SavedPipelineView, SeniorityFilter } from "../types";
import { PAGE_SIZE, isContactedLead, isRemoteLead, leadSearchText, needsTodayAction, sortLeads, seniorityMatches, uniqueLeadValues } from "../lib/leadUtils";

const PIPELINE_FILTER_KEY = "justhireme:pipeline:filters:v1";
const PIPELINE_SAVED_VIEWS_KEY = "justhireme:pipeline:saved-views:v1";

const defaultFilters: PipelineFilterState = {
  tab: "today",
  search: "",
  platform: "",
  minSignal: 0,
  minMatch: 0,
  sort: "recommended",
  budgetOnly: false,
  learningOnly: false,
  remoteOnly: false,
  uncontactedOnly: true,
  hideDiscarded: true,
  seniority: "all",
};

const loadPipelineFilters = (): PipelineFilterState => {
  try {
    return { ...defaultFilters, ...JSON.parse(localStorage.getItem(PIPELINE_FILTER_KEY) || "{}") };
  } catch {
    return defaultFilters;
  }
};

const loadSavedViews = (): SavedPipelineView[] => {
  try {
    const value = JSON.parse(localStorage.getItem(PIPELINE_SAVED_VIEWS_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

export function PipelineView({ leads, openDrawer, deleteLead, port, api, scanning, reevaluating, cleaning, onReevaluate, onStopReevaluate, onCleanup, loading, error }: {
  leads: Lead[]; openDrawer: (l: Lead) => void;
  deleteLead: (id: string) => void; port: number | null; api: ApiFetch | null;
  scanning: boolean; reevaluating: boolean; cleaning: boolean; onReevaluate: () => void; onStopReevaluate: () => void; onCleanup: () => void;
  loading: boolean; error: string | null;
}) {
  const [initialFilters] = useState(loadPipelineFilters);
  const [tab, setTab] = useState<PipelineTab>(initialFilters.tab);
  const [search, setSearch] = useState(initialFilters.search);
  const [platform, setPlatform] = useState(initialFilters.platform);
  const [minSignal, setMinSignal] = useState(initialFilters.minSignal);
  const [minMatch, setMinMatch] = useState(initialFilters.minMatch);
  const [sort, setSort] = useState<LeadSort>(initialFilters.sort);
  const [budgetOnly, setBudgetOnly] = useState(initialFilters.budgetOnly);
  const [learningOnly, setLearningOnly] = useState(initialFilters.learningOnly);
  const [remoteOnly, setRemoteOnly] = useState(initialFilters.remoteOnly);
  const [uncontactedOnly, setUncontactedOnly] = useState(initialFilters.uncontactedOnly);
  const [hideDiscarded, setHideDiscarded] = useState(initialFilters.hideDiscarded);
  const [seniority, setSeniority] = useState<SeniorityFilter>(initialFilters.seniority);
  const [savedViews, setSavedViews] = useState<SavedPipelineView[]>(loadSavedViews);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [bulkSelecting, setBulkSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  useEffect(() => setVisibleCount(PAGE_SIZE), [tab, search, platform, minSignal, minMatch, sort, budgetOnly, learningOnly, remoteOnly, uncontactedOnly, hideDiscarded, seniority]);

  const currentFilters: PipelineFilterState = useMemo(() => ({
    tab, search, platform, minSignal, minMatch, sort, budgetOnly, learningOnly,
    remoteOnly, uncontactedOnly, hideDiscarded, seniority,
  }), [tab, search, platform, minSignal, minMatch, sort, budgetOnly, learningOnly, remoteOnly, uncontactedOnly, hideDiscarded, seniority]);

  useEffect(() => {
    localStorage.setItem(PIPELINE_FILTER_KEY, JSON.stringify(currentFilters));
  }, [currentFilters]);

  const applyFilters = (filters: PipelineFilterState) => {
    setTab(filters.tab);
    setSearch(filters.search);
    setPlatform(filters.platform);
    setMinSignal(filters.minSignal);
    setMinMatch(filters.minMatch);
    setSort(filters.sort);
    setBudgetOnly(filters.budgetOnly);
    setLearningOnly(filters.learningOnly);
    setRemoteOnly(filters.remoteOnly);
    setUncontactedOnly(filters.uncontactedOnly);
    setHideDiscarded(filters.hideDiscarded);
    setSeniority(filters.seniority);
    setBulkSelecting(false);
    setSelected(new Set());
  };

  const saveCurrentView = () => {
    const name = window.prompt("Name this pipeline view", tab === "today" ? "Today: uncontacted strong leads" : `${tab} view`);
    const cleanName = String(name || "").trim();
    if (!cleanName) return;
    const next = [
      ...savedViews.filter(view => view.name.toLowerCase() !== cleanName.toLowerCase()),
      {
        id: `${Date.now()}-${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        name: cleanName,
        filters: currentFilters,
        createdAt: new Date().toISOString(),
      },
    ];
    setSavedViews(next);
    localStorage.setItem(PIPELINE_SAVED_VIEWS_KEY, JSON.stringify(next));
  };

  const deleteSavedView = (id: string) => {
    const next = savedViews.filter(view => view.id !== id);
    setSavedViews(next);
    localStorage.setItem(PIPELINE_SAVED_VIEWS_KEY, JSON.stringify(next));
  };

  const platforms = useMemo(() => uniqueLeadValues(leads, "platform"), [leads]);

  const tabs = useMemo(() => {
    const q = search.trim().toLowerCase();
    const keep = (lead: Lead) => {
      if (q && !leadSearchText(lead).includes(q)) return false;
      if (platform && lead.platform !== platform) return false;
      if (minSignal && (lead.signal_score || 0) < minSignal) return false;
      if (minMatch && (lead.score || 0) < minMatch) return false;
      if (budgetOnly && !lead.budget) return false;
      if (learningOnly && !lead.learning_delta) return false;
      if (remoteOnly && !isRemoteLead(lead)) return false;
      if (uncontactedOnly && isContactedLead(lead)) return false;
      if (hideDiscarded && tab !== "discarded" && lead.status === "discarded") return false;
      if (!seniorityMatches(lead, seniority)) return false;
      return true;
    };
    const apply = (arr: Lead[]) => sortLeads(arr.filter(keep), sort);
    const tabItems: { id: PipelineTab; label: string; tone: string; leads: Lead[] }[] = [
      { id: "today",     label: "Today",     tone: "green",  leads: apply(leads.filter(needsTodayAction)) },
      { id: "all",       label: "All",       tone: "teal",   leads: apply(leads) },
      { id: "hot",       label: "Hot",       tone: "orange", leads: apply(leads.filter(l => (l.signal_score || 0) >= 80 || (l.score || 0) >= 85)) },
      { id: "found",     label: "New",       tone: "blue",   leads: apply(leads.filter(l => l.status === "discovered")) },
      { id: "evaluated", label: "Rated",     tone: "yellow", leads: apply(leads.filter(l => l.score > 0 || (l.signal_score || 0) > 0)) },
      { id: "generated", label: "Ready",     tone: "purple", leads: apply(leads.filter(l => l.status === "tailoring" || l.status === "approved")) },
      { id: "applied",   label: "Active",    tone: "orange", leads: apply(leads.filter(l => ["applied", "interviewing", "accepted", "rejected"].includes(l.status))) },
      { id: "discarded", label: "Discarded", tone: "bad",    leads: apply(leads.filter(l => l.status === "discarded")) },
    ];
    return tabItems;
  }, [leads, tab, search, platform, minSignal, minMatch, sort, budgetOnly, learningOnly, remoteOnly, uncontactedOnly, hideDiscarded, seniority]);

  const activeTab = tabs.find(t => t.id === tab) || tabs[0];
  const visibleLeads = activeTab.leads.slice(0, visibleCount);
  const hasFilters = Boolean(search || platform || minSignal || minMatch || budgetOnly || learningOnly || remoteOnly || uncontactedOnly || hideDiscarded || seniority !== "all");
  const hotCount = leads.filter(l => (l.signal_score || 0) >= 80 || (l.score || 0) >= 85).length;
  const todayCount = leads.filter(needsTodayAction).length;
  const readyCount = leads.filter(l => l.status === "tailoring" || l.status === "approved").length;
  const activeCount = leads.filter(l => ["applied", "interviewing", "accepted", "rejected"].includes(l.status)).length;
  const busyLabel = scanning ? "Scanning for new leads" : reevaluating ? "Re-evaluating fit scores" : cleaning ? "Cleaning bad data" : "";
  const metrics = [
    { label: "Today", value: todayCount, tone: "green", icon: "clock" },
    { label: "Total", value: leads.length, tone: "blue", icon: "layers" },
    { label: "Hot", value: hotCount, tone: "orange", icon: "spark" },
    { label: "New", value: leads.filter(l => l.status === "discovered").length, tone: "teal", icon: "search" },
    { label: "Ready", value: readyCount, tone: "purple", icon: "file" },
    { label: "Active", value: activeCount, tone: "green", icon: "fire" },
    { label: "Discarded", value: leads.filter(l => l.status === "discarded").length, tone: "bad", icon: "trash" },
  ];
  const toneSoft = (tone: string) => tone === "bad" ? "var(--bad-soft)" : `var(--${tone}-soft)`;
  const toneInk = (tone: string) => tone === "bad" ? "var(--bad)" : `var(--${tone}-ink)`;
  const toneBorder = (tone: string) => tone === "bad" ? "var(--bad)" : `var(--${tone})`;

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const bulkDelete = async () => {
    if (!window.confirm(`Delete ${selected.size} leads?`)) return;
    for (const id of selected) await deleteLead(id);
    setSelected(new Set());
    setBulkSelecting(false);
  };

  const exportCsv = async () => {
    if (!api || exporting) return;
    setExporting(true);
    try {
      const res = await api("/api/v1/leads/export.csv");
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "jhm_pipeline.csv";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="pipeline-page">
      <div className="pipeline-top">
        <div className="pipeline-overview">
          <div className="pipeline-overview-copy">
            <span className="eyebrow">Lead queue</span>
            <h2>Review, clean, and ship applications</h2>
            <p>{loading ? "Loading saved job leads..." : `${activeTab.leads.length} matching leads in ${activeTab.label.toLowerCase()}.`}</p>
          </div>
          {metrics.map(metric => (
            <button
              key={metric.label}
              className="pipeline-metric"
              onClick={() => {
                const nextTab = metric.label === "Today" ? "today" : metric.label === "Hot" ? "hot" : metric.label === "New" ? "found" : metric.label === "Ready" ? "generated" : metric.label === "Active" ? "applied" : metric.label === "Discarded" ? "discarded" : "all";
                setTab(nextTab as PipelineTab);
                setBulkSelecting(false);
                setSelected(new Set());
              }}
              style={{ background: toneSoft(metric.tone), borderColor: toneBorder(metric.tone), color: toneInk(metric.tone) }}
            >
              <Icon name={metric.icon} size={14} />
              <span className="mono tabular">{metric.value}</span>
              <small>{metric.label}</small>
            </button>
          ))}
        </div>

        {(busyLabel || error) && (
          <div className={`pipeline-notice ${error ? "error" : ""}`}>
            {error ? <Icon name="x" size={13} /> : <span className="dot pulse-soft" />}
            <span>{error || busyLabel}</span>
          </div>
        )}

        <div className="pipeline-toolbar">
          <div className="pipeline-tabs" role="tablist" aria-label="Pipeline stages">
            {tabs.map(t => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={tab === t.id ? "active" : ""}
                onClick={() => { setTab(t.id); setBulkSelecting(false); setSelected(new Set()); }}
                style={tab === t.id ? { background: toneSoft(t.tone), borderColor: toneBorder(t.tone), color: toneInk(t.tone) } : undefined}
              >
                <span>{t.label}</span>
                <b className="mono tabular">{t.leads.length}</b>
              </button>
            ))}
          </div>

          <div className="pipeline-actions">
            <button className="btn" onClick={exportCsv} disabled={!api || exporting || loading}>
              {exporting ? "Exporting..." : "Export CSV"}
            </button>
            <button className="btn" onClick={saveCurrentView} disabled={loading}>
              <Icon name="check" size={13} /> Save view
            </button>
            {reevaluating ? (
              <button className="btn danger" onClick={onStopReevaluate}>
                <Icon name="x" size={13} /> Stop re-eval
              </button>
            ) : (
              <button className="btn" onClick={onReevaluate} disabled={leads.length === 0 || scanning || cleaning || loading}>
                <Icon name="pulse" size={13} /> Re-evaluate
              </button>
            )}
            <button className="btn danger-soft" onClick={onCleanup} disabled={leads.length === 0 || scanning || reevaluating || cleaning || loading}>
              <Icon name="trash" size={13} /> {cleaning ? "Cleaning" : "Clean bad data"}
            </button>
            {tab === "discarded" && (
              bulkSelecting ? (
                <>
                  <button className="btn danger" onClick={bulkDelete} disabled={selected.size === 0}>Delete {selected.size}</button>
                  <button className="btn" onClick={() => { setBulkSelecting(false); setSelected(new Set()); }}>Cancel</button>
                </>
              ) : (
                <button className="btn" onClick={() => setBulkSelecting(true)} disabled={activeTab.leads.length === 0}>Bulk delete</button>
              )
            )}
          </div>
        </div>

        <div className="pipeline-saved-views">
          <button className="pipeline-saved-chip primary" onClick={() => applyFilters(defaultFilters)}>
            <Icon name="clock" size={12} /> Today focus
          </button>
          {savedViews.length === 0 ? (
            <span className="pipeline-saved-empty">Save filters you use every morning.</span>
          ) : savedViews.map(view => (
            <span key={view.id} className="pipeline-saved-chip">
              <button onClick={() => applyFilters(view.filters)}>{view.name}</button>
              <button className="pipeline-saved-delete" onClick={() => deleteSavedView(view.id)} title={`Delete ${view.name}`}>
                <Icon name="x" size={11} />
              </button>
            </span>
          ))}
        </div>

        <LeadFilterBar
          search={search}
          setSearch={setSearch}
          platform={platform}
          setPlatform={setPlatform}
          minSignal={minSignal}
          setMinSignal={setMinSignal}
          minMatch={minMatch}
          setMinMatch={setMinMatch}
          sort={sort}
          setSort={setSort}
          budgetOnly={budgetOnly}
          setBudgetOnly={setBudgetOnly}
          learningOnly={learningOnly}
          setLearningOnly={setLearningOnly}
          remoteOnly={remoteOnly}
          setRemoteOnly={setRemoteOnly}
          uncontactedOnly={uncontactedOnly}
          setUncontactedOnly={setUncontactedOnly}
          hideDiscarded={hideDiscarded}
          setHideDiscarded={setHideDiscarded}
          seniority={seniority}
          setSeniority={setSeniority}
          platforms={platforms}
          total={activeTab.leads.length}
          shown={Math.min(visibleCount, activeTab.leads.length)}
          label="jobs"
        />
      </div>

      <div className="pipeline-content scroll">
        <div className="pipeline-results-head">
          <div>
            <h3>{activeTab.label}</h3>
            <p>{hasFilters ? "Filtered results" : "All matching leads"} - showing {Math.min(visibleCount, activeTab.leads.length)} of {activeTab.leads.length}</p>
          </div>
          {bulkSelecting && tab === "discarded" && <span className="pipeline-selected mono">{selected.size} selected</span>}
        </div>
        {loading ? (
          <PipelineSkeleton />
        ) : activeTab.leads.length === 0 ? (
          <div className="pipeline-empty">
            <Icon name={hasFilters ? "filter" : "search"} size={18} />
            <h3>{hasFilters ? "No leads match these filters" : `No ${activeTab.label.toLowerCase()} jobs yet`}</h3>
            <p>{hasFilters ? "Clear filters or lower the score thresholds." : "Run a scan or paste a lead from the inbox to start filling this lane."}</p>
          </div>
        ) : (
          <div className="pipeline-list">
            {visibleLeads.map(lead => (
              <div key={lead.job_id} className="pipeline-list-item">
                {bulkSelecting && tab === "discarded" && (
                  <div
                    className="pipeline-select-box"
                    onClick={() => toggleSelect(lead.job_id)}
                    style={{ borderColor: selected.has(lead.job_id) ? "var(--bad)" : "var(--line)", background: selected.has(lead.job_id) ? "var(--bad)" : "var(--paper)" }}
                  >
                    {selected.has(lead.job_id) && <Icon name="check" size={11} color="#fff" />}
                  </div>
                )}
                <PipelineJobCard
                  lead={lead}
                  onOpen={openDrawer}
                  onDelete={deleteLead}
                  showGenerate={tab === "evaluated"}
                  port={port}
                  api={api}
                />
              </div>
            ))}
          </div>
        )}
        {activeTab.leads.length > visibleCount && (
          <div className="row" style={{ justifyContent: "center", marginTop: 18 }}>
            <button className="btn" onClick={() => setVisibleCount(v => v + PAGE_SIZE)}>
              Show next {Math.min(PAGE_SIZE, activeTab.leads.length - visibleCount)} of {activeTab.leads.length}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   PENTAGON GRAPH COMPONENT
══════════════════════════════════════ */
