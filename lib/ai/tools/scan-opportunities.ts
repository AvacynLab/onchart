import { tool } from 'ai';
import { z } from 'zod';
import {
  getTopSentimentSymbols,
  getCandles,
  saveDocument,
} from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';

/**
 * Tool that scans for trading opportunities based on news sentiment and
 * a simple moving average breakout strategy.
 *
 * The tool fetches symbols with the highest average sentiment over the last
 * 24 hours and checks whether the latest price closed above the 20‑period EMA.
 * Symbols meeting both criteria are returned to the caller.
 */
export const scanOpportunities = tool({
  description:
    'Find symbols with strong news sentiment and a price breakout above the 20-period EMA.',
  inputSchema: z.object({
    limit: z.number().min(1).max(20).default(5),
    emitArtifact: z.literal('research-opportunity').optional(),
  }),
  execute: async ({ limit, emitArtifact }, { session } = {}) => {
    const sentiments = await getTopSentimentSymbols(limit);
    const opportunities: Array<{ symbol: string; score: number }> = [];

    for (const { symbol, score } of sentiments) {
      // Fetch the latest 21 candles to compute a 20-period EMA.
      const candles = await getCandles({ symbol, interval: '1h', limit: 21 });
      if (candles.length < 21) continue;
      const closes = candles.map((c) => c.close);
      const ema = computeEMA(closes, 20);
      const last = closes[closes.length - 1];
      const prev = closes[closes.length - 2];
      const lastEma = ema[ema.length - 1];
      const prevEma = ema[ema.length - 2];

      // Breakout occurs when price crosses from below to above the EMA.
      if (prev <= prevEma && last > lastEma) {
        opportunities.push({ symbol, score });
      }
    }

    if (emitArtifact === 'research-opportunity' && session?.user?.id) {
      const id = generateUUID();
      await saveDocument({
        id,
        title: 'opportunity scan',
        kind: 'research-opportunity',
        content: JSON.stringify(opportunities),
        userId: session.user.id,
      });
      return { opportunities, documentId: id };
    }

    return opportunities;
  },
});

/**
 * Compute the Exponential Moving Average for a sequence of values.
 *
 * @param values - Array of numeric samples.
 * @param period - Number of samples for the EMA window.
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
