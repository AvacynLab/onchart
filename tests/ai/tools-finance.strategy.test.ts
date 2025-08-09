import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFinanceTools } from '../../lib/ai/tools-finance';

// unit test verifying full lifecycle of strategy tools

test('strategy tool lifecycle', async () => {
  const strategies: any[] = [];
  const versions: any[] = [];
  const backtests: any[] = [];
  const tools = createFinanceTools(
    { userId: 'u1', chatId: 'c1' },
    {
      createStrategy: async (args) => {
        const row = { id: 's1', ...args, createdAt: new Date(), updatedAt: new Date() };
        strategies.push(row);
        return row;
      },
      createStrategyVersion: async (args) => {
        const row = { id: `v${versions.length + 1}`, createdAt: new Date(), ...args };
        versions.push(row);
        return row;
      },
      getStrategyVersion: async ({ id }) => versions.find((v) => v.id === id),
      saveBacktest: async (args) => {
        backtests.push(args);
        return { id: 'b1', ...args };
      },
      updateStrategyStatus: async ({ id, status }) => ({ id, status }),
      fetchOHLC: async () => [
        { time: 0, open: 1, high: 1, low: 1, close: 1 },
        { time: 1, open: 1, high: 1, low: 1, close: 2 },
        { time: 2, open: 2, high: 2, low: 2, close: 1 },
      ],
    },
  );

  const questions = await tools.strategy.start_wizard.execute({});
  assert.ok(Array.isArray(questions) && questions.length > 0);

  const proposal = await tools.strategy.propose.execute({ title: 'Test', answers: {} });
  assert.equal(proposal.strategy.id, 's1');
  assert.equal(proposal.version.strategyId, 's1');

  const bt = await tools.strategy.backtest.execute({
    versionId: proposal.version.id,
    symbols: ['AAPL'],
    timeframe: '1d',
    range: '5d',
  });
  assert.ok(bt.metrics.cagr !== undefined);
  assert.equal(backtests.length, 1);

  const refined = await tools.strategy.refine.execute({ versionId: proposal.version.id, feedback: 'better' });
  assert.equal(versions.length, 2);
  assert.equal(refined.notes, 'better');

  const finalized = await tools.strategy.finalize.execute({ versionId: refined.id });
  assert.equal(finalized.status, 'validated');
});
