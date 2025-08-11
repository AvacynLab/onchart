import { test, expect } from '@playwright/test';
import { GET } from '../../../app/(chat)/api/finance/quote/route';

// Helper to create Request object with given symbol
function makeRequest(symbol: string) {
  return new Request(`https://example.com/api/finance/quote?symbol=${symbol}`);
}

test('returns quote from Yahoo Finance', async () => {
  const originalFetch = global.fetch;
  let ua: string | undefined;
  // Mock Yahoo response and capture the User-Agent header
  global.fetch = (async (url: string, init?: RequestInit) => {
    if (url.includes('finance.yahoo.com')) {
      ua ??= (init?.headers as any)?.['User-Agent'];
      return new Response(
        JSON.stringify({
          quoteResponse: {
            result: [
              {
                symbol: 'AAPL',
                regularMarketPrice: 150,
                regularMarketChange: 1,
                regularMarketChangePercent: 0.7,
                marketState: 'REG',
              },
            ],
          },
        }),
        { status: 200 },
      );
    }
    throw new Error(`Unhandled url: ${url}`);
  }) as any;

  const res = await GET(makeRequest('AAPL'));
  const body = await res.json();

  expect(res.status).toBe(200);
  expect(ua).toBe('Mozilla/5.0');
  expect(body).toMatchObject({
    symbol: 'AAPL',
    price: 150,
    change: 1,
    changePercent: 0.7,
    marketState: 'REG',
  });

  global.fetch = originalFetch;
});

test('falls back to Binance when Yahoo fails', async () => {
  const originalFetch = global.fetch;
  global.fetch = (async (url: string) => {
    if (url.includes('finance.yahoo.com')) {
      return new Response('err', { status: 500 });
    }
    if (url.includes('api.binance.com')) {
      return new Response(JSON.stringify([[0, '10', '11', '9', '10.5', '100']]), {
        status: 200,
      });
    }
    throw new Error(`Unhandled url: ${url}`);
  }) as any;

  const res = await GET(makeRequest('BTCUSDT'));
  const body = await res.json();

  expect(res.status).toBe(200);
  expect(body).toMatchObject({ symbol: 'BTCUSDT', price: 10.5 });

  global.fetch = originalFetch;
});
