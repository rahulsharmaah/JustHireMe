export function SkeletonLine({ width = "100%" }: { width?: string }) {
  return <span className="skeleton-line" style={{ width }} />;
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <SkeletonLine width="38%" />
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonLine key={index} width={index % 2 ? "64%" : "82%"} />
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 4, rows = 2 }: { count?: number; rows?: number }) {
  return (
    <div className="skeleton-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} rows={rows} />
      ))}
    </div>
  );
}

export function LoadingPanel({ title = "Loading", rows = 4 }: { title?: string; rows?: number }) {
  return (
    <div className="loading-panel" role="status" aria-live="polite">
      <div className="loading-panel-head">
        <span className="spinner" />
        <span>{title}</span>
      </div>
      <div className="loading-panel-body">
        {Array.from({ length: rows }).map((_, index) => (
          <SkeletonLine key={index} width={index % 3 === 0 ? "74%" : index % 3 === 1 ? "92%" : "58%"} />
        ))}
      </div>
    </div>
  );
}
