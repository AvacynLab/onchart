import { test, expect } from '@playwright/test';
import Module from 'module';

// Stub the `server-only` module so database helpers can be imported in tests.
const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === 'server-only') return {};
  return originalLoad(request, parent, isMain);
};

test('saves and lists attention markers', async () => {
  // Use require after stubbing to bypass ESM restrictions in tests
  const queries = require('../../../lib/db/queries');
  let saved: any = null;
  queries.saveAttentionMarker = (async (args: any) => {
    saved = args;
    return '1';
  }) as any;
  queries.listAttentionMarkers = (async () => [
    { id: '1', chatId: 'c1', symbol: 'AAPL', timeframe: '1D', payload: { note: 'n' } },
  ]) as any;

  const { POST, GET } = require('../../../app/(chat)/api/finance/attention/route');
  const postReq = new Request('https://example.com/api/finance/attention', {
    method: 'POST',
    body: JSON.stringify({
      userId: 'u1',
      chatId: 'c1',
      symbol: 'AAPL',
      timeframe: '1D',
      payload: { note: 'n' },
    }),
  });
  const postRes = await POST(postReq);
  expect(postRes.status).toBe(200);
  const { id } = await postRes.json();
  expect(id).toBe('1');
  expect(saved.symbol).toBe('AAPL');
  const getRes = await GET(
    new Request(
      'https://example.com/api/finance/attention?chatId=c1&symbol=AAPL&timeframe=1D',
    ),
  );
  const list = await getRes.json();
  expect(Array.isArray(list)).toBe(true);
  expect(list[0]).toMatchObject({ symbol: 'AAPL', timeframe: '1D' });
});

test('deletes an attention marker', async () => {
  const queries = require('../../../lib/db/queries');
  let deleted = '';
  queries.deleteAttentionMarker = (async ({ id }: any) => {
    deleted = id;
  }) as any;
  const { DELETE } = require('../../../app/(chat)/api/finance/attention/route');
  const res = await DELETE(
    new Request('https://example.com/api/finance/attention?id=1', {
      method: 'DELETE',
    }),
  );
  expect(res.status).toBe(200);
  expect(deleted).toBe('1');
});
