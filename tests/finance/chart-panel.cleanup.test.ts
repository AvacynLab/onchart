import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import ChartPanel from '../../components/finance/ChartPanel';

// Establish a minimal DOM environment for the component.
const dom = new JSDOM('<!doctype html><html><body></body></html>');
// @ts-expect-error assign jsdom globals
globalThis.window = dom.window as any;
// @ts-expect-error assign jsdom globals
globalThis.document = dom.window.document as any;
// Stub ResizeObserver used by the component.
class ResizeObserver {
  observe() {}
  disconnect() {}
}
// @ts-expect-error assign global
globalThis.ResizeObserver = ResizeObserver;

test('cleans up listeners on unmount', async () => {
  const mediaListeners = new Set<any>();
  // Provide a stubbed matchMedia implementation that tracks listeners.
  window.matchMedia = () => ({
    matches: false,
    addEventListener: (_: string, cb: any) => mediaListeners.add(cb),
    removeEventListener: (_: string, cb: any) => mediaListeners.delete(cb),
  }) as any;

  let unsubscribed = false;
  const chart: any = {
    addSeries: () => ({ setData: () => {} }),
    subscribeCrosshairMove: (cb: any) => {
      chart._cb = cb;
    },
    unsubscribeCrosshairMove: (cb: any) => {
      if (cb === chart._cb) unsubscribed = true;
    },
    applyOptions: () => {},
    timeScale: () => ({ setVisibleRange: () => {} }),
    remove: () => {},
  };

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  root.render(
    React.createElement(ChartPanel, {
      symbol: 'AAPL',
      timeframe: '1d',
      createChartFn: () => chart,
    }),
  );

  // Allow effects to run.
  await new Promise((r) => setTimeout(r, 0));

  root.unmount();

  assert.equal(unsubscribed, true);
  assert.equal(mediaListeners.size, 0);
});
