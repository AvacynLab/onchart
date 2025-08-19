import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import useDebounce from '@/hooks/use-debounce';

// Ensure useDebounce delays value updates until the delay has elapsed.
// Rapid successive changes should resolve to the last value only.
test('useDebounce returns latest value after delay', async (t) => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  // Preserve any existing globals so parallel tests aren't affected.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prevWindow = globalThis.window as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prevDocument = globalThis.document as any;
  // Provide minimal DOM globals for React.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.window = dom.window as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.document = dom.window.document as any;
  // Restore previous globals once the test completes to avoid
  // interference with other concurrently executed tests.
  t.after(() => {
    globalThis.window = prevWindow;
    globalThis.document = prevDocument;
  });

  const seen: string[] = [];
  function Comp() {
    const [val, setVal] = useState('a');
    const d = useDebounce(val, 200);
    useEffect(() => {
      seen.push(d);
    }, [d]);
    useEffect(() => {
      setVal('b');
      setTimeout(() => setVal('c'), 100);
    }, []);
    return null;
  }

  const root = createRoot(document.createElement('div'));
  root.render(<Comp />);
  // Allow ample time for the debounced value to settle even on slow CI
  // runners. The hook uses a 200ms delay; waiting 500ms ensures the final
  // update is processed before assertions.
  await new Promise((r) => setTimeout(r, 500));
  assert.deepEqual(seen, ['a', 'c']);
  // Unmount to ensure no timers leak into other tests.
  root.unmount();
});
