export type ConnSt = "disconnected" | "connecting" | "connected";
export type View = "apply" | "dashboard" | "inbox" | "pipeline" | "jobs" | "graph" | "activity" | "profile" | "ingestion";
export type PipelineTab = "today" | "all" | "hot" | "found" | "evaluated" | "generated" | "applied" | "discarded";
export type LeadSort = "recommended" | "newest" | "signal" | "match" | "company";
export type SeniorityFilter = "all" | "beginner" | "fresher" | "junior" | "mid" | "senior" | "unknown";

export interface PipelineFilterState {
  tab: PipelineTab;
  search: string;
  platform: string;
  minSignal: number;
  minMatch: number;
  sort: LeadSort;
  budgetOnly: boolean;
  learningOnly: boolean;
  remoteOnly: boolean;
  uncontactedOnly: boolean;
  hideDiscarded: boolean;
  seniority: SeniorityFilter;
}

export interface SavedPipelineView {
  id: string;
  name: string;
  filters: PipelineFilterState;
  createdAt: string;
}

export interface KeywordCoverage {
  jd_terms?: string[];
  covered_terms?: string[];
  missing_terms?: string[];
  incorporated_terms?: string[];
  coverage_pct?: number;
}

export interface ContactLookup {
  status?: string;
  domain?: string;
  message?: string;
  primary_contact?: {
    name?: string;
    first_name?: string;
    title?: string;
    email?: string;
    linkedin_url?: string;
    confidence?: number;
    personalized_email?: string;
  };
  contacts?: {
    name?: string;
    title?: string;
    email?: string;
    linkedin_url?: string;
    confidence?: number;
  }[];
}

export interface ApplicationAnswer {
  key: string;
  label: string;
  question: string;
  answer: string;
  short_answer?: string;
  long_answer?: string;
}

export interface GenerationArtifacts {
  fingerprint?: string;
  generated_at?: string;
  artifacts?: {
    fit_summary?: string;
    company_hook?: string;
    target_role_summary?: string;
    selected_evidence?: string[];
  };
}

export interface Lead {
  job_id: string; title: string; company: string;
  url: string; platform: string; status: string; asset: string;
  resume_asset?: string; cover_letter_asset?: string; selected_projects?: string[];
  resume_version?: number;
  keyword_coverage?: KeywordCoverage;
  contact_lookup?: ContactLookup;
  application_answers?: ApplicationAnswer[];
  generation_artifacts?: GenerationArtifacts;
  score: number; reason: string; match_points: string[]; gaps?: string[];
  description?: string; kind?: string; budget?: string;
  signal_score?: number; signal_reason?: string; signal_tags?: string[];
  base_signal_score?: number; learning_delta?: number; learning_reason?: string;
  outreach_reply?: string; outreach_dm?: string; outreach_email?: string; proposal_draft?: string;
  fit_bullets?: string[]; followup_sequence?: string[]; proof_snippet?: string;
  tech_stack?: string[]; location?: string; urgency?: string;
  seniority_level?: string;
  lead_quality_score?: number; lead_quality_reason?: string;
  source_meta?: Record<string, any>; feedback?: string; feedback_note?: string;
  followup_due_at?: string; last_contacted_at?: string;
  created_at?: string;
  events?: { action: string; ts: string }[];
}
export interface GraphStats {
  candidate: number; skill: number; project: number;
  experience: number; joblead: number;
}

export interface KnowledgePageRef {
  id: string;
  path: string;
  title: string;
  kind?: string;
  status?: string;
  sourceIds?: string[];
  updatedAt?: string;
  confidence?: number;
}

export interface KnowledgeGraphNode {
  id: string;
  type: string;
  label: string;
  pageId?: string;
  communityId?: string;
  degree?: number;
  confidence?: number;
  freshness?: string;
  tags?: string[];
  sourceIds?: string[];
}

export interface KnowledgeGraphEdge {
  id: string;
  source: string;
  target: string;
  relation?: string;
  confidence?: number;
}

export interface KnowledgeCommunity {
  id: string;
  label?: string;
  nodeIds?: string[];
}

export interface KnowledgeSummary {
  enabled: boolean;
  vaultPath: string;
  compiledAt: string | null;
  sourceCount: number;
  pageCount: number;
  nodeCount: number;
  edgeCount: number;
  openQuestions: string[];
  featuredPages: KnowledgePageRef[];
  home: string;
}

export interface KnowledgeManifestSourceGroup {
  id: string;
  label: string;
  kind: string;
  paths: string[];
}

export interface KnowledgeManifest {
  version: number;
  vaultPath: string;
  refreshCommand: string[];
  sourceGroups: KnowledgeManifestSourceGroup[];
  excludePaths: string[];
}

export interface KnowledgeGraphPayload {
  enabled: boolean;
  generatedAt: string | null;
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  pages: KnowledgePageRef[];
  communities: KnowledgeCommunity[];
}

export interface KnowledgePageDetail {
  enabled: boolean;
  id: string;
  path: string;
  title: string;
  kind: string;
  status: string;
  reviewStatus?: "pending" | "promoted" | "archived";
  updatedAt: string;
  sourceIds: string[];
  content: string;
  excerpt: string;
}

export interface KnowledgeStatus {
  enabled: boolean;
  refreshing: boolean;
  lastRefreshAt: string | null;
  lastRefreshStatus: string;
  lastRefreshError: string;
  lastRefreshSummary?: Record<string, any> | null;
  manifest: KnowledgeManifest;
  candidateCounts: {
    pending: number;
    promoted: number;
    archived: number;
  };
  compiledAt: string | null;
  sourceCount: number;
  pageCount: number;
  nodeCount: number;
  edgeCount: number;
  stale: boolean;
  latestSourceAt: string | null;
  changedSourceCount: number;
  changedSources: {
    groupId: string;
    groupLabel: string;
    path: string;
    mtime: number;
  }[];
}

export interface KnowledgeCandidate {
  id: string;
  path: string;
  title: string;
  kind: string;
  status: string;
  reviewStatus: "pending" | "promoted" | "archived";
  sourceIds: string[];
  confidence?: number | string;
  updatedAt?: string;
  excerpt: string;
  category: string;
}

export interface KnowledgeCandidatePayload {
  enabled: boolean;
  items: KnowledgeCandidate[];
  counts: {
    pending: number;
    promoted: number;
    archived: number;
  };
}
export interface LogLine {
  id: number; ts: string; msg: string; src: string;
  kind: "heartbeat" | "agent" | "system";
}

export type WorkerTaskStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export interface WorkerTask {
  id: string;
  queue: string;
  kind: string;
  payload: Record<string, any>;
  status: WorkerTaskStatus;
  attempts: number;
  max_attempts: number;
  priority: number;
  unique_key: string;
  available_at: string;
  created_at: string;
  updated_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  leased_by?: string | null;
  lease_expires_at?: string | null;
  last_error?: string | null;
}

export interface WorkerTasksPayload {
  enabled: boolean;
  concurrency: number;
  active: WorkerTask[];
  recent: WorkerTask[];
  counts: Record<WorkerTaskStatus, number>;
}

export type ApiFetch = (path: string, opts?: RequestInit) => Promise<Response>;

export interface FormField {
  type: string;
  label: string;
  selector: string;
  answer: string;
  found_on_page: boolean;
  confidence: "high" | "medium" | "low";
}

export interface FormReadResult {
  platform: string | null;
  platform_label: string;
  screenshot_b64: string;
  fields: FormField[];
  unmatched_labels: string[];
  suggested_answers?: {
    label: string;
    key: string;
    answer: string;
    short_answer?: string;
    long_answer?: string;
  }[];
  error: string | null;
}

export interface ApplyPreviewResult extends FormReadResult {
  stage: "preview";
  job_id: string;
  missing_answers: string[];
  sensitive_labels: string[];
  requires_user_review: boolean;
  can_fill: boolean;
  can_submit: boolean;
}

export interface ApplyRunResult {
  stage: "fill" | "submit";
  job_id: string;
  status?: string;
  submitted?: boolean;
  fields_filled?: string[];
  resume_uploaded?: boolean;
  ready_to_submit?: boolean;
  screenshot_b64?: string;
}
