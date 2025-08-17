import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchLiveQuotes } from '../../lib/finance/live';
import { invalidateCache } from '../../lib/finance/cache';

test('derive base URL from forwarded headers and disable cache', async () => {
  invalidateCache('live:AAPL');
  let calledUrl = '';
  let cacheHeader: any;
  const fetcher: typeof fetch = async (url: any, init?: RequestInit) => {
    calledUrl = String(url);
    cacheHeader = init?.cache;
    return new Response(
      JSON.stringify({ symbol: 'AAPL', price: 1, change: 0, changePercent: 0, marketState: 'CLOSED' }),
      { status: 200 },
    );
  };
  await fetchLiveQuotes(['AAPL'], {
    fetcher,
    getHeaders: () =>
      new Headers([
        ['x-forwarded-proto', 'https'],
        ['x-forwarded-host', 'example.com'],
      ]),
  });
  assert.equal(calledUrl.startsWith('https://example.com/api/finance/quote'), true);
  assert.equal(cacheHeader, 'no-store');
});

test('fallback to localhost when headers and env are missing', async () => {
  invalidateCache('live:AAPL');
  let calledUrl = '';
  const fetcher: typeof fetch = async (url: any) => {
    calledUrl = String(url);
    return new Response(
      JSON.stringify({ symbol: 'AAPL', price: 1, change: 0, changePercent: 0, marketState: 'CLOSED' }),
      { status: 200 },
    );
  };
  const originalEnv = { ...process.env };
  delete process.env.NEXT_PUBLIC_VERCEL_URL;
  await fetchLiveQuotes(['AAPL'], { fetcher, getHeaders: () => new Headers() });
  assert.equal(calledUrl.startsWith('http://localhost:3000'), true);
  process.env = originalEnv;
});

test('uses NEXT_PUBLIC_VERCEL_URL in production when headers missing', async () => {
  invalidateCache('live:AAPL');
  let calledUrl = '';
  const fetcher: typeof fetch = async (url: any) => {
    calledUrl = String(url);
    return new Response(
      JSON.stringify({ symbol: 'AAPL', price: 1, change: 0, changePercent: 0, marketState: 'CLOSED' }),
      { status: 200 },
    );
  };
  const originalEnv = { ...process.env };
  process.env.NEXT_PUBLIC_VERCEL_URL = 'myapp.vercel.app';
  process.env.NODE_ENV = 'production';
  await fetchLiveQuotes(['AAPL'], { fetcher, getHeaders: () => new Headers() });
  assert.equal(calledUrl.startsWith('https://myapp.vercel.app'), true);
  process.env = originalEnv;
});

test('retries on transient 502 errors', async () => {
  invalidateCache('live:AAPL');
  let calls = 0;
  const fetcher: typeof fetch = async () => {
    calls++;
    if (calls < 3) {
      return new Response('', { status: 502, statusText: 'Bad Gateway' });
    }
    return new Response(
      JSON.stringify({ symbol: 'AAPL', price: 1, change: 0, changePercent: 0, marketState: 'CLOSED' }),
      { status: 200 },
    );
  };
  const quotes = await fetchLiveQuotes(
    ['AAPL'],
    {
      fetcher,
      getHeaders: () =>
        new Headers([
          ['x-forwarded-proto', 'https'],
          ['x-forwarded-host', 'retry.com'],
        ]),
    },
  );
  assert.equal(quotes[0].price, 1);
  assert.equal(calls, 3);
});
