import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import Module from 'module';

// Stub modules that expect a server environment so the panel can be imported
// in Node tests without triggering Next.js restrictions or ESM-only bundles.
const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === 'server-only' || request === 'lightweight-charts') return {};
  return originalLoad(request, parent, isMain);
};

const FinancePanel = require('../../components/finance/FinancePanel').default;

// Setup JSDOM environment with a URL so localStorage works.
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'https://localhost',
});
globalThis.window = dom.window as any;
globalThis.document = dom.window.document as any;
// @ts-expect-error expose localStorage
globalThis.localStorage = dom.window.localStorage;
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error
globalThis.ResizeObserver = ResizeObserverStub;
// @ts-expect-error
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });

// Capture requested URLs and serve different payloads per endpoint.
let requests: string[] = [];
const fetcher = async (url: string) => {
  requests.push(url);
  if (url.startsWith('/api/finance/attention')) {
    return {
      ok: true,
      json: async () => [
        { id: '1', symbol: 'AAPL', timeframe: '1d', payload: { at: 1, text: 'note' } },
      ],
    } as any;
  }
  return { ok: true, json: async () => ({ candles: [] }) } as any;
};

test('renders chart on show_chart event', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  localStorage.clear();

  let handler: any = null;
  const subscribe = (fn: any) => {
    handler = fn;
    return () => {};
  };

  let seriesData: any = null;
  const chartStub = {
    addSeries: () => ({
      setData(d: any) {
        seriesData = d;
      },
      createPriceLine: () => ({ remove() {} }),
    }),
    timeScale: () => ({
      setVisibleRange() {},
      subscribeVisibleTimeRangeChange() {},
      unsubscribeVisibleTimeRangeChange() {},
      timeToCoordinate: () => 0,
    }),
    applyOptions() {},
    remove() {},
    subscribeCrosshairMove() {},
  } as any;
  const createChart = () => chartStub;

  createRoot(container).render(
    React.createElement(FinancePanel, {
      chatId: 'chat1',
      userId: 'user1',
      subscribe,
      fetcher,
      createChartFn: createChart,
    })
  );

  for (let i = 0; i < 3; i++) {
    await new Promise((r) => setTimeout(r, 0));
  }
  handler?.({ type: 'show_chart', payload: { symbol: 'AAPL', timeframe: '1d' } });
  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setTimeout(r, 0));
  }
  // Two requests should have been made: OHLC data and attention markers
  assert.equal(requests.length, 2);
  // Symbol chip for AAPL should be displayed
  const chip = container.querySelector('[data-testid="symbol-chip"]');
  assert.equal(chip?.textContent, 'AAPL');
  // Chart received data array
  assert.deepEqual(seriesData, []);
});

test('skips remembering symbol when OHLC fetch fails', async () => {
  requests = [];
  const container = document.createElement('div');
  document.body.appendChild(container);
  localStorage.clear();

  let handler: any = null;
  const subscribe = (fn: any) => {
    handler = fn;
    return () => {};
  };

  let seriesData: any = null;
  const chartStub = {
    addSeries: () => ({
      setData(d: any) {
        seriesData = d;
      },
      createPriceLine: () => ({ remove() {} }),
    }),
    timeScale: () => ({
      setVisibleRange() {},
      subscribeVisibleTimeRangeChange() {},
      unsubscribeVisibleTimeRangeChange() {},
      timeToCoordinate: () => 0,
    }),
    applyOptions() {},
    remove() {},
    subscribeCrosshairMove() {},
  } as any;
  const createChart = () => chartStub;

  const failingFetcher = async (url: string) => {
    requests.push(url);
    return { ok: false, status: 502, json: async () => ({}) } as any;
  };

  createRoot(container).render(
    React.createElement(FinancePanel, {
      chatId: 'chat1',
      userId: 'user1',
      subscribe,
      fetcher: failingFetcher,
      createChartFn: createChart,
    }),
  );

  for (let i = 0; i < 3; i++) {
    await new Promise((r) => setTimeout(r, 0));
  }
  handler?.({ type: 'show_chart', payload: { symbol: 'BAD', timeframe: '1d' } });
  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setTimeout(r, 0));
  }
  // Only one request should be made (OHLC) since attention is skipped on failure
  assert.equal(requests.length, 1);
  // No symbol chip should be rendered because symbol was not remembered
  const chip = container.querySelector('[data-testid="symbol-chip"]');
  assert.equal(chip, null);
  // Chart was cleared
  assert.deepEqual(seriesData, []);
});
