import { test, expect } from '@playwright/test';
import {
  sma,
  ema,
  rsi,
  macd,
  bollinger,
  atr,
  stochastic,
} from '../../lib/finance/indicators';

const prices = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

test('sma and ema', () => {
  const s = sma(prices, 5);
  const e = ema(prices, 5);
  expect(s.at(-1)).toBeCloseTo(8, 5);
  expect(e.at(-1)).toBeCloseTo(8, 5);
});

test('rsi extremes', () => {
  const up = rsi([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], 14);
  const down = rsi([15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1], 14);
  expect(up.at(-1)).toBeCloseTo(100, 5);
  expect(down.at(-1)).toBeCloseTo(0, 5);
});

test('macd structure', () => {
  const m = macd(Array.from({ length: 60 }, (_, i) => i + 1));
  expect(m.macd.length).toBe(m.signal.length);
  expect(m.histogram.length).toBe(m.signal.length);
});

test('bollinger bands', () => {
  const b = bollinger(Array.from({ length: 20 }, (_, i) => i + 1), 5, 2);
  expect(b.middle.at(-1)).toBeCloseTo(18, 5);
  expect(b.upper.at(-1)).toBeCloseTo(20.8284, 3);
  expect(b.lower.at(-1)).toBeCloseTo(15.1716, 3);
});

test('atr constant series', () => {
  const arr = Array(20).fill(10);
  const a = atr(arr, arr, arr, 14);
  expect(a.at(-1)).toBeCloseTo(0, 5);
});

test('stochastic oscillator', () => {
  const highs = [1, 2, 3, 4, 5, 6, 7];
  const lows = [0, 1, 2, 3, 4, 5, 6];
  const closes = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5];
  const s = stochastic(highs, lows, closes, 5, 3);
  expect(s.k.at(-1)).toBeCloseTo(90, 5);
  expect(s.d.at(-1)).toBeCloseTo(90, 5);
});
