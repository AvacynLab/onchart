import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateTicks, Tick } from '../market-worker';

// Ensure ticks aggregate into a correct OHLCV candle
// for a one-minute interval (60,000 ms).
test('aggregateTicks converts ticks to candle', () => {
  const start = 1_699_999_980_000; // interval start in ms
  const ticks: Tick[] = [
    { ts: start + 1_000, price: 10, volume: 1 },
    { ts: start + 20_000, price: 15, volume: 2 },
    { ts: start + 59_000, price: 12, volume: 1 },
  ];

  const candle = aggregateTicks(ticks, 60_000);
  assert.deepEqual(candle, {
    open: 10,
    high: 15,
    low: 10,
    close: 12,
    volume: 4,
    ts_start: start,
    ts_end: start + 60_000,
  });
});
