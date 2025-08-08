import { test } from 'node:test';
import assert from 'node:assert/strict';
import { refreshNews } from '../news-worker';

// Mock environment symbol list for the test
const symbols = ['AAPL'];

test('refreshNews parses RSS and inserts sentiment rows', async () => {
  const inserts: any[] = [];
  const db = {
    insert: () => ({
      values: (val: any) => {
        inserts.push(val);
        return Promise.resolve();
      },
    }),
  } as any;

  const rss = `<?xml version="1.0"?><rss><channel><item><title>Positive outlook for $AAPL after product launch</title><link>https://example.com/aapl</link><pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate></item><item><title>General market news</title></item></channel></rss>`;

  const fetchMock = async (_url: string) => ({ text: async () => rss }) as any;

  await refreshNews(db, symbols, fetchMock as any);

  // One matching headline per feed URL => three inserts overall
  assert.equal(inserts.length, 3);
  const sample = inserts[0];
  assert.equal(sample.symbol, 'AAPL');
  assert.equal(sample.headline, 'Positive outlook for $AAPL after product launch');
  assert.equal(sample.url, 'https://example.com/aapl');
  assert.equal(typeof sample.score, 'number');
  assert.ok(sample.ts instanceof Date);
});
