import React from 'react';

/**
 * Loading skeleton for research documents. Renders several pulsing lines
 * representing the upcoming content sections.
 */
export default function ResearchSkeleton() {
  // Generate deterministic identifiers to avoid using array indices as keys.
  const placeholders = ['a', 'b', 'c', 'd', 'e'];
  return (
    <div className="space-y-4" role="status" aria-label="Loading research document">
      {placeholders.map((id) => (
        <div
          key={id}
          className="h-4 w-full animate-pulse rounded bg-muted"
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

