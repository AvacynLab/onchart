import type { AnyPgDatabase } from 'drizzle-orm/pg-core';
import { watchlist } from './schema';

/**
 * Load ticker symbols to monitor from the database or environment.
 */
export async function getWatchlistSymbols(
  db: AnyPgDatabase,
): Promise<string[]> {
  try {
    const rows = await db.select({ symbol: watchlist.symbol }).from(watchlist);
    const symbols = rows.map((r) => String(r.symbol)).filter(Boolean);
    if (symbols.length) return symbols;
  } catch {
    // Ignore missing table or query errors
  }
  const env = process.env.MARKET_SYMBOLS;
  return env
    ? env
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
}
