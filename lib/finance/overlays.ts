import type { UTCTimestamp } from 'lightweight-charts';
import { sma, ema, rsi } from './indicators';

/**
 * Candle shape used for overlay calculations.
 */
export interface Candle {
  /** Unix epoch in milliseconds. */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export type OverlayKind = 'sma' | 'ema' | 'rsi';

/**
 * Compute overlay values for the provided candles.
 *
 * @param candles Array of OHLC candles with millisecond timestamps.
 * @param kind Overlay indicator to compute.
 * @param params Indicator-specific parameters. Currently only `period` is
 *               supported for all overlays.
 * @returns Array of objects compatible with lightweight-charts line series.
 */
export function computeOverlay(
  candles: Candle[],
  kind: OverlayKind,
  params: { period: number },
): { time: UTCTimestamp; value: number }[] {
  if (!candles.length) return [];
  const closes = candles.map((c) => c.close);
  const { period } = params;
  let values: number[] = [];
  switch (kind) {
    case 'sma':
      values = sma(closes, period);
      break;
    case 'ema':
      values = ema(closes, period);
      break;
    case 'rsi':
      values = rsi(closes, period);
      break;
    default:
      return [];
  }
  // Align computed values with candle times. Indicators like SMA shrink the
  // series by `period - 1` elements, so we drop the first timestamps.
  const offset = candles.length - values.length;
  return values.map((v, i) => ({
    time: (candles[i + offset].time / 1000) as UTCTimestamp,
    value: v,
  }));
}
