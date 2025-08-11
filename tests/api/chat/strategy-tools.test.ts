import Module from 'module';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Stub `server-only` to allow importing server modules in the test environment.
const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === 'server-only') return {};
  return originalLoad(request, parent, isMain);
};

// Verify that the chat route exposes working strategy tools via the prefixed map.
// We stub the database and data-fetching dependencies so the tools can run
// without hitting external services.
test('chat route exposes functional strategy tools', async () => {
  const { createFinanceTools } = await import('../../../lib/ai/tools-finance');
  const { buildFinanceToolMap } = await import('../../../app/(chat)/api/chat/route');

  // Minimal in-memory implementations used by the strategy helpers.
  const deps = {
    createStrategy: async (args: any) => ({ id: 's1', ...args }),
    createStrategyVersion: async (args: any) => ({ id: 'v1', strategyId: 's1', ...args }),
    getStrategyVersion: async () => ({ id: 'v1', strategyId: 's1', rules: [] }),
    saveBacktest: async (args: any) => ({ id: 'b1', ...args }),
    updateStrategyStatus: async ({ id, status }: any) => ({ id, status }),
    fetchOHLC: async () => [
      { time: 0, open: 1, high: 1, low: 1, close: 1 },
      { time: 1, open: 1, high: 1, low: 1, close: 2 },
    ],
    persist: async () => {},
  };

  const ft = createFinanceTools({ userId: 'u1', chatId: 'c1', locale: 'en' }, deps);
  const map = buildFinanceToolMap(ft);

  // Ensure each strategy tool is callable through the prefixed names.
  const questions = await (map['strategy.start_wizard'] as any)({});
  assert.ok(Array.isArray(questions));

  const proposal = await (map['strategy.propose'] as any)({ title: 'T', answers: {} });
  assert.equal(proposal.strategy.id, 's1');

  const backtest = await (map['strategy.backtest'] as any)({
    versionId: proposal.version.id,
    symbols: ['AAPL'],
    timeframe: '1d',
    range: '2d',
  });
  assert.ok(backtest.metrics.cagr !== undefined);

  const refined = await (map['strategy.refine'] as any)({
    versionId: proposal.version.id,
    params: {},
  });
  assert.equal(refined.id, 'v1');

  const finalized = await (map['strategy.finalize'] as any)({
    versionId: refined.id,
  });
  assert.equal(finalized.status, 'validated');
});
