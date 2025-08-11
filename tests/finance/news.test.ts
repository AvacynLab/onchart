import test from 'node:test';
import { strict as assert } from 'node:assert';
import { fetchRssFeeds } from '../../lib/finance/sources/news';

// Sample RSS feeds for testing aggregation and sorting.
const yahooFeed = `<?xml version="1.0"?><rss><channel><item><title>Yahoo A</title><link>http://yahoo/a</link><pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate><description>desc</description></item></channel></rss>`;
const reutersFeed = `<?xml version="1.0"?><rss><channel><item><title>Reuters B</title><link>http://reuters/b</link><pubDate>Tue, 02 Jan 2024 00:00:00 GMT</pubDate><description>desc</description></item></channel></rss>`;
const nasdaqFeed = `<?xml version="1.0"?><rss><channel></channel></rss>`;

test('fetchRssFeeds merges and sorts items from multiple feeds', async () => {
  const fetcher = async (url: string) => {
    if (url.includes('yahoo')) return new Response(yahooFeed);
    if (url.includes('reuters')) return new Response(reutersFeed);
    if (url.includes('nasdaq')) return new Response(nasdaqFeed);
    throw new Error('unexpected url');
  };
  const items = await fetchRssFeeds('AAPL', 1000, fetcher as any);
  assert.equal(items.length, 2);
  assert.equal(items[0].title, 'Reuters B');
  assert.equal(items[1].title, 'Yahoo A');
});
