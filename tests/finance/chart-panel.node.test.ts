import { test } from 'node:test';
import assert from 'node:assert/strict';
import React, { createRef } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import ChartPanel, { ChartPanelRef } from '../../components/finance/ChartPanel';
import { subscribeUIEvents } from '../../lib/ui/events';

// Setup a minimal DOM environment using JSDOM so that the chart can mount
// without requiring a real browser.
const dom = new JSDOM('<!doctype html><html><body></body></html>');
// @ts-expect-error assign jsdom globals
globalThis.window = dom.window as any;
// @ts-expect-error assign jsdom globals
globalThis.document = dom.window.document as any;
// lightweight-charts relies on ResizeObserver; provide a no-op shim.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error shim ResizeObserver
globalThis.ResizeObserver = ResizeObserverStub;
// Provide a minimal matchMedia implementation for theme handling.
// @ts-expect-error jsdom matchMedia stub
globalThis.window.matchMedia = () => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {},
});

test('setData, overlays, focusArea and crosshair events operate on the chart', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);

  let received: any = null;
  const seriesStub = {
    setData: (d: any) => {
      received = d;
    },
    createPriceLine: () => ({ remove: () => {} }),
  } as any;
  let overlay: any = null;
  const overlayStub = { setData: (d: any) => (overlay = d) } as any;
  let crosshairHandler: any = null;
  let visible: any = null;
  const chartStub = {
    addCandlestickSeries: () => seriesStub,
    addLineSeries: () => overlayStub,
    timeScale: () => ({
      setVisibleRange: (r: any) => {
        visible = r;
      },
    }),
    subscribeCrosshairMove: (h: any) => {
      crosshairHandler = h;
    },
    remove: () => {},
    applyOptions: () => {},
  } as any;

  const ref = createRef<ChartPanelRef>();
  createRoot(container).render(
    React.createElement(ChartPanel, {
      ref,
      symbol: 'AAPL',
      timeframe: '1D',
      createChartFn: () => chartStub,
    }),
  );

  // Wait for the chart to initialise. The effect creating the chart runs
  // asynchronously, so yield to the event loop twice to ensure it has fired.
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
  // Allow an extra tick for the chart to fully initialise.
  await new Promise((r) => setTimeout(r, 0));
  const data = [{ time: 1, open: 1, high: 1, low: 1, close: 1 }];
  ref.current?.setData(data as any);
  ref.current?.addOverlay({ id: 'ma', data: [{ time: 1, value: 1 }] });
  ref.current?.focusArea(1, 2);

  // Trigger a crosshair move and capture the emitted event.
  const events: any[] = [];
  const unsubscribe = subscribeUIEvents((e) => events.push(e));
  crosshairHandler?.({ time: 10 } as any);
  unsubscribe();

  assert.deepEqual(received, data);
  assert.deepEqual(overlay, [{ time: 1, value: 1 }]);
  assert.deepEqual(visible, { from: 1, to: 2 });
  assert.deepEqual(events[0], {
    type: 'crosshair_move',
    payload: { symbol: 'AAPL', time: 10 },
  });
  assert.equal(ref.current?.getChart(), chartStub);
});
