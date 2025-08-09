import { z } from 'zod';

/**
 * Technical indicator utilities.
 *
 * All functions validate inputs with zod and return arrays of numbers.
 * The length of the returned array is `input.length - period + 1` unless
 * specified otherwise.
 */

const PricesSchema = z.array(z.number());

/**
 * Simple Moving Average.
 * @param prices sequence of prices
 * @param period window size
 * @returns array of SMA values
 */
export function sma(prices: number[], period: number): number[] {
  const { prices: p, period: n } = z
    .object({ prices: PricesSchema, period: z.number().int().positive() })
    .parse({ prices, period });
  if (p.length < n) return [];
  const result: number[] = [];
  for (let i = 0; i <= p.length - n; i++) {
    const window = p.slice(i, i + n);
    const avg = window.reduce((a, b) => a + b, 0) / n;
    result.push(avg);
  }
  return result;
}

/**
 * Exponential Moving Average (Wilder's smoothing).
 */
export function ema(prices: number[], period: number): number[] {
  const { prices: p, period: n } = z
    .object({ prices: PricesSchema, period: z.number().int().positive() })
    .parse({ prices, period });
  if (p.length < n) return [];
  const k = 2 / (n + 1);
  const result: number[] = [];
  // seed with SMA of first period
  let prev = sma(p.slice(0, n), n)[0];
  result.push(prev);
  for (let i = n; i < p.length; i++) {
    const value = k * (p[i] - prev) + prev;
    result.push(value);
    prev = value;
  }
  return result;
}

/**
 * Relative Strength Index.
 * Returns array starting after `period` observations.
 */
export function rsi(prices: number[], period: number): number[] {
  const { prices: p, period: n } = z
    .object({ prices: PricesSchema, period: z.number().int().positive() })
    .parse({ prices, period });
  if (p.length <= n) return [];
  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < p.length; i++) {
    const diff = p[i] - p[i - 1];
    gains.push(Math.max(diff, 0));
    losses.push(Math.max(-diff, 0));
  }
  let avgGain = sma(gains.slice(0, n), n)[0];
  let avgLoss = sma(losses.slice(0, n), n)[0];
  const result: number[] = [];
  result.push(100 - 100 / (1 + avgGain / avgLoss));
  for (let i = n; i < gains.length; i++) {
    avgGain = (avgGain * (n - 1) + gains[i]) / n;
    avgLoss = (avgLoss * (n - 1) + losses[i]) / n;
    const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
    result.push(100 - 100 / (1 + rs));
  }
  return result;
}

/**
 * Moving Average Convergence Divergence.
 * @returns object containing macd, signal and histogram arrays.
 */
export function macd(
  prices: number[],
  short = 12,
  long = 26,
  signalPeriod = 9,
): { macd: number[]; signal: number[]; histogram: number[] } {
  const { prices: p } = z.object({ prices: PricesSchema }).parse({ prices });
  if (p.length < long) return { macd: [], signal: [], histogram: [] };
  const emaShort = ema(p, short);
  const emaLong = ema(p, long);
  const macdLine: number[] = [];
  const offset = long - short;
  for (let i = 0; i < emaLong.length; i++) {
    macdLine.push(emaShort[i + offset] - emaLong[i]);
  }
  const signalLine = ema(macdLine, signalPeriod);
  const histogram: number[] = [];
  const histOffset = macdLine.length - signalLine.length;
  for (let i = 0; i < signalLine.length; i++) {
    histogram.push(macdLine[i + histOffset] - signalLine[i]);
  }
  return { macd: macdLine.slice(histOffset), signal: signalLine, histogram };
}

/**
 * Bollinger Bands.
 */
export function bollinger(
  prices: number[],
  period: number,
  multiplier = 2,
): { middle: number[]; upper: number[]; lower: number[] } {
  const { prices: p, period: n } = z
    .object({ prices: PricesSchema, period: z.number().int().positive() })
    .parse({ prices, period });
  if (p.length < n) return { middle: [], upper: [], lower: [] };
  const middle = sma(p, n);
  const upper: number[] = [];
  const lower: number[] = [];
  for (let i = 0; i <= p.length - n; i++) {
    const window = p.slice(i, i + n);
    const avg = middle[i];
    const variance =
      window.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / n;
    const std = Math.sqrt(variance);
    upper.push(avg + multiplier * std);
    lower.push(avg - multiplier * std);
  }
  return { middle, upper, lower };
}

/**
 * Average True Range using Wilder's smoothing.
 */
export function atr(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number,
): number[] {
  const schema = z.object({
    highs: PricesSchema,
    lows: PricesSchema,
    closes: PricesSchema,
    period: z.number().int().positive(),
  });
  const { highs: h, lows: l, closes: c, period: n } = schema.parse({
    highs,
    lows,
    closes,
    period,
  });
  if (h.length !== l.length || h.length !== c.length || h.length <= n) return [];
  const trs: number[] = [];
  for (let i = 1; i < h.length; i++) {
    const high = h[i];
    const low = l[i];
    const prevClose = c[i - 1];
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trs.push(tr);
  }
  const result: number[] = [];
  let prevAtr = sma(trs.slice(0, n), n)[0];
  result.push(prevAtr);
  for (let i = n; i < trs.length; i++) {
    prevAtr = (prevAtr * (n - 1) + trs[i]) / n;
    result.push(prevAtr);
  }
  return result;
}

/**
 * Stochastic oscillator.
 * @returns object with %K and %D arrays.
 */
export function stochastic(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number,
  dPeriod = 3,
): { k: number[]; d: number[] } {
  const schema = z.object({
    highs: PricesSchema,
    lows: PricesSchema,
    closes: PricesSchema,
    period: z.number().int().positive(),
    dPeriod: z.number().int().positive(),
  });
  const { highs: h, lows: l, closes: c, period: n, dPeriod: dP } = schema.parse({
    highs,
    lows,
    closes,
    period,
    dPeriod,
  });
  if (h.length !== l.length || h.length !== c.length || h.length < n) return { k: [], d: [] };
  const k: number[] = [];
  for (let i = 0; i <= h.length - n; i++) {
    const highSlice = h.slice(i, i + n);
    const lowSlice = l.slice(i, i + n);
    const close = c[i + n - 1];
    const highest = Math.max(...highSlice);
    const lowest = Math.min(...lowSlice);
    const value = ((close - lowest) / (highest - lowest)) * 100;
    k.push(value);
  }
  const d = sma(k, dP);
  return { k, d };
}

export default {
  sma,
  ema,
  rsi,
  macd,
  bollinger,
  atr,
  stochastic,
};
