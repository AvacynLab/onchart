// Lightweight event bus implemented via the browser's `EventTarget`. This
// avoids bundling Node's `events` module and keeps the implementation tiny.

/**
 * Generic factory creating a typed event bus. Each bus exposes two methods:
 * `emit` for dispatching events and `on` for subscribing to them. The generic
 * parameter `E` represents the discriminated union describing all allowed
 * events.
 */
export function createEventBus<E>() {
  const dispatcher = new EventTarget();
  return {
    /** Notify all subscribers of a new event. */
    emit(event: E) {
      dispatcher.dispatchEvent(new CustomEvent('ui', { detail: event }));
    },
    /**
     * Subscribe to events from the bus. Returns an unsubscribe function so
     * callers can easily remove their listener when it is no longer needed.
     */
    on(handler: (event: E) => void) {
      const listener = (e: Event) => handler((e as CustomEvent<E>).detail);
      dispatcher.addEventListener('ui', listener);
      return () => dispatcher.removeEventListener('ui', listener);
    },
  } as const;
}

/**
 * Shape of all events exchanged between server and client components.
 *
 * Each variant is intentionally narrow so TypeScript can enforce the
 * appropriate payload structure when emitting or handling events. This reduces
 * the chances of a tool sending the wrong data and silently failing in the UI.
 */
export type UIEvent =
  | {
      /** Request the finance panel to display a symbol chart. */
      type: 'show_chart';
      payload: { symbol: string; timeframe: string };
    }
  | {
      /** Add an overlay to a specific chart pane. */
      type: 'add_overlay';
      payload: { pane: number; kind: 'sma' | 'ema' | 'rsi'; params: any };
    }
  | {
      /** Focus the chart on a specific time range. */
      type: 'focus_area';
      payload: { from: number; to: number };
    }
  | {
      /** Add an annotation marker to the chart. */
      type: 'add_annotation';
      payload: { at: number; text: string };
    }
  | {
      /** Ask the agent about a user selection on the chart. */
      type: 'ask_about_selection';
      payload: {
        symbol: string;
        timeframe: string;
        at: number;
        kind: 'candle' | 'indicator';
        meta?: any;
      };
    };

/**
 * Singleton UI event bus used across the application. Import this `ui` object
 * to emit or listen for UI events in a fully type-safe way.
 */
export const ui = createEventBus<UIEvent>();

// Backwards compatibility helpers. Some legacy components still import
// `emitUIEvent` and `subscribeUIEvents`; export thin wrappers so they continue
// to operate while the codebase is gradually migrated to the new API.
export const emitUIEvent = ui.emit;
export const subscribeUIEvents = ui.on;

