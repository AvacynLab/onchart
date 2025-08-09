import React from 'react';
import BentoCard from '../BentoCard';

/**
 * Generic skeleton placeholder for list-based tiles.
 * Renders a card with three pulsing lines to mimic content loading.
 */
export default function ListTileSkeleton({ title }: { title: string }) {
  return (
    <BentoCard title={title}>
      <ul className="space-y-2 animate-pulse" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <li key={i} className="h-4 bg-muted rounded" />
        ))}
      </ul>
    </BentoCard>
  );
}
