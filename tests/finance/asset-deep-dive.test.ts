import { test, expect } from '@playwright/test';
import { assetDeepDive } from '../../lib/finance/strategies';

// Deterministic timestamp for news item
const now = new Date().toUTCString();

// Mock fetch implementation returning canned SEC and RSS responses
const mockFetch: typeof fetch = async (url: any) => {
  const href = url.toString();
  if (href.includes('company_tickers')) {
    return new Response(
      JSON.stringify({ '0': { cik_str: 320193, ticker: 'AAPL', title: 'Apple Inc.' } }),
      { status: 200 },
    );
  }
  if (href.includes('submissions/CIK0000320193.json')) {
    return new Response(
      JSON.stringify({
        filings: {
          recent: {
            accessionNumber: ['0001'],
            form: ['10-K'],
            filingDate: ['2023-01-01'],
            primaryDocument: ['a.htm'],
          },
        },
      }),
      { status: 200 },
    );
  }
  if (href.includes('companyfacts/CIK0000320193.json')) {
    return new Response(
      JSON.stringify({
        facts: {
          Revenues: { units: { USD: [{ end: '2023-09-30', val: 200 }] } },
          EarningsPerShareDiluted: { units: { USD: [{ end: '2023-09-30', val: 5 }] } },
          Assets: { units: { USD: [{ end: '2023-09-30', val: 100 }] } },
          Liabilities: { units: { USD: [{ end: '2023-09-30', val: 40 }] } },
        },
      }),
      { status: 200 },
    );
  }
  if (href.startsWith('https://feeds.finance.yahoo.com')) {
    const xml = `<?xml version="1.0"?><rss><channel><item><title>News A</title><link>http://example.com/a</link><pubDate>${now}</pubDate><description>Summary A</description></item></channel></rss>`;
    return new Response(xml, { status: 200, headers: { 'Content-Type': 'text/xml' } });
  }
  if (href.startsWith('https://feeds.reuters.com') || href.startsWith('https://www.nasdaq.com')) {
    return new Response('<rss></rss>', { status: 200, headers: { 'Content-Type': 'text/xml' } });
  }
  return new Response('not found', { status: 404 });
};

test('asset deep dive aggregates SEC data and news', async () => {
  const res = await assetDeepDive('AAPL', mockFetch);
  expect(res.cik).toBe('0000320193');
  expect(res.fundamentals.revenue).toBe(200);
  expect(res.fundamentals.eps).toBe(5);
  expect(res.fundamentals.debtToAssets).toBeCloseTo(0.4);
  expect(res.filings).toHaveLength(1);
  expect(res.filings[0].form).toBe('10-K');
  expect(res.news).toHaveLength(1);
  expect(res.news[0].title).toBe('News A');
});
