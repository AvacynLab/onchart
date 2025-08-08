import { tool } from 'ai';
import { z } from 'zod';

/**
 * Tool returning a REST endpoint and chart specification for a given asset.
 *
 * The agent can call this tool to retrieve the URL to fetch candle data and a
 * lightweight chart configuration that the client can render directly.
 */
export const getChart = tool({
  description:
    'Return the candle data URL and a basic chart configuration for the given symbol and interval.',
  // Validate required parameters with zod to ensure correct usage by the model
  inputSchema: z.object({
    symbol: z.string().min(1),
    interval: z.string().min(1),
    /**
     * Optional list of technical studies to overlay on the chart. Supports
     * identifiers like `ema20` or `rsi14` which `ChartWidget` knows how to
     * compute client-side.
     */
    studies: z.array(z.string()).optional(),
  }),
  // Build the URL and chart spec synchronously; no external calls required
  execute: async ({ symbol, interval, studies }) => {
    const url = `/api/market/${symbol}/candles/${interval}`;
    return {
      url,
      spec: {
        type: 'candlestick',
        symbol,
        interval,
        ...(studies ? { studies } : {}),
      },
    };
  },
});
