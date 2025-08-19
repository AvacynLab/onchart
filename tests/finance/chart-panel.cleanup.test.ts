import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import ChartPanel from '../../components/finance/ChartPanel';

// Establish a minimal DOM environment for the component.
const dom = new JSDOM('<!doctype html><html><body></body></html>');
// @ts-expect-error assign jsdom globals
globalThis.window = dom.window as any;
// @ts-expect-error assign jsdom globals
globalThis.document = dom.window.document as any;
// Stub ResizeObserver used by the component and record disconnects.
let roDisconnected = false;
class ResizeObserver {
  observe() {}
  disconnect() {
    roDisconnected = true;
  }
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

  // Track add/remove of the resize listener.
  let resizeListener: any = null;
  let resizeRemoved = false;
  const addOrig = window.addEventListener.bind(window);
  const removeOrig = window.removeEventListener.bind(window);
  window.addEventListener = (type: any, listener: any, opts?: any) => {
    if (type === 'resize') resizeListener = listener;
    return addOrig(type, listener, opts as any);
  };
  window.removeEventListener = (type: any, listener: any, opts?: any) => {
    if (type === 'resize' && listener === resizeListener) resizeRemoved = true;
    return removeOrig(type, listener, opts as any);
  };

  let unsubscribed = false;
  let chartRemoved = false;
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
    remove: () => {
      chartRemoved = true;
    },
  };

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  root.render(
    createElement(ChartPanel, {
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
  assert.equal(roDisconnected, true);
  assert.equal(resizeRemoved, true);
  assert.equal(chartRemoved, true);
});
