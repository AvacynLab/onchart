import { test, expect } from '@playwright/test';
import {
  fetchQuoteYahoo,
  fetchOHLCYahoo,
  searchYahoo,
} from '../../lib/finance/sources/yahoo';

test('fetchQuoteYahoo returns a valid quote', async () => {
  const q = await fetchQuoteYahoo('AAPL');
  expect(q.symbol).toBe('AAPL');
  expect(typeof q.price).toBe('number');
});

test('searchYahoo finds AAPL symbol', async () => {
  const results = await searchYahoo('Apple');
  expect(results.some((r) => r.symbol === 'AAPL')).toBeTruthy();
});

test('fetchOHLCYahoo returns candles', async () => {
  const candles = await fetchOHLCYahoo('AAPL', '1d', { range: '5d' });
  expect(candles.length).toBeGreaterThan(0);
  const c = candles[0];
  expect(typeof c.open).toBe('number');
});
