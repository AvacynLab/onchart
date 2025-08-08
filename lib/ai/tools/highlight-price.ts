import { tool } from 'ai';
import { z } from 'zod';
import { broadcastAIEvent } from '../event-engine';

/**
 * Tool that instructs the client to highlight a price level on a chart.
 *
 * The tool broadcasts an event over the `ai-events` channel which is consumed by
 * the front-end to draw an annotation.
 */
export const highlightPrice = tool({
  description:
    'Broadcast an event so the UI can highlight a price level on the chart.',
  // Parameters ensure the agent provides a symbol and price to annotate.
  inputSchema: z.object({
    symbol: z.string().min(1),
    price: z.number(),
    label: z.string().optional(),
  }),
  execute: async ({ symbol, price, label }) => {
    await broadcastAIEvent({
      type: 'highlight-price',
      symbol,
      price,
      label,
      message: label ?? `Highlight ${symbol} at $${price.toFixed(2)}`,
      level: 'info',
      ts: Date.now(),
    });
    return { status: 'ok' };
  },
});

