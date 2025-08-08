import { createClient } from 'redis';
import { EventEmitter } from 'node:events';

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

const url = process.env.REDIS_URL;

let pub: any;
let sub: any;

if (url) {
  // Standard Redis clients when a connection string is provided.
  pub = createClient({ url });
  sub = createClient({ url });
} else {
  // Test or development environments may not have Redis available.
  // Fall back to an in-memory EventEmitter so pub/sub semantics remain
  // functional without requiring an external service.
  const emitter = new EventEmitter();

  pub = {
    isOpen: true,
    async publish(channel: string, message: string) {
      emitter.emit(channel, message);
      return 1;
    },
    async connect() {},
  } as const;

  sub = {
    isOpen: true,
    async subscribe(channel: string, listener: (message: string) => void) {
      emitter.on(channel, listener);
    },
    async unsubscribe(channel: string, listener: (message: string) => void) {
      emitter.off(channel, listener);
    },
    async connect() {},
  } as const;
}

export { pub, sub };

/** Ensure both publisher and subscriber are connected before use. */
export async function initBus(): Promise<void> {
  if (url) {
    if (!pub.isOpen) await pub.connect();
    if (!sub.isOpen) await sub.connect();
  }
}
