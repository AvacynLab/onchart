import { test, expect } from '@playwright/test';
import { GET } from '../../../app/(chat)/api/finance/news/route';

function makeRequest(symbol: string) {
  return new Request(`https://example.com/api/finance/news?symbol=${symbol}`);
}

test('aggregates news items from RSS feeds', async () => {
  const originalFetch = global.fetch;
  const pub = new Date().toUTCString();
  const sampleXml = `<?xml version="1.0"?><rss><channel><item><title>Foo</title><link>http://a</link><pubDate>${pub}</pubDate><description>Bar</description></item></channel></rss>`;
  global.fetch = (async () => new Response(sampleXml, { status: 200 })) as any;

  const res = await GET(makeRequest('AAPL'));
  const body = await res.json();

  expect(res.status).toBe(200);
  expect(Array.isArray(body)).toBe(true);
  expect(body[0]).toMatchObject({ title: 'Foo', link: 'http://a' });

  global.fetch = originalFetch;
});

