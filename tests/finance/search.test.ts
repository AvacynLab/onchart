import { test, expect } from '@playwright/test';
import { searchYahoo } from '../../lib/finance/search';

// Mocked fetch helper to restore original implementation after each test
async function withMockedFetch(mock: (url: any) => Promise<Response>, fn: () => Promise<void>) {
  const original = global.fetch;
  // @ts-ignore
  global.fetch = mock;
  try {
    await fn();
  } finally {
    // @ts-ignore
    global.fetch = original;
  }
}

test('searchYahoo returns API results when available', async () => {
  await withMockedFetch(async (url) => {
    if (String(url).includes('/v1/finance/search')) {
      return new Response(
        JSON.stringify({ quotes: [{ symbol: 'AAPL', shortname: 'Apple Inc.', quoteType: 'EQUITY' }] }),
        { status: 200 },
      );
    }
    throw new Error('unexpected url');
  }, async () => {
    const res = await searchYahoo('Apple');
    expect(res[0]).toEqual({ symbol: 'AAPL', name: 'Apple Inc.', type: 'EQUITY' });
  });
});

test('searchYahoo falls back to local list on failure', async () => {
  await withMockedFetch(async () => {
    throw new Error('network');
  }, async () => {
    const res = await searchYahoo('Apple');
    expect(res.some((r) => r.symbol === 'AAPL')).toBeTruthy();
  });
});
