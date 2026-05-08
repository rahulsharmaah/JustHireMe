import { useEffect, useState } from "react";
import type {
  ApiFetch,
  KnowledgeCandidatePayload,
  KnowledgeGraphPayload,
  KnowledgePageDetail,
  KnowledgeStatus,
  KnowledgeSummary,
} from "../types";

const EMPTY_SUMMARY: KnowledgeSummary = {
  enabled: false,
  vaultPath: "",
  compiledAt: null,
  sourceCount: 0,
  pageCount: 0,
  nodeCount: 0,
  edgeCount: 0,
  openQuestions: [],
  featuredPages: [],
  home: "",
};

const EMPTY_GRAPH: KnowledgeGraphPayload = {
  enabled: false,
  generatedAt: null,
  nodes: [],
  edges: [],
  pages: [],
  communities: [],
};

const EMPTY_STATUS: KnowledgeStatus = {
  enabled: false,
  refreshing: false,
  lastRefreshAt: null,
  lastRefreshStatus: "idle",
  lastRefreshError: "",
  lastRefreshSummary: null,
  manifest: {
    version: 1,
    vaultPath: "",
    refreshCommand: [],
    sourceGroups: [],
    excludePaths: [],
  },
  candidateCounts: {
    pending: 0,
    promoted: 0,
    archived: 0,
  },
  compiledAt: null,
  sourceCount: 0,
  pageCount: 0,
  nodeCount: 0,
  edgeCount: 0,
  stale: false,
  latestSourceAt: null,
  changedSourceCount: 0,
  changedSources: [],
};

const EMPTY_CANDIDATES: KnowledgeCandidatePayload = {
  enabled: false,
  items: [],
  counts: {
    pending: 0,
    promoted: 0,
    archived: 0,
  },
};

function useJsonResource<T>(
  api: ApiFetch | null,
  path: string,
  emptyValue: T,
  reloadKey: number,
  pollMs = 0,
) {
  const [value, setValue] = useState<T>(emptyValue);
  const [loading, setLoading] = useState(Boolean(api));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!api) {
      setValue(emptyValue);
      setLoading(false);
      setLoaded(false);
      return;
    }
    let cancelled = false;
    let timer: number | null = null;
    let firstLoad = true;
    setLoading(true);

    const load = () => {
      api(path)
        .then(r => (r.ok ? r.json() : Promise.reject(new Error(`Request failed for ${path}`))))
        .then(data => {
          if (!cancelled) {
            setValue(data);
            setLoaded(true);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setValue(emptyValue);
            setLoaded(true);
          }
        })
        .finally(() => {
          if (!cancelled && firstLoad) {
            setLoading(false);
            firstLoad = false;
          }
        });
    };

    load();
    if (pollMs > 0) {
      timer = window.setInterval(load, pollMs);
    }

    return () => {
      cancelled = true;
      if (timer !== null) window.clearInterval(timer);
    };
  }, [api, emptyValue, path, pollMs, reloadKey]);

  return { data: value, loading, loaded };
}

export function useKnowledgeSummary(api: ApiFetch | null, reloadKey = 0) {
  return useJsonResource(api, "/api/v1/knowledge", EMPTY_SUMMARY, reloadKey);
}

export function useKnowledgeGraph(api: ApiFetch | null, reloadKey = 0) {
  return useJsonResource(api, "/api/v1/knowledge/graph", EMPTY_GRAPH, reloadKey);
}

export function useKnowledgeStatus(api: ApiFetch | null, reloadKey = 0, pollMs = 0) {
  return useJsonResource(api, "/api/v1/knowledge/status", EMPTY_STATUS, reloadKey, pollMs);
}

export function useKnowledgeCandidates(api: ApiFetch | null, status: string, reloadKey = 0) {
  return useJsonResource(
    api,
    `/api/v1/knowledge/candidates?status=${encodeURIComponent(status)}`,
    EMPTY_CANDIDATES,
    reloadKey,
  );
}

export function useKnowledgePage(api: ApiFetch | null, pagePath: string, reloadKey = 0) {
  const [page, setPage] = useState<KnowledgePageDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!api || !pagePath) {
      setPage(null);
      setLoading(false);
      setLoaded(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api(`/api/v1/knowledge/page?path=${encodeURIComponent(pagePath)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!cancelled) {
          setPage(data);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPage(null);
          setLoaded(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, pagePath, reloadKey]);
  return { data: page, loading, loaded };
}
