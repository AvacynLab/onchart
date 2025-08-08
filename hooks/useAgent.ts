'use client';

/**
 * Lightweight helpers allowing UI components to invoke server-side AI tools.
 *
 * The returned functions call dedicated API routes which in turn execute the
 * underlying tool implementations. This keeps heavy database logic on the
 * server while exposing a simple client interface.
 */
export interface AgentHelpers {
  /** Build the candle API URL and chart specification for a symbol/interval. */
  getChart: (symbol: string, interval: string) => {
    url: string;
    spec: { type: string; symbol: string; interval: string };
  };
  /** Request an annotation on the chart at the provided price level. */
  highlightPrice: (symbol: string, price: number, label?: string) => Promise<void>;
  /** Run the asset analysis tool for the given symbol. */
  analyseAsset: (symbol: string) => Promise<any>;
  /** Scan the market for high-sentiment breakout opportunities. */
  scanOpportunities: (limit?: number) => Promise<any>;
}

/**
 * Create a set of helper functions for invoking AI tools.
 *
 * This is implemented as a simple factory so it can be consumed either directly
 * or through React. No React hooks are used internally to keep testing trivial.
 */
export function createAgentHelpers(): AgentHelpers {
  return {
    getChart: (symbol: string, interval: string) => ({
      url: `/api/market/${symbol}/candles/${interval}`,
      spec: { type: 'candlestick', symbol, interval },
    }),
    highlightPrice: async (symbol, price, label) => {
      await fetch('/api/ai/highlight-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, price, label }),
      });
    },
    analyseAsset: async (symbol) => {
      const res = await fetch(
        `/api/ai/analyse-asset?symbol=${encodeURIComponent(symbol)}`,
      );
      if (!res.ok) throw new Error('analyseAsset request failed');
      return res.json();
    },
    scanOpportunities: async (limit = 5) => {
      const res = await fetch(`/api/ai/scan-opportunities?limit=${limit}`);
      if (!res.ok) throw new Error('scanOpportunities request failed');
      return res.json();
    },
  };
}

/**
 * Hook returning memoised agent helpers for ease of use inside components.
 */
export default function useAgent(): AgentHelpers {
  return createAgentHelpers();
}
