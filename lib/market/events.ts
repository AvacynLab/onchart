import { EventEmitter } from 'node:events';

/** Represents a single tick update for a symbol. */
export interface MarketTick {
  /** Ticker symbol for the asset. */
  symbol: string;
  /** Unix epoch milliseconds when the trade occurred. */
  ts: number;
  /** Traded price. */
  price: number;
  /** Traded volume. */
  volume: number;
}

/** Candle update emitted as the latest bar is forming. */
export interface MarketCandle {
  /** Ticker symbol for the candle. */
  symbol: string;
  /** Interval like `1m`, `5m`, `1h`, ... */
  interval: string;
  /** Candle open price. */
  open: number;
  /** Highest price reached. */
  high: number;
  /** Lowest price reached. */
  low: number;
  /** Last traded price. */
  close: number;
  /** Aggregated volume. */
  volume: number;
  /** Start timestamp in milliseconds. */
  tsStart: number;
  /** End timestamp in milliseconds. */
  tsEnd: number;
}

/**
 * In-memory event bus for market ticks and forming candles.
 *
 * The market worker pushes events through the exported helper
 * functions so that all connected WebSocket clients receive
 * real-time updates without polling the database.
 */
class MarketEventEmitter extends EventEmitter {}

export const marketEvents = new MarketEventEmitter();

/** Broadcast a new tick to listeners. */
export function emitTick(tick: MarketTick) {
  marketEvents.emit('tick', tick);
}

/** Broadcast a candle update to listeners. */
export function emitCandle(candle: MarketCandle) {
  marketEvents.emit('candle', candle);
}
