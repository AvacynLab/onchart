import { EventEmitter } from 'events';

/**
 * Basic event bus used to push UI actions (e.g. show chart, add annotation)
 * from server side tools to the client. Consumers can subscribe to receive
 * events and update the UI accordingly. Events are typed with a minimal
 * shape: a string `type` and an optional `payload` object.
 */
export interface UIEvent<T = any> {
  /** Identifier of the event, e.g. `show_chart` */
  type: string;
  /** Arbitrary payload associated with the event. */
  payload?: T;
}

// Internal Node.js event emitter instance. Using a singleton ensures that
// all imports of this module share the same emitter.
const emitter = new EventEmitter();

/**
 * Emit a UI event to all subscribers.
 */
export function emitUIEvent<T = any>(event: UIEvent<T>) {
  emitter.emit('ui', event);
}

/**
 * Subscribe to UI events. Returns an unsubscribe function to remove the
 * listener when no longer needed.
 */
export function subscribeUIEvents<T = any>(
  handler: (event: UIEvent<T>) => void,
) {
  emitter.on('ui', handler);
  // Return an unsubscribe function that removes the listener and resolves to
  // `void` so it can be used directly as a React effect cleanup callback.
  return () => {
    emitter.off('ui', handler);
  };
}
