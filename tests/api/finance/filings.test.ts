import { test, expect } from '@playwright/test';
import { GET } from '../../../app/(chat)/api/finance/filings/route';

function makeRequest(ticker: string, forms?: string) {
  const url = new URL('https://example.com/api/finance/filings');
  url.searchParams.set('ticker', ticker);
  if (forms) url.searchParams.set('forms', forms);
  return new Request(url.toString());
}

test('lists filings for a ticker from SEC', async () => {
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
    if (url.includes('submissions')) {
      return new Response(
        JSON.stringify({
          filings: {
            recent: {
              accessionNumber: ['0000000000-23-000001'],
              form: ['10-K'],
              filingDate: ['2023-12-31'],
              primaryDocument: ['form10k.htm'],
            },
          },
        }),
        { status: 200 },
      );
    }
    throw new Error(`Unhandled url: ${url}`);
  }) as any;

  const res = await GET(makeRequest('TEST', '10-K'));
  const body = await res.json();

  expect(res.status).toBe(200);
  expect(Array.isArray(body)).toBe(true);
  expect(body[0]).toMatchObject({ form: '10-K', accession: '0000000000-23-000001' });

  global.fetch = originalFetch;
});

