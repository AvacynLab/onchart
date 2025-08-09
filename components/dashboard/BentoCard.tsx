import React, { type ReactNode } from 'react';

/**
 * Generic tile used inside the dashboard grid.
 * Provides a titled container with optional action area.
 */
interface BentoCardProps {
  /** Title displayed in the card header. */
  title: string;
  /** Optional action elements (buttons, links) rendered next to the title. */
  actions?: ReactNode;
  /** Card body content. */
  children: ReactNode;
}

export default function BentoCard({ title, actions, children }: BentoCardProps) {
  return (
    <div className="rounded-lg border p-4 bg-background shadow-sm flex flex-col min-h-[200px]">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {actions}
      </div>
      <div className="flex-1 overflow-auto text-sm text-foreground/80">{children}</div>
    </div>
  );
}
