 'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { Strategy } from '@/lib/db/schema';

/**
 * Mapping from internal status codes to French labels displayed in the UI.
 */
const statusLabels: Record<Strategy['status'], string> = {
  draft: 'Ébauche',
  proposed: 'Proposée',
  validated: 'Validée',
};

/**
 * Renders a short summary of a saved trading strategy with status, last update
 * information and quick action links. The actions are placeholders for future
 * workflows such as running a new backtest or refining parameters.
 */
export default function StrategyCard({ strategy }: { strategy: Strategy }) {
  return (
    <div className="flex flex-col gap-1 border rounded-md p-2">
      <div className="flex items-center justify-between">
        <span className="font-medium">{strategy.title}</span>
        {/* Human readable status badge */}
        <span className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
          {statusLabels[strategy.status]}
        </span>
      </div>
      {/* Relative date of last update */}
      <span className="text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(strategy.updatedAt), { addSuffix: true })}
      </span>
      <div className="flex gap-2 mt-1">
        <button
          className="text-xs underline"
          aria-label="Lancer un backtest sur cette stratégie"
        >
          Backtester
        </button>
        <button
          className="text-xs underline"
          aria-label="Affiner les paramètres de cette stratégie"
        >
          Affiner
        </button>
      </div>
    </div>
  );
}

