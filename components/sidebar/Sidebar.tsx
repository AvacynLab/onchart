'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Simple sidebar container rendered into the `#sidebar` element defined in the
 * root layout. The component itself can hold navigation or other widgets.
 */
export function Sidebar({ children }: { children?: React.ReactNode }) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setContainer(document.getElementById('sidebar'));
  }, []);

  if (!container) return null;
  return createPortal(
    <div className="p-4 space-y-4">
      {children ?? <p className="text-sm text-muted-foreground">Sidebar</p>}
    </div>,
    container,
  );
}
