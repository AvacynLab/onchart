import React, { type ReactNode } from 'react';

/**
 * Responsive CSS grid used on the dashboard to arrange Bento tiles.
 * The grid automatically adapts the number of columns to the viewport
 * width (1 column on small screens, 2 on medium, 4 on large).
 */
interface BentoGridProps {
  /** Child tiles displayed inside the grid. */
  children: ReactNode;
  /** Optional aria-labelledby attribute to describe the grid. */
  'aria-labelledby'?: string;
}

/**
 * Responsive CSS grid used on the dashboard to arrange Bento tiles.
 * The grid automatically adapts the number of columns to the viewport
 * width (1 column on small screens, 2 on medium, 4 on large).
 */
export default function BentoGrid({ children, ...props }: BentoGridProps) {
  // `bento-grid` provides a stable hook for tests and CSS transitions.
  return (
    <div
      className="bento-grid grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4 auto-rows-[minmax(200px,auto)]"
      role="grid"
      data-testid="bento-grid"
      {...props}
    >
      {children}
    </div>
  );
}
