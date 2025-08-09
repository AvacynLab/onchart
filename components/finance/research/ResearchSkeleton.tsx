import React from 'react';

/**
 * Loading skeleton for research documents. Renders several pulsing lines
 * representing the upcoming content sections.
 */
export default function ResearchSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading research document">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-4 w-full animate-pulse rounded bg-muted"
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

