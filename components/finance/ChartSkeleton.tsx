import React from 'react';

/**
 * Simple placeholder displayed while the chart data or library is loading.
 * Uses a pulsing block roughly matching the chart area.
 */
export default function ChartSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading chart"
      className="h-64 w-full animate-pulse rounded bg-muted"
    />
  );
}

