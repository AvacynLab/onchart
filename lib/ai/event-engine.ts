import { EventEmitter } from 'node:events';

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

// Internal emitter acting as the "ai-events" channel.
const emitter = new EventEmitter();

/**
 * Subscribe to AI events. Returns an unsubscribe function to remove the
 * listener when no longer needed.
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
export const broadcastAIEvent = (event: AIEvent): void => {
  emitter.emit('ai-event', event);
};

