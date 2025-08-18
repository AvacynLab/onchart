import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import useDebounce from '@/hooks/use-debounce';

// Ensure useDebounce delays value updates until the delay has elapsed.
// Rapid successive changes should resolve to the last value only.
test('useDebounce returns latest value after delay', async () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  // Provide minimal DOM globals for React.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.window = dom.window as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.document = dom.window.document as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.navigator = dom.window.navigator as any;

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
  await new Promise((r) => setTimeout(r, 350));
  assert.deepEqual(seen, ['a', 'c']);
});
