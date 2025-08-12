// Lightweight event bus using the standard `EventTarget` interface. This avoids
// bundling Node's `events` module which Next.js cannot handle in the browser
// bundle.

/** Shape of UI events exchanged between server and client components. */
export interface UIEvent<T = unknown> {
  /** Identifier of the event, e.g. `show_chart`. */
  type: string;
  /** Arbitrary payload associated with the event. */
  payload?: T;
}

// Shared dispatcher so all imports communicate over the same channel.
const dispatcher = new EventTarget();

/** Emit a UI event to all subscribers. */
export function emitUIEvent<T = unknown>(event: UIEvent<T>) {
  dispatcher.dispatchEvent(new CustomEvent('ui', { detail: event }));
}

/** Subscribe to UI events and return an unsubscribe handler. */
export function subscribeUIEvents<T = unknown>(
  handler: (event: UIEvent<T>) => void,
) {
  const listener = (e: Event) => handler((e as CustomEvent<UIEvent<T>>).detail);
  dispatcher.addEventListener('ui', listener);
  return () => dispatcher.removeEventListener('ui', listener);
}

