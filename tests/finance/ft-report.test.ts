import { test, expect } from '@playwright/test';
import { ftReport } from '../../lib/finance/strategies';

test('ft report combines indicators, strategy and risk metrics', async () => {
  const candles = Array.from({ length: 30 }, (_, i) => {
    const close = i + 1; // simple upward trend
    return {
      time: i,
      open: close,
      high: close + 0.5,
      low: close - 0.5,
      close,
      volume: 1000,
    };
  });

  const mockFetch = async () => candles;

  const res = await ftReport('AAPL', '1d', mockFetch);
  expect(res.symbol).toBe('AAPL');
  expect(res.candles).toHaveLength(30);
  expect(res.indicators.sma.length).toBeGreaterThan(0);
  expect(res.indicators.rsi.length).toBeGreaterThan(0);
  expect(res.risk.maxDrawdown).toBeGreaterThanOrEqual(0);
  expect(res.strategy.performance.trades).toBe(0);
});
