import React from 'react';

export interface SymbolRecentProps {
  /** List of recently viewed symbols. */
  symbols: string[];
  /** Callback fired when a symbol chip is selected. */
  onSelect: (symbol: string) => void;
}

/**
 * Render recently viewed symbols as small clickable chips. The component is
 * purely presentational; persistence is handled by the parent component which
 * controls the list of `symbols`.
 */
export default function SymbolRecent({ symbols, onSelect }: SymbolRecentProps) {
  if (!symbols.length) return null;
  return (
    <div className="flex flex-wrap gap-1" data-testid="symbol-recent">
      {symbols.map((s) => (
        <button
          key={s}
          type="button"
          data-testid="symbol-chip"
          className="rounded bg-muted px-2 py-1 text-xs"
          onClick={() => onSelect(s)}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

