'use client';

import { useAsset, type Timeframe } from '@/lib/asset/AssetContext';
import { useTranslations } from 'next-intl';
import { ChartGrid } from './ChartGrid';

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '1h', '4h', '1d'];
const SPLITS: (1 | 2 | 4)[] = [1, 2, 4];

/**
 * Card wrapping the chart grid with controls for timeframe, split view and
 * synchronisation. The current asset state is sourced from the shared
 * `AssetContext` so updates propagate to the rest of the dashboard.
 */
export function ChartCard() {
  const { asset, setTimeframe, setPanes, toggleSync } = useAsset();
  const t = useTranslations('dashboard.bento');

  return (
    <div className="border rounded p-3 min-h-0 flex flex-col">
      {/* Header with asset symbol and chart controls */}
      <div className="flex items-center justify-between mb-2 text-sm">
        <h2 className="font-semibold" data-testid="chart-title">
          {asset.symbol}
        </h2>
        <div className="flex items-center gap-2">
          {/* timeframe buttons */}
          <div className="flex gap-1" data-testid="tf-group">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 rounded border text-xs ${
                  asset.timeframe === tf ? 'bg-black text-white' : ''
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
          {/* split selector */}
          <div className="flex gap-1" data-testid="split-group" aria-label={t('split')}>
            {SPLITS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPanes(p)}
                className={`px-2 py-1 rounded border text-xs ${
                  asset.panes === p ? 'bg-black text-white' : ''
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          {/* sync toggle */}
          <button
            type="button"
            aria-label={t('sync')}
            onClick={toggleSync}
            className={`px-2 py-1 rounded border text-xs ${
              asset.sync ? 'bg-black text-white' : ''
            }`}
          >
            {t('sync')}
          </button>
        </div>
      </div>
      {/* Chart grid expands to fill remaining space */}
      <div className="flex-1 min-h-0">
        <ChartGrid
          panes={asset.panes}
          asset={asset}
          timeframe={asset.timeframe}
          sync={asset.sync}
        />
      </div>
    </div>
  );
}

export default ChartCard;

