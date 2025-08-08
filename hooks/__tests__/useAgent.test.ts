import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createAgentHelpers } from '../useAgent';

const originalFetch = global.fetch;

test('getChart builds candle URL and spec', () => {
  const { getChart } = createAgentHelpers();
  const result = getChart('AAPL', '1h');
  assert.deepEqual(result, {
    url: '/api/market/AAPL/candles/1h',
    spec: { type: 'candlestick', symbol: 'AAPL', interval: '1h' },
  });
});

test('highlightPrice posts to API endpoint', async () => {
  const fetchMock = mock.fn(async () => new Response('{}'));
  global.fetch = fetchMock as any;
  const { highlightPrice } = createAgentHelpers();
  await highlightPrice('TSLA', 123.45, 'test');
  assert.equal(fetchMock.mock.calls.length, 1);
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, '/api/ai/highlight-price');
  assert.equal(options.method, 'POST');
  assert.deepEqual(JSON.parse(options.body), {
    symbol: 'TSLA',
    price: 123.45,
    label: 'test',
  });
  global.fetch = originalFetch;
});

test('analyseAsset fetches analysis', async () => {
  const sample = { foo: 'bar' };
  const fetchMock = mock.fn(async () =>
    new Response(JSON.stringify(sample), { status: 200 }),
  );
  global.fetch = fetchMock as any;
  const { analyseAsset } = createAgentHelpers();
  const result = await analyseAsset('AAPL');
  assert.deepEqual(result, sample);
  assert.equal(
    fetchMock.mock.calls[0].arguments[0],
    '/api/ai/analyse-asset?symbol=AAPL',
  );
  global.fetch = originalFetch;
});

test('scanOpportunities fetches with limit', async () => {
  const sample = [{ symbol: 'MSFT', score: 1 }];
  const fetchMock = mock.fn(async () =>
    new Response(JSON.stringify(sample), { status: 200 }),
  );
  global.fetch = fetchMock as any;
  const { scanOpportunities } = createAgentHelpers();
  const result = await scanOpportunities(3);
  assert.deepEqual(result, sample);
  assert.equal(
    fetchMock.mock.calls[0].arguments[0],
    '/api/ai/scan-opportunities?limit=3',
  );
  global.fetch = originalFetch;
});
