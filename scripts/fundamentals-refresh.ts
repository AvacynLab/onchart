/**
 * Daily fundamentals refresh script.
 *
 * Fetches financial fundamentals for a list of symbols from
 * Financial Modeling Prep and IEX Cloud, then upserts the combined
 * JSON payload into the `fundamentals` table.
 *
 * Environment variables required:
 * - `POSTGRES_URL`     – connection string for the database
 * - `FMP_API_KEY`      – API key for https://financialmodelingprep.com
 * - `IEX_CLOUD_KEY`    – API token for https://iexcloud.io
 *
 * The script is intended to be executed daily via cron around 07:00 UTC.
 */
import type { AnyPgDatabase } from 'drizzle-orm/pg-core';
import { fundamentals } from '../lib/db/schema';

/**
 * Fetch fundamentals from both providers and persist them.
 *
 * @param db - Drizzle database instance.
 * @param symbols - Symbols to refresh.
 * @param fetchImpl - Dependency injected fetch for testability.
 */
export async function refreshFundamentals(
  db: AnyPgDatabase,
  symbols: string[],
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const { FMP_API_KEY, IEX_CLOUD_KEY } = process.env;
  if (!FMP_API_KEY || !IEX_CLOUD_KEY) {
    throw new Error('FMP_API_KEY and IEX_CLOUD_KEY are required');
  }

  for (const symbol of symbols) {
    // Request profile information from both providers in parallel.
    const [fmpRes, iexRes] = await Promise.all([
      fetchImpl(
        `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${FMP_API_KEY}`,
      ),
      fetchImpl(
        `https://cloud.iexapis.com/stable/stock/${symbol}/quote?token=${IEX_CLOUD_KEY}`,
      ),
    ]);
    const fmpJson = (await fmpRes.json())[0] ?? {};
    const iexJson = await iexRes.json();
    const combined = { fmp: fmpJson, iex: iexJson };

    // Upsert into the fundamentals table with the current timestamp.
    const now = new Date();
    await db
      .insert(fundamentals)
      .values({ symbol, json: combined, updatedAt: now })
      .onConflictDoUpdate({
        target: fundamentals.symbol,
        set: { json: combined, updatedAt: now },
      });
  }
}

/**
 * Entry point when running via `tsx scripts/fundamentals-refresh.ts`.
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
    await refreshFundamentals(db, symbols);
  } finally {
    await pg.end({ timeout: 5 });
  }
}

if (import.meta.url === (process.argv[1] && new URL(`file://${process.argv[1]}`).href)) {
  // eslint-disable-next-line no-console
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
