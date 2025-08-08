import { EventEmitter } from 'node:events';
import { initBus, pub, sub, CHANNEL_AI } from '@/lib/market/bus';

/**
 * Basic in-memory event engine used to broadcast AI-driven annotations to
 * connected clients. Later this module can be extended to plug into a real
 * WebSocket server or message broker.
 */
export type AIEvent = {
  /** Type of event so clients can branch on the payload structure. */
  type: 'highlight-price';
  /** Asset ticker the event refers to. */
  symbol: string;
  /** Price level to highlight on the chart. */
  price: number;
  /** Optional label rendered next to the highlight. */
  label?: string;
  /** Human-readable message associated with the event. */
  message?: string;
  /** Severity level to influence UI styling. */
  level?: 'info' | 'success' | 'warning' | 'error';
  /** Milliseconds since epoch when the event was generated. */
  ts: number;
};

// Internal emitter acting as a server-side mock of the "ai-events" channel.
// It allows unit tests to subscribe without a running Redis instance.
const emitter = new EventEmitter();

// Bridge Redis messages into the local emitter so tests can subscribe without
// a direct Redis dependency.
initBus()
  .then(() =>
    sub.subscribe(CHANNEL_AI, (msg) => {
      try {
        emitter.emit('ai-event', JSON.parse(msg));
      } catch {
        // ignore malformed messages
      }
    }),
  )
  .catch(() => {
    // Swallow connection errors in test environments where Redis may be absent.
  });

/**
 * Subscribe to AI events. Returns an unsubscribe function to remove the
 * listener when no longer needed.
 */
/**
 * Subscribe to AI events. Intended for server-side tests only; production
 * clients should consume events via the WebSocket endpoint backed by Redis.
 */
export const subscribeAIEvents = (
  listener: (event: AIEvent) => void,
): (() => void) => {
  emitter.on('ai-event', listener);
  return () => emitter.off('ai-event', listener);
};

/**
 * Broadcast an event to all subscribers. In production this will also fan out
 * to WebSocket clients listening on the `ai-events` channel.
 */
export const broadcastAIEvent = async (event: AIEvent): Promise<void> => {
  emitter.emit('ai-event', event);
  await initBus();
  await pub.publish(CHANNEL_AI, JSON.stringify(event));
};

