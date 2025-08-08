import { tool } from 'ai';
import { z } from 'zod';
import { getFundamentals, getSentiment24h, getCandles } from '@/lib/db/queries';

/**
 * Tool that compiles a quick analysis of a financial asset by combining
 * fundamentals, recent sentiment and a simple technical indicator.
 *
 * The technical section compares the latest closing price to the 20‑period EMA
 * of daily candles to determine if the asset trades above or below trend.
 */
export const analyseAsset = tool({
  description:
    'Summarise fundamentals, 24h sentiment and 20-period EMA trend for a symbol.',
  inputSchema: z.object({ symbol: z.string().min(1) }),
  execute: async ({ symbol }) => {
    const [fundamentals, sentiment, candles] = await Promise.all([
      getFundamentals(symbol),
      getSentiment24h(symbol),
      getCandles({ symbol, interval: '1d', limit: 20 }),
    ]);

    const closes = candles.map((c) => c.close);
    const ema = closes.length > 0 ? computeEMA(closes, 20) : [];
    const lastClose = closes.at(-1) ?? null;
    const ema20 = ema.at(-1) ?? null;
    const trend =
      lastClose !== null && ema20 !== null
        ? lastClose > ema20
          ? 'above'
          : 'below'
        : 'unknown';

    return {
      fundamentals,
      sentiment,
      technical: {
        lastClose,
        ema20,
        trend,
      },
    };
  },
});

/**
 * Compute the Exponential Moving Average for a list of numbers.
 *
 * @param values - Price series to smooth.
 * @param period - Window length for the EMA.
 */
function computeEMA(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = [];
  values.forEach((v, i) => {
    if (i === 0) {
      ema.push(v);
    } else {
      ema.push(v * k + ema[i - 1] * (1 - k));
    }
  });
  return ema;
}
