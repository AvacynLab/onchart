import { test, expect } from '@playwright/test';
import { maCrossover, rsiReversion, breakoutBB } from '../../lib/finance/strategies';

// Sample deterministic price series
const pricesMa = [5, 4, 3, 4, 5, 6, 5, 4, 3];
const pricesRsi = [10, 11, 12, 11, 10, 9, 8, 9, 10, 11, 12];
const pricesBb = [1, 1, 1, 1, 1, 10, 1, 1, 1, 1, 1];

test('ma crossover', () => {
  const res = maCrossover(pricesMa, 2, 3);
  expect(res.signals).toEqual([
    { index: 4, type: 'enter' },
    { index: 7, type: 'exit' },
  ]);
  expect(res.performance).toEqual({ trades: 1, pnl: -1 });
});

test('rsi reversion', () => {
  const res = rsiReversion(pricesRsi, 2, 30, 70);
  expect(res.signals).toEqual([
    { index: 4, type: 'enter' },
    { index: 8, type: 'exit' },
  ]);
  expect(res.performance).toEqual({ trades: 1, pnl: 0 });
});

test('bollinger breakout', () => {
  const res = breakoutBB(pricesBb, 5, 2);
  expect(res.signals).toEqual([
    { index: 5, type: 'enter' },
    { index: 6, type: 'exit' },
  ]);
  expect(res.performance).toEqual({ trades: 1, pnl: -9 });
});

