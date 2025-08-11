import React, { useId, type ReactNode } from 'react';

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
  /**
   * Optional id for the title element. When not provided we generate an
   * accessible id so the surrounding section can reference it via
   * `aria-labelledby`.
   */
  titleId?: string;
}

/**
 * Accessible card wrapper used inside the dashboard grid. Titles are bound to
 * the container via `aria-labelledby` so assistive technologies can announce
 * them when focusing the tile.
 */
export default function BentoCard({
  title,
  actions,
  children,
  titleId,
}: BentoCardProps) {
  // Always call `useId` to satisfy the React Hooks rules then fall back to the
  // generated value only when the caller did not provide a custom identifier.
  const generatedId = useId();
  const headingId = titleId ?? generatedId;
  return (
    <section
      className="rounded-lg border p-4 bg-background shadow-sm flex flex-col min-h-[200px]"
      aria-labelledby={headingId}
    >
      <div className="flex items-center justify-between mb-2">
        <h2 id={headingId} className="text-sm font-semibold">
          {title}
        </h2>
        {actions}
      </div>
      <div className="flex-1 overflow-auto text-sm text-foreground/80">
        {children}
      </div>
    </section>
  );
}
