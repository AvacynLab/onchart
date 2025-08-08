/**
 * Social sentiment worker.
 *
 * Streams recent tweets and Reddit posts mentioning tracked ticker symbols,
 * computes a simple sentiment score using the VADER algorithm and inserts the
 * results into the `news_sentiment` table.  This complements the RSS news
 * worker by sourcing sentiment from social platforms.
 *
 * Environment variables required:
 * - `POSTGRES_URL`   – database connection string
 * - `TWITTER_BEARER_TOKEN` – token for Twitter's recent search endpoint
 *
 * Reddit's public search API is used without authentication; however the
 * optional `REDDIT_CLIENT_ID` and `REDDIT_SECRET` may be provided for future
 * expansion.
 */
import type { AnyPgDatabase } from 'drizzle-orm/pg-core';
import { newsSentiment } from '../lib/db/schema';

// Lazily loaded VADER sentiment analyzer. Falls back to neutral scoring when
// the optional dependency is unavailable.
let analyzer: { polarity_scores(text: string): { compound: number } } | null = null;
async function computeSentiment(text: string): Promise<number> {
  if (!analyzer) {
    try {
      analyzer = (await import('vader-sentiment')).SentimentIntensityAnalyzer;
    } catch {
      analyzer = { polarity_scores: () => ({ compound: 0 }) } as any;
    }
  }
  return analyzer.polarity_scores(text).compound;
}

/** Fetch recent tweets mentioning a ticker. */
async function fetchTweets(
  symbol: string,
  token: string,
  fetchImpl: typeof fetch,
): Promise<Array<{ id: string; text: string; created_at?: string }>> {
  const res = await fetchImpl(
    `https://api.twitter.com/2/tweets/search/recent?query=%24${symbol}&tweet.fields=created_at&max_results=10`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const json = await res.json();
  return json.data ?? [];
}

/** Fetch recent Reddit posts mentioning a ticker. */
async function fetchReddit(
  symbol: string,
  fetchImpl: typeof fetch,
): Promise<Array<{ title: string; permalink: string; created_utc?: number }>> {
  const res = await fetchImpl(
    `https://www.reddit.com/search.json?q=%24${symbol}&limit=10`,
    {
      headers: { 'User-Agent': 'onchart-bot/1.0' },
    },
  );
  const json = await res.json();
  const children = json.data?.children ?? [];
  return children.map((c: any) => c.data);
}

/**
 * Refresh social sentiment for the provided symbols.
 *
 * @param db - Drizzle database instance
 * @param symbols - list of symbols to track
 * @param token - Twitter bearer token
 * @param fetchImpl - optional fetch implementation for tests
 */
export async function refreshSocial(
  db: AnyPgDatabase,
  symbols: string[],
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  for (const symbol of symbols) {
    if (token) {
      const tweets = await fetchTweets(symbol, token, fetchImpl);
      for (const t of tweets) {
        const score = await computeSentiment(t.text);
        await db.insert(newsSentiment).values({
          symbol,
          headline: t.text,
          url: `https://twitter.com/i/web/status/${t.id}`,
          score,
          ts: t.created_at ? new Date(t.created_at) : new Date(),
        });
      }
    }

    const posts = await fetchReddit(symbol, fetchImpl);
    for (const p of posts) {
      const score = await computeSentiment(p.title);
      await db.insert(newsSentiment).values({
        symbol,
        headline: p.title,
        url: `https://reddit.com${p.permalink}`,
        score,
        ts: p.created_utc ? new Date(p.created_utc * 1000) : new Date(),
      });
    }
  }
}

/** Entry point when executed directly. */
export async function main(): Promise<void> {
  const { POSTGRES_URL, TWITTER_BEARER_TOKEN } = process.env;
  if (!POSTGRES_URL || !TWITTER_BEARER_TOKEN) {
    throw new Error('POSTGRES_URL and TWITTER_BEARER_TOKEN are required');
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
    await refreshSocial(db, symbols, TWITTER_BEARER_TOKEN);
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

