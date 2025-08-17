// Lightweight event bus using the standard `EventTarget` interface. This avoids
// bundling Node's `events` module which Next.js cannot handle in the browser
// bundle.

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
      payload: { symbol: string; timeframe?: string; range?: string };
    }
  | {
      /** Add an overlay line series to the active chart. */
      type: 'add_overlay';
      payload: { symbol: string; id: string; data: any[]; color?: string };
    }
  | {
      /** Add a study line series to the active chart. */
      type: 'add_study';
      payload: { symbol: string; id: string; data: any[]; color?: string };
    }
  | {
      /** Add an annotation marker to the chart. */
      type: 'add_annotation';
      payload: {
        symbol: string;
        timeframe: string;
        id: string;
        at: number;
        price: number;
        text?: string;
        type?: string;
      };
    }
  | {
      /** Remove a previously added annotation marker. */
      type: 'remove_annotation';
      payload: { id: string };
    }
  | {
      /** Focus the chart on a specific time range. */
      type: 'focus_area';
      payload: { symbol: string; start: number; end: number };
    }
  | {
      /** Broadcast crosshair movement for external reactions. */
      type: 'crosshair_move';
      payload: { symbol: string; time: number };
    };

// Shared dispatcher so all imports communicate over the same channel.
const dispatcher = new EventTarget();

/** Emit a UI event to all subscribers. */
export function emitUIEvent(event: UIEvent) {
  dispatcher.dispatchEvent(new CustomEvent('ui', { detail: event }));
}

/** Subscribe to UI events and return an unsubscribe handler. */
export function subscribeUIEvents(handler: (event: UIEvent) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<UIEvent>).detail);
  dispatcher.addEventListener('ui', listener);
  return () => dispatcher.removeEventListener('ui', listener);
}

