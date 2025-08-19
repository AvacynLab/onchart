'use client';

import { useAsset, Timeframe } from '@/lib/asset/AssetContext';
import { SidebarToggle } from '@/components/sidebar-toggle';

/**
 * Header displayed at the top of the bento dashboard.
 * Contains sidebar toggle, asset title and timeframe selectors.
 */
export function BentoHeader() {
  const { asset, setTimeframe } = useAsset();
  const timeframes: Timeframe[] = ['1m', '5m', '1h', '4h', '1d'];

  return (
    <header className="flex items-center gap-2">
      {/* Toggle the navigation sidebar using the shared sidebar store. */}
      <SidebarToggle />
      <h1 className="font-semibold">
        {asset.symbol}
        {asset.name ? ` - ${asset.name}` : ''}
      </h1>
      <div className="ml-auto flex gap-1">
        {timeframes.map((tf) => (
          <button
            key={tf}
            type="button"
            onClick={() => setTimeframe(tf)}
            className={
              'px-2 py-1 rounded text-sm border ' +
              (asset.timeframe === tf ? 'bg-primary text-primary-foreground' : '')
            }
          >
            {tf}
          </button>
        ))}
      </div>
    </header>
  );
}
