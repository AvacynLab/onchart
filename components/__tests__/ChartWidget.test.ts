import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyStudies, computeEMA } from '../ChartWidget';
import type { Candle } from '@/hooks/useMarketSocket';

test('applyStudies overlays EMA and RSI', () => {
  const candles: Candle[] = Array.from({ length: 20 }, (_, i) => ({
    time: i + 1,
    open: 0,
    high: 0,
    low: 0,
    close: i + 1,
    volume: 0,
  }));

  const seriesCalls: Array<{ opts: any; data: any[] }> = [];
  const chart = {
    addLineSeries: (opts: any) => {
      const call = { opts, data: [] as any[] };
      seriesCalls.push(call);
      return {
        setData: (data: any[]) => {
          call.data = data;
        },
      };
    },
  } as any;

  applyStudies(chart, candles, ['ema20', 'rsi14']);

  assert.equal(seriesCalls.length, 2);
  const closes = candles.map((c) => c.close);
  const ema = computeEMA(closes, 20);
  assert.equal(seriesCalls[0].data.at(-1).value, ema.at(-1));
  // With monotonically increasing prices, RSI should end near 100
  assert(seriesCalls[1].data.at(-1).value > 99);
});
