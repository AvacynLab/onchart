/**
 * News sentiment worker.
 *
 * This script fetches RSS feeds from Bloomberg, CNBC and Reuters,
 * extracts ticker symbols mentioned in headlines, scores their
 * sentiment using the VADER algorithm and persists the results in
 * the `news_sentiment` table.
 *
 * Environment variables required:
 * - `POSTGRES_URL`   – database connection string
 *
 * The worker is intended to run periodically (e.g. every few minutes)
 * to keep the sentiment table up to date.
 */
import type { AnyPgDatabase } from 'drizzle-orm/pg-core';
import { newsSentiment } from '../lib/db/schema';

// RSS feeds to scrape for financial headlines.
const FEED_URLS = [
  'https://www.bloomberg.com/feed/podcast/etf-report.xml',
  'https://www.cnbc.com/id/100003114/device/rss/rss.html',
  'https://feeds.reuters.com/reuters/businessNews',
];

// Matches tickers referenced as $SYMBOL within a headline.
const TICKER_PATTERN = /\$([A-Z]{1,5})/g;

// Lazily loaded VADER sentiment analyzer. When the optional dependency is not
// available the score defaults to `0` which is a neutral sentiment.
let analyzer: { polarity_scores(text: string): { compound: number } } | null = null;

async function computeSentiment(text: string): Promise<number> {
  if (!analyzer) {
    try {
      // Dynamically import to avoid runtime errors if the package is missing.
      analyzer = (await import('vader-sentiment')).SentimentIntensityAnalyzer;
    } catch {
      analyzer = { polarity_scores: () => ({ compound: 0 }) } as any;
    }
  }
  return analyzer.polarity_scores(text).compound;
}

// Attempt to parse RSS using the `rss-parser` package. If it's unavailable,
// fall back to a very small XML parser that extracts <item> blocks.
let RssParser: any = null;

async function parseFeed(xml: string): Promise<{ items: Array<{ title?: string; link?: string; isoDate?: string }> }> {
  if (RssParser === null) {
    try {
      RssParser = (await import('rss-parser')).default;
    } catch {
      RssParser = undefined;
    }
  }

  if (RssParser) {
    const parser = new RssParser();
    return parser.parseString(xml);
  }

  const items: Array<{ title?: string; link?: string; isoDate?: string }> = [];
  const itemRegex = /<item>(.*?)<\/item>/gs;
  let match: RegExpExecArray | null = itemRegex.exec(xml);
  while (match !== null) {
    const block = match[1];
    const title = block.match(/<title>(.*?)<\/title>/s)?.[1];
    const link = block.match(/<link>(.*?)<\/link>/s)?.[1];
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/s)?.[1];
    items.push({ title, link, isoDate: pubDate });
    match = itemRegex.exec(xml);
  }
  return { items };
}

/**
 * Fetch RSS items, compute sentiment scores and persist them.
 *
 * @param db - Drizzle database instance.
 * @param symbols - List of tickers to watch.
 * @param fetchImpl - Optional fetch implementation for testing.
 */
export async function refreshNews(
  db: AnyPgDatabase,
  symbols: string[],
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  for (const url of FEED_URLS) {
    const res = await fetchImpl(url);
    const xml = await res.text();
    const feed = await parseFeed(xml);

    for (const item of feed.items ?? []) {
      const title = item.title ?? '';
      TICKER_PATTERN.lastIndex = 0;
      let match: RegExpExecArray | null = TICKER_PATTERN.exec(title);
      while (match !== null) {
        const symbol = match[1];
        if (!symbols.includes(symbol)) {
          match = TICKER_PATTERN.exec(title);
          continue;
        }

        const score = await computeSentiment(title);

        await db.insert(newsSentiment).values({
          symbol,
          headline: title,
          url: item.link ?? '',
          score,
          ts: item.isoDate ? new Date(item.isoDate) : new Date(),
        });

        match = TICKER_PATTERN.exec(title);
      }
    }
  }
}

/**
 * Entry point when executed directly via `tsx scripts/news-worker.ts`.
 */
export async function main(): Promise<void> {
  const { POSTGRES_URL } = process.env;
  if (!POSTGRES_URL) {
    throw new Error('POSTGRES_URL is required');
  }

  const [{ default: postgres }, { drizzle }] = await Promise.all([
    import('postgres'),
    import('drizzle-orm/postgres-js'),
  ]);

  const pg = postgres(POSTGRES_URL);
  const db = drizzle(pg);
  const { getWatchlistSymbols } = await import('../lib/db/watchlist');
  const symbols = await getWatchlistSymbols(db);

  try {
    await refreshNews(db, symbols);
  } finally {
    await pg.end({ timeout: 5 });
  }
}

if (
  import.meta.url ===
  (process.argv[1] && new URL(`file://${process.argv[1]}`).href)
) {
  // eslint-disable-next-line no-console
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
