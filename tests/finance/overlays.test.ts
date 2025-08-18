import test from 'node:test';
import assert from 'node:assert/strict';
import { computeOverlay, type Candle } from '../../lib/finance/overlays';

const sample: Candle[] = [
  { time: 1000, open: 1, high: 1, low: 1, close: 1 },
  { time: 2000, open: 2, high: 2, low: 2, close: 2 },
  { time: 3000, open: 3, high: 3, low: 3, close: 3 },
  { time: 4000, open: 4, high: 4, low: 4, close: 4 },
];

test('computeOverlay returns SMA line data', () => {
  const line = computeOverlay(sample, 'sma', { period: 2 });
  assert.equal(line.length, 3);
  assert.equal(line[0].value, 1.5);
});

test('computeOverlay returns EMA line data', () => {
  const line = computeOverlay(sample, 'ema', { period: 2 });
  assert.equal(line.length, 4 - 2 + 1);
  assert.ok(line[0].value > 1 && line[0].value < 2);
});

test('computeOverlay returns RSI line data', () => {
  const line = computeOverlay(sample, 'rsi', { period: 2 });
  assert.equal(line.length, 4 - 2);
  assert.ok(line[0].value >= 0 && line[0].value <= 100);
});
