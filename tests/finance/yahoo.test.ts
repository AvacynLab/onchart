import { test, expect } from '@playwright/test';
import {
  fetchQuoteYahoo,
  fetchOHLCYahoo,
  searchYahoo,
} from '../../lib/finance/sources/yahoo';
import { invalidateCache } from '../../lib/finance/cache';

/**
 * Yahoo Finance tests use mocked responses so unit tests remain
 * deterministic and do not hit the real network.
 */

test('fetchQuoteYahoo parses a quote response', async () => {
  const originalFetch = global.fetch;
  // Ensure the quote isn't served from a prior cache entry so the mocked
  // response below is always used.
  invalidateCache('https://query1.finance.yahoo.com/v7/finance/quote?symbols=AAPL');
  // Minimal payload that exercises the quote parsing logic.
  global.fetch = (async (url: any) =>
    new Response(
      JSON.stringify({
        quoteResponse: {
          result: [
            {
              symbol: 'AAPL',
              regularMarketPrice: 123,
              regularMarketChange: 1,
              regularMarketChangePercent: 0.5,
              marketState: 'REG',
            },
          ],
        },
      }),
      { status: 200 },
    )) as any;
  const q = await fetchQuoteYahoo('AAPL');
  expect(q).toEqual({
    symbol: 'AAPL',
    price: 123,
    change: 1,
    changePercent: 0.5,
    marketState: 'REG',
  });
  global.fetch = originalFetch;
});

test('searchYahoo returns matching symbols', async () => {
  const originalFetch = global.fetch;
  global.fetch = (async () =>
    new Response(
      JSON.stringify({
        quotes: [{ symbol: 'AAPL', shortname: 'Apple Inc.', quoteType: 'EQUITY' }],
      }),
      { status: 200 },
    )) as any;
  const results = await searchYahoo('Apple');
  expect(results).toEqual([
    { symbol: 'AAPL', name: 'Apple Inc.', type: 'EQUITY' },
  ]);
  global.fetch = originalFetch;
});

test('fetchOHLCYahoo falls back to Stooq on failure', async () => {
  const originalFetch = global.fetch;
  // Ensure the fallback request isn't satisfied by a cached Stooq response
  // from previous tests so the mocked payload below is always used.
  invalidateCache('https://stooq.com/q/d/l/?s=aapl.us&i=d');
  // Simulate Yahoo session and chart failure followed by Stooq CSV success.
  global.fetch = (async (url: any) => {
    const href = url.toString();
    if (href.includes('getcrumb')) {
      return new Response('crumb', {
        status: 200,
        headers: { 'set-cookie': 'test=1' },
      });
    }
    if (href.includes('query1.finance.yahoo.com')) {
      throw new Error('Yahoo down');
    }
    if (href.includes('stooq.com')) {
      return new Response(
        'Date,Open,High,Low,Close,Volume\n2024-01-01,1,2,0.5,1.5,1000',
        { status: 200 },
      );
    }
    throw new Error(`unexpected url ${href}`);
  }) as any;
  const candles = await fetchOHLCYahoo('AAPL', '1d', { range: '7d' });
  expect(candles).toEqual([
    { time: 1704067200, open: 1, high: 2, low: 0.5, close: 1.5, volume: 1000 },
  ]);
  global.fetch = originalFetch;
});
