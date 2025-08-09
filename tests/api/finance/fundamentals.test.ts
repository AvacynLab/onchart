import { test, expect } from '@playwright/test';
import { GET } from '../../../app/(chat)/api/finance/fundamentals/route';

function makeRequest(ticker: string) {
  return new Request(`https://example.com/api/finance/fundamentals?ticker=${ticker}`);
}

test('returns fundamentals and ratios from SEC data', async () => {
  const originalFetch = global.fetch;
  global.fetch = (async (url: string) => {
    if (url.includes('company_tickers.json')) {
      return new Response(
        JSON.stringify({
          '0': { cik_str: 1234, ticker: 'TEST', title: 'Test Corp' },
        }),
        { status: 200 },
      );
    }
    if (url.includes('companyfacts')) {
      return new Response(
        JSON.stringify({
          facts: {
            Assets: { units: { USD: [{ end: '2023-12-31', val: 100 }] } },
            Liabilities: { units: { USD: [{ end: '2023-12-31', val: 40 }] } },
          },
        }),
        { status: 200 },
      );
    }
    throw new Error(`Unhandled url: ${url}`);
  }) as any;

  const res = await GET(makeRequest('TEST'));
  const body = await res.json();

  expect(res.status).toBe(200);
  expect(body).toMatchObject({
    cik: '0000001234',
    assets: 100,
    liabilities: 40,
    debtToAssets: 0.4,
  });

  global.fetch = originalFetch;
});

