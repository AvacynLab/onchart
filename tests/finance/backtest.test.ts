import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backtest } from '../../lib/finance/backtest';

test('computes equity curve and metrics for simple trades', () => {
  const candles = [
    { time: 0, open: 100, high: 100, low: 100, close: 100 },
    { time: 1, open: 110, high: 110, low: 110, close: 110 },
    { time: 2, open: 105, high: 105, low: 105, close: 105 },
    { time: 3, open: 120, high: 120, low: 120, close: 120 },
    { time: 4, open: 115, high: 115, low: 115, close: 115 },
  ];
  const signals = { 0: 'enter', 2: 'exit', 3: 'enter', 4: 'exit' };
  const { equityCurve, metrics } = backtest({ candles, signals });

  // final equity after two trades (one win, one loss)
  const finalEquity = equityCurve[equityCurve.length - 1];
  assert.ok(Math.abs(finalEquity - 1.00625) < 1e-6);
  // max drawdown around 8.5%
  assert.ok(Math.abs(metrics.maxDrawdown - 0.085227) < 1e-3);
  // CAGR annualises the 0.62% return over the 5-bar window
  assert.ok(Math.abs(metrics.cagr - 0.575906) < 1e-3);
  // Sharpe ratio normalises mean return by standard deviation
  assert.ok(Math.abs(metrics.sharpe - 0.937744) < 1e-3);
  // Sortino uses downside deviation, large because only one loss occurred
  assert.ok(Math.abs(metrics.sortino - 25.98276) < 1e-3);
  // exactly half of the trades were profitable
  assert.equal(metrics.hitRate, 0.5);
  // profit factor slightly above 1 (wins outweigh losses)
  assert.ok(Math.abs(metrics.profitFactor - 1.142857) < 1e-3);
});

test('handles empty candle series without crashing', () => {
  const { metrics } = backtest({ candles: [], signals: {} });
  assert.equal(metrics.maxDrawdown, 0);
});
