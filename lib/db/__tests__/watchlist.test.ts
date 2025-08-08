import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getWatchlistSymbols } from '../watchlist';

test('getWatchlistSymbols reads from watchlist table', async () => {
  const db = {
    select: () => ({
      from: async () => [{ symbol: 'AAPL' }, { symbol: 'MSFT' }],
    }),
  } as any;
  const symbols = await getWatchlistSymbols(db);
  assert.deepStrictEqual(symbols, ['AAPL', 'MSFT']);
});

test('getWatchlistSymbols falls back to env var', async () => {
  const db = {
    select: () => ({
      from: async () => {
        throw new Error('missing');
      },
    }),
  } as any;
  process.env.MARKET_SYMBOLS = 'GOOG, TSLA';
  const symbols = await getWatchlistSymbols(db);
  assert.deepStrictEqual(symbols, ['GOOG', 'TSLA']);
});
