import React, { type ReactNode } from 'react';

/**
 * Responsive CSS grid used on the dashboard to arrange Bento tiles.
 * The grid automatically adapts the number of columns to the viewport
 * width (1 column on small screens, 2 on medium, 4 on large).
 */
export default function BentoGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4 auto-rows-[minmax(200px,auto)]">
      {children}
    </div>
  );
}
