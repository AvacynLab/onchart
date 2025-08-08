import React, { useEffect, useState } from 'react';

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

  // Fundamentals state tracking
  const [fundamentals, setFundamentals] = useState<{
    json: { pe?: number; revenue?: number; eps?: number };
    updatedAt: string;
  } | null>(null);
  const [fundamentalsError, setFundamentalsError] = useState<string | null>(
    null,
  );

  // Sentiment state tracking
  const [sentiment, setSentiment] = useState<
    { score: number; histogram: Array<{ ts: string; score: number }> } | null
  >(null);
  const [sentimentError, setSentimentError] = useState<string | null>(null);

  // News state tracking
  const [news, setNews] = useState<
    Array<{ headline: string; url: string | null; score: number; ts: string }>
  >();
  const [newsError, setNewsError] = useState<string | null>(null);

  // Fetch fundamentals once on mount
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/fundamentals/${symbol}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setFundamentals(data);
      })
      .catch(() => {
        if (!cancelled) setFundamentalsError('Failed to load fundamentals');
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  // Fetch sentiment once on mount
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/sentiment/${symbol}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setSentiment(data);
      })
      .catch(() => {
        if (!cancelled) setSentimentError('Failed to load sentiment');
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  // Fetch news once on mount
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/news/${symbol}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setNews(data.news);
      })
      .catch(() => {
        if (!cancelled) setNewsError('Failed to load news');
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

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

        {active === 'Fundamentals' && (
          <div>
            {!fundamentals && !fundamentalsError && <p>Loading...</p>}
            {fundamentalsError && (
              <p className="text-red-500">{fundamentalsError}</p>
            )}
            {fundamentals && (
              <div>
                <ul className="space-y-1">
                  <li>P/E: {fundamentals.json.pe ?? 'N/A'}</li>
                  <li>Revenue: {fundamentals.json.revenue ?? 'N/A'}</li>
                  <li>EPS: {fundamentals.json.eps ?? 'N/A'}</li>
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">
                  Updated {new Date(fundamentals.updatedAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}

        {active === 'Sentiment' && (
          <div>
            {!sentiment && !sentimentError && <p>Loading...</p>}
            {sentimentError && <p className="text-red-500">{sentimentError}</p>}
            {sentiment && (
              <div>
                <p>24h Avg Score: {sentiment.score.toFixed(2)}</p>
                <ul className="mt-2 flex h-8 items-end gap-1">
                  {sentiment.histogram.map((h) => (
                    <li
                      key={h.ts}
                      className="w-1 bg-blue-500"
                      style={{ height: `${Math.abs(h.score) * 16}px` }}
                    />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {active === 'News' && (
          <div>
            {!news && !newsError && <p>Loading...</p>}
            {newsError && <p className="text-red-500">{newsError}</p>}
            {news && (
              <ul className="space-y-2">
                {news.map((n) => (
                  <li key={n.ts}>
                    <a
                      href={n.url ?? '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      {n.headline}
                    </a>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {n.score.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

