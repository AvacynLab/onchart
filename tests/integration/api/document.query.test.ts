import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'module';

// Intercept module loading to stub database helpers and `server-only`.
test('filters by asset and kind with pagination', async () => {
  const originalLoad = (Module as any)._load;
  (Module as any)._load = function (request: string, parent: any, isMain: boolean) {
    if (request === 'server-only') return {};
    return originalLoad(request, parent, isMain);
  };
  const queriesPath = require.resolve('../../../lib/db/queries');
  const calls: any[] = [];
  require.cache[queriesPath] = {
    id: queriesPath,
    filename: queriesPath,
    loaded: true,
    exports: {
      queryDocuments: async (args: any) => {
        calls.push(args);
        return {
          items: [
            {
              id: '1',
              title: 'Doc',
              kind: args.kind,
              createdAt: new Date('2024-01-01T00:00:00Z'),
            },
          ],
          total: 1,
        };
      },
    },
  } as any;
  const { GET } = require('../../../app/(chat)/api/document/query/route');
  // Restore loader to avoid side effects for subsequent tests
  (Module as any)._load = originalLoad;
  const res = await GET(
    new Request(
      'https://example.com/api/document/query?asset=AAPL&kind=strategy&limit=5&offset=10',
    ),
  );
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.items.length, 1);
  assert.equal(json.total, 1);
  assert.deepEqual(calls[0], {
    asset: 'AAPL',
    timeframe: undefined,
    kind: 'strategy',
    limit: 5,
    offset: 10,
  });
});
