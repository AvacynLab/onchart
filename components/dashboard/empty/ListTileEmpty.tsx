import React from 'react';

/**
 * Generic empty state used by list-based dashboard tiles.
 * Accepts arbitrary children to display a message or guidance.
 */
export default function ListTileEmpty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
