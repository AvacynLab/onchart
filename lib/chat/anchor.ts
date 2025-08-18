/**
 * Utilities for parsing and formatting the `?anchor=` query parameter used to
 * pass contextual information (symbol, timeframe, timestamp) from the bento
 * dashboard to the chat view.
 */

export interface AnchorContext {
  /** Asset symbol, e.g. `AAPL` or `BTC-USD`. */
  symbol: string;
  /** Timeframe identifier such as `1m`, `5m`, `1h`, `4h`, or `1d`. */
  timeframe: string;
  /** Unix timestamp in milliseconds describing the selected candle. */
  timestamp: number;
}

/**
 * Parse a comma separated anchor string (`symbol,timeframe,timestamp`).
 *
 * Returns `null` if the value is malformed.
 */
export function parseAnchor(value?: string | null): AnchorContext | null {
  if (!value) return null;
  const [symbol, timeframe, ts] = value.split(',');
  const timestamp = Number(ts);
  if (!symbol || !timeframe || Number.isNaN(timestamp)) return null;
  return { symbol, timeframe, timestamp };
}

/**
 * Human readable representation of an anchor, e.g.
 * `AAPL 1h @ 2024-01-01T00:00:00.000Z`.
 */
export function formatAnchor(anchor: AnchorContext): string {
  return `${anchor.symbol} ${anchor.timeframe} @ ${new Date(anchor.timestamp).toISOString()}`;
}

/**
 * Build the default text inserted in the chat input when an anchor is present.
 */
export function buildInitialInput(anchor: AnchorContext): string {
  return `${formatAnchor(anchor)} `;
}
