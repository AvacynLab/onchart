'use client';

import { useAsset, Timeframe } from '@/lib/asset/AssetContext';

/**
 * Header displayed at the top of the bento dashboard.
 * Contains sidebar toggle, asset title and timeframe selectors.
 */
export function BentoHeader() {
  const { asset, setTimeframe } = useAsset();
  const timeframes: Timeframe[] = ['1m', '5m', '1h', '4h', '1d'];

  function toggleSidebar() {
    const current =
      getComputedStyle(document.documentElement).getPropertyValue(
        '--sidebar-w',
      ) || '0px';
    const next = current.trim() === '0px' ? '300px' : '0px';
    document.documentElement.style.setProperty('--sidebar-w', next);
  }

  return (
    <header className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Toggle sidebar"
        onClick={toggleSidebar}
        className="rounded border px-2 py-1"
      >
        ☰
      </button>
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
