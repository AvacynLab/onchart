import { test, expect } from '@playwright/test';
import { GET } from '../../../app/(chat)/api/finance/ohlc/route';

// Helper to create Request object with given query params
function makeRequest(query: string) {
  return new Request(`https://example.com/api/finance/ohlc?${query}`);
}

test('returns OHLC data from Yahoo Finance', async () => {
  const originalFetch = global.fetch;
  global.fetch = (async (url: string) => {
    if (url.includes('/v1/test/getcrumb')) {
      return new Response('crumb', { status: 200, headers: { 'set-cookie': 'a=b;' } });
    }
    if (url.includes('/v8/finance/chart/')) {
      return new Response(
        JSON.stringify({
          chart: {
            result: [
              {
                timestamp: [1],
                indicators: {
                  quote: [
                    {
                      open: [1],
                      high: [2],
                      low: [0.5],
                      close: [1.5],
                      volume: [100],
                    },
                  ],
                },
              },
            ],
          },
        }),
        { status: 200 },
      );
    }
    throw new Error(`Unhandled url: ${url}`);
  }) as any;

  const res = await GET(makeRequest('symbol=AAPL&interval=1d&range=1mo'));
  const body = await res.json();

  expect(res.status).toBe(200);
  expect(body.symbol).toBe('AAPL');
  expect(body.candles).toHaveLength(1);
  expect(body.candles[0]).toMatchObject({ open: 1, close: 1.5 });

  global.fetch = originalFetch;
});

test('falls back to Stooq when Yahoo fails', async () => {
  const originalFetch = global.fetch;
  global.fetch = (async (url: string) => {
    if (url.includes('query1.finance.yahoo.com')) {
      return new Response('err', { status: 500 });
    }
    if (url.includes('stooq.com')) {
      const csv = 'Date,Open,High,Low,Close,Volume\n2024-01-01,1,2,0.5,1.5,100';
      return new Response(csv, { status: 200 });
    }
    throw new Error(`Unhandled url: ${url}`);
  }) as any;

  const res = await GET(makeRequest('symbol=AAPL&interval=1d&range=1mo'));
  const body = await res.json();

  expect(res.status).toBe(200);
  expect(body.symbol).toBe('AAPL');
  expect(body.candles[0]).toMatchObject({ open: 1, close: 1.5 });

  global.fetch = originalFetch;
});

test('falls back to Binance for crypto symbols', async () => {
  const originalFetch = global.fetch;
  global.fetch = (async (url: string) => {
    if (url.includes('query1.finance.yahoo.com')) {
      return new Response('err', { status: 500 });
    }
    if (url.includes('api.binance.com')) {
      return new Response(JSON.stringify([[0, '1', '2', '0.5', '1.5', '100']]), {
        status: 200,
      });
    }
    throw new Error(`Unhandled url: ${url}`);
  }) as any;

  const res = await GET(makeRequest('symbol=BTCUSDT&interval=1m&range=1h'));
  const body = await res.json();

  expect(res.status).toBe(200);
  expect(body.symbol).toBe('BTCUSDT');
  expect(body.candles[0]).toMatchObject({ open: 1, close: 1.5 });

  global.fetch = originalFetch;
});
