import { tool } from 'ai';
import { z } from 'zod';
import {
  getFundamentals,
  getCandles,
  saveDocument,
} from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';

/**
 * Tool that compiles fundamental and technical analysis for a symbol and
 * suggests a basic strategy along with a chart configuration.
 *
 * Technical metrics include a 20-period EMA and 14-period RSI computed from
 * daily candles. A naive strategy is produced from these indicators.
 */
export const analyseFaTa = tool({
  description:
    'Combine fundamentals with EMA20 and RSI14 to outline a strategy and chart.',
  inputSchema: z.object({
    symbol: z.string().min(1),
    emitArtifact: z.literal('research-fa-ta').optional(),
  }),
  execute: async ({ symbol, emitArtifact }, { session }) => {
    const [fundamentals, candles] = await Promise.all([
      getFundamentals(symbol),
      getCandles({ symbol, interval: '1d', limit: 20 }),
    ]);

    const closes = candles.map((c) => c.close);
    const ema = computeEMA(closes, 20);
    const rsi = computeRSI(closes, 14);
    const lastClose = closes.at(-1) ?? null;
    const ema20 = ema.at(-1) ?? null;
    const rsi14 = rsi.at(-1) ?? null;
    const strategy =
      lastClose !== null && ema20 !== null && rsi14 !== null
        ? lastClose > ema20 && rsi14 < 70
          ? 'buy'
          : 'wait'
        : 'undetermined';

    const chart = { symbol, interval: '1d', studies: ['ema', 'rsi'] as const };

    const result = { fundamentals, technical: { lastClose, ema20, rsi14 }, chart, strategy };

    if (emitArtifact === 'research-fa-ta' && session?.user?.id) {
      const id = generateUUID();
      await saveDocument({
        id,
        title: `${symbol} FA/TA research`,
        kind: 'research-fa-ta',
        content: JSON.stringify(result),
        userId: session.user.id,
      });
      return { ...result, documentId: id };
    }

    return result;
  },
});

/**
 * Compute the Exponential Moving Average for a list of numbers.
 */
function computeEMA(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const ema: number[] = [];
  values.forEach((v, i) => {
    if (i === 0) ema.push(v);
    else ema.push(v * k + ema[i - 1] * (1 - k));
  });
  return ema;
}

/**
 * Compute the Relative Strength Index over the given period.
 */
function computeRSI(values: number[], period: number): number[] {
  if (values.length < period + 1) return [];
  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) {
      gains.push(diff);
      losses.push(0);
    } else {
      gains.push(0);
      losses.push(-diff);
    }
  }
  const avgGain = computeEMA(gains, period);
  const avgLoss = computeEMA(losses, period);
  const rsi: number[] = [];
  for (let i = period - 1; i < avgGain.length; i++) {
    const rs = avgLoss[i] === 0 ? 100 : avgGain[i] / avgLoss[i];
    rsi.push(100 - 100 / (1 + rs));
  }
  return rsi;
}
