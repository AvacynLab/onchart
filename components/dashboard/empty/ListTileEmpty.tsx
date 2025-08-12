import React from 'react';

/**
 * Generic empty state used by list-based dashboard tiles.
 * The wrapper exposes a `status` role with a polite live region so that
 * screen readers announce when a tile has no content yet. Callers provide the
 * localised message via children.
 */
export default function ListTileEmpty({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p
      className="text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      {children}
    </p>
  );
}
