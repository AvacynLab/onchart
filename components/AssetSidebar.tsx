import React, { useState } from 'react';

/**
 * Properties for {@link AssetSidebar}.
 * Accepts the `symbol` being analysed so placeholder content can reference it.
 */
export interface AssetSidebarProps {
  /** Stock or crypto ticker symbol, e.g. `AAPL` or `BTC`. */
  symbol: string;
}

/**
 * Tab identifiers used within the component.
 * Using a string literal union ensures type safety when switching tabs.
 */
const TABS = ["Overview", "Fundamentals", "Sentiment", "News"] as const;
export type Tab = (typeof TABS)[number];

/**
 * Sidebar component displaying several informational tabs for an asset.
 *
 * The UI is intentionally minimal – content for each tab will be
 * implemented later. For now we provide placeholders so the layout can be
 * tested and iterated upon.
 */
export default function AssetSidebar({ symbol }: AssetSidebarProps) {
  const [active, setActive] = useState<Tab>('Overview');

  return (
    <aside className="flex w-64 flex-col border-l">
      {/* Tab selectors */}
      <nav className="flex border-b">
        {TABS.map((tab) => (
          <button
            type="button"
            key={tab}
            onClick={() => setActive(tab)}
            className={`flex-1 px-3 py-2 text-sm ${active === tab ? 'font-semibold' : 'text-muted-foreground'}`}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* Active tab content */}
      <div className="flex-1 overflow-y-auto p-4 text-sm">
        {active === 'Overview' && <p>{symbol} overview coming soon.</p>}
        {active === 'Fundamentals' && <p>Fundamental data will appear here.</p>}
        {active === 'Sentiment' && <p>Sentiment metrics will appear here.</p>}
        {active === 'News' && <p>Latest news articles will appear here.</p>}
      </div>
    </aside>
  );
}

