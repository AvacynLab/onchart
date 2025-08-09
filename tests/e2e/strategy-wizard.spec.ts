import { test, expect } from '@playwright/test';
import { createFinanceTools } from '../../lib/ai/tools-finance';

// End-to-end style test exercising the strategy tools namespace
// through a full lifecycle: wizard -> proposal -> backtest ->
// refinement -> final validation. Uses in-memory mocks for
// persistence so we can run without a real database.
test('full strategy lifecycle', async () => {
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
        return { id: `b${backtests.length}`, ...args };
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
  expect(Array.isArray(questions)).toBeTruthy();
  expect(questions.length).toBeGreaterThan(0);

  const proposal = await tools.strategy.propose.execute({ title: 'T', answers: {} });
  expect(proposal.strategy.id).toBe('s1');
  expect(proposal.version.strategyId).toBe('s1');

  const bt = await tools.strategy.backtest.execute({
    versionId: proposal.version.id,
    symbols: ['AAPL'],
    timeframe: '1d',
    range: '5d',
  });
  expect(bt.metrics.cagr).not.toBeUndefined();
  expect(backtests).toHaveLength(1);

  const refined = await tools.strategy.refine.execute({
    versionId: proposal.version.id,
    feedback: 'better',
  });
  expect(versions).toHaveLength(2);
  expect(refined.notes).toBe('better');

  const finalized = await tools.strategy.finalize.execute({ versionId: refined.id });
  expect(finalized.status).toBe('validated');
});

