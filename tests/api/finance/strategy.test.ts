import { test, expect } from '@playwright/test';
import Module from 'module';

// Stub out `server-only` to allow importing database helpers.
const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === 'server-only') return {};
  return originalLoad(request, parent, isMain);
};

test('creates and lists strategies', async () => {
  const queries = require('../../../lib/db/queries');
  queries.createStrategy = (async (args: any) => ({
    id: 's1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...args,
  })) as any;
  const { POST, GET } = require('../../../app/(chat)/api/finance/strategy/route');
  const postRes = await POST(
    new Request('https://example.com/api/finance/strategy', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'u1',
        chatId: 'c1',
        title: 'Test',
        universe: {},
        constraints: {},
      }),
    }),
  );
  const created = await postRes.json();
  expect(created.id).toBe('s1');

  queries.listStrategiesByChat = (async () => ({
    items: [created],
    nextCursor: null,
  })) as any;
  const listRes = await GET(
    new Request('https://example.com/api/finance/strategy?chatId=c1'),
  );
  const page = await listRes.json();
  expect(page.items.length).toBe(1);
});

test('fetches strategy by id', async () => {
  const queries = require('../../../lib/db/queries');
  queries.getStrategyById = (async () => ({
    id: 's1',
    userId: 'u1',
    chatId: 'c1',
    title: 'Test',
    universe: {},
    constraints: {},
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
  })) as any;
  const { GET } = require('../../../app/(chat)/api/finance/strategy/route');
  const getRes = await GET(
    new Request('https://example.com/api/finance/strategy?id=s1'),
  );
  const doc = await getRes.json();
  expect(doc.id).toBe('s1');
});

test('runs backtest and saves result', async () => {
  const queries = require('../../../lib/db/queries');
  const finance = require('../../../lib/finance/backtest');
  queries.saveBacktest = (async () => ({ id: 'b1' })) as any;
  finance.backtest = (() => ({
    equityCurve: [1, 2],
    metrics: {
      cagr: 0,
      sharpe: 0,
      sortino: 0,
      maxDrawdown: 0,
      hitRate: 0,
      profitFactor: 0,
    },
  })) as any;
  const { POST } = require('../../../app/(chat)/api/finance/strategy/route');
  const res = await POST(
    new Request('https://example.com/api/finance/strategy', {
      method: 'POST',
      body: JSON.stringify({
        action: 'backtest',
        versionId: 'v1',
        candles: [{ time: 0, open: 1, high: 1, low: 1, close: 1 }],
        signals: { 0: 'enter' },
      }),
    }),
  );
  const json = await res.json();
  expect(json.backtestId).toBe('b1');
  expect(json.equityCurve.length).toBe(2);
});

test('refines strategy version', async () => {
  const queries = require('../../../lib/db/queries');
  queries.getStrategyVersion = (async () => ({
    id: 'v1',
    strategyId: 's1',
  })) as any;
  queries.createStrategyVersion = (async (args: any) => ({
    id: 'v2',
    createdAt: new Date(),
    ...args,
  })) as any;
  const { PATCH } = require('../../../app/(chat)/api/finance/strategy/route');
  const res = await PATCH(
    new Request('https://example.com/api/finance/strategy', {
      method: 'PATCH',
      body: JSON.stringify({
        versionId: 'v1',
        rules: {},
        params: {},
      }),
    }),
  );
  const json = await res.json();
  expect(json.id).toBe('v2');
});

test('finalizes strategy', async () => {
  const queries = require('../../../lib/db/queries');
  queries.getStrategyVersion = (async () => ({
    id: 'v1',
    strategyId: 's1',
  })) as any;
  queries.updateStrategyStatus = (async () => ({
    id: 's1',
    status: 'validated',
  })) as any;
  const { POST } = require('../../../app/(chat)/api/finance/strategy/route');
  const res = await POST(
    new Request('https://example.com/api/finance/strategy', {
      method: 'POST',
      body: JSON.stringify({ action: 'finalize', versionId: 'v1' }),
    }),
  );
  const json = await res.json();
  expect(json.status).toBe('validated');
});
