import { test, expect } from '@playwright/test';
import fetchRssFeeds, { extractItems } from '../../lib/finance/sources/news';

const sampleXml = `<rss><channel><item><title>Sample</title><link>https://a.com</link><pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate><description>Test</description></item></channel></rss>`;

test('extractItems parses basic RSS item', () => {
  const items = extractItems(sampleXml);
  expect(items).toHaveLength(1);
  expect(items[0].title).toBe('Sample');
});

test('fetchRssFeeds merges multiple sources', async () => {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const yahooDate = new Date(now - day).toUTCString();
  const reutersDate = new Date(now).toUTCString();
  const nasdaqDate = new Date(now - 2 * day).toUTCString();
  const yahooXml = `<rss><channel><item><title>Y1</title><link>https://y</link><pubDate>${yahooDate}</pubDate><description>Ydesc</description></item></channel></rss>`;
  const reutersXml = `<rss><channel><item><title>R1</title><link>https://r</link><pubDate>${reutersDate}</pubDate><description>Rdesc</description></item></channel></rss>`;
  const nasdaqXml = `<rss><channel><item><title>N1</title><link>https://n</link><pubDate>${nasdaqDate}</pubDate><description>Ndesc</description></item></channel></rss>`;

  const fakeFetch = async (url: any) => {
    const href = url.toString();
    if (href.includes('yahoo')) return new Response(yahooXml, { status: 200 });
    if (href.includes('reuters')) return new Response(reutersXml, { status: 200 });
    if (href.includes('nasdaq')) return new Response(nasdaqXml, { status: 200 });
    return new Response('', { status: 404 });
  };

  const items = await fetchRssFeeds('AAPL', 7, fakeFetch as any);
  expect(items).toHaveLength(3);
  expect(items[0].title).toBe('R1');
});
