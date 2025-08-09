import { test, expect } from '@playwright/test';
import {
  annualizedVolatility,
  maxDrawdown,
  sharpeRatio,
  sortinoRatio,
  beta,
} from '../../lib/finance/risk';

// Sample returns and prices for deterministic checks
const returns = [0.01, -0.02, 0.03];
const benchmark = [0.005, -0.01, 0.015];
const prices = [100, 110, 90, 120, 80];

test('annualized volatility', () => {
  const vol = annualizedVolatility(returns, 252);
  expect(vol).toBeCloseTo(0.3995, 4);
});

test('max drawdown', () => {
  const dd = maxDrawdown(prices);
  expect(dd).toBeCloseTo(0.3333, 4);
});

test('sharpe ratio', () => {
  const s = sharpeRatio(returns, 0, 252);
  expect(s).toBeCloseTo(4.2053, 4);
});

test('sortino ratio', () => {
  const s = sortinoRatio(returns, 0, 252);
  expect(s).toBeCloseTo(5.2915, 4);
});

test('beta vs benchmark', () => {
  const b = beta(returns, benchmark);
  expect(b).toBeCloseTo(2, 5);
});
