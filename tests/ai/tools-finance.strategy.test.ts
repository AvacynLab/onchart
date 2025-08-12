import { test, expect } from '@playwright/test';
import { createFinanceTools } from '../../lib/ai/tools-finance';

// unit test verifying full lifecycle of strategy tools

// Ensure the full lifecycle of strategy tools works and persists analysis logs.
test('strategy tool lifecycle and localization', async () => {
  const strategies: any[] = [];
  const versions: any[] = [];
  const backtests: any[] = [];
  const persisted: any[] = [];
  const deps = {
    createStrategy: async (args: any) => {
      const row = { id: 's1', ...args, createdAt: new Date(), updatedAt: new Date() };
      strategies.push(row);
      return row;
    },
    createStrategyVersion: async (args: any) => {
      const row = { id: `v${versions.length + 1}`, createdAt: new Date(), ...args };
      versions.push(row);
      return row;
    },
    getStrategyVersion: async ({ id }: any) => versions.find((v) => v.id === id),
    saveBacktest: async (args: any) => {
      backtests.push(args);
      return { id: 'b1', ...args };
    },
    updateStrategyStatus: async ({ id, status }: any) => ({ id, status }),
    fetchOHLC: async () => [
      { time: 0, open: 1, high: 1, low: 1, close: 1 },
      { time: 1, open: 1, high: 1, low: 1, close: 2 },
      { time: 2, open: 2, high: 2, low: 2, close: 1 },
    ],
    persist: async (record: any) => {
      persisted.push(record);
    },
  };

  const tools = createFinanceTools({ userId: 'u1', chatId: 'c1', locale: 'en' }, deps);

  // Ensure questions adapt to locale
  const questionsEn = await tools.strategy.start_wizard.execute({});
  expect(questionsEn[0].question).toMatch(/investment horizon/i);
  const frTools = createFinanceTools(
    { userId: 'u1', chatId: 'c1', locale: 'fr' },
    { ...deps, persist: async () => {} },
  );
  const questionsFr = await frTools.strategy.start_wizard.execute({});
  expect(questionsFr[0].question).toMatch(/horizon de placement/i);

  const proposal = await tools.strategy.propose.execute({ title: 'Test', answers: {} });
  expect(proposal.strategy.id).toBe('s1');
  expect(proposal.version.strategyId).toBe('s1');

  const bt = await tools.strategy.backtest.execute({
    versionId: proposal.version.id,
    symbols: ['AAPL'],
    timeframe: '1d',
    range: '5d',
  });
  expect(bt.metrics.cagr).not.toBeUndefined();
  expect(backtests.length).toBe(1);

  const refined = await tools.strategy.refine.execute({
    versionId: proposal.version.id,
    feedback: 'better',
  });
  expect(versions.length).toBe(2);
  expect(refined.notes).toBe('better');

  const finalized = await tools.strategy.finalize.execute({ versionId: refined.id });
  expect(finalized.status).toBe('validated');

  expect(persisted.map((r) => r.type)).toEqual([
    'strategy_start_wizard',
    'strategy_propose',
    'strategy_backtest',
    'strategy_refine',
    'strategy_finalize',
  ]);
});
