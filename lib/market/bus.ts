import { createClient } from 'redis';

/**
 * Redis-based pub/sub bus bridging the market worker, API routes and clients.
 *
 * Acts as the single source of truth for all real-time data emitted by the
 * worker. Both ticks/candles and AI events flow through this bus so different
 * processes can communicate without relying on in-memory emitters.
 */
export const CHANNEL_TICK = 'ticks';
export const CHANNEL_CANDLE = 'candles';
export const CHANNEL_AI = 'ai-events';

const url = process.env.REDIS_URL!;
export const pub = createClient({ url });
export const sub = createClient({ url });

/** Ensure both publisher and subscriber are connected before use. */
export async function initBus(): Promise<void> {
  if (!pub.isOpen) await pub.connect();
  if (!sub.isOpen) await sub.connect();
}
