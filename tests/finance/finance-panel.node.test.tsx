import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import FinancePanel from '../../components/finance/FinancePanel';

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
      json: async () => [
        { id: '1', symbol: 'AAPL', timeframe: '1d', payload: { at: 1, text: 'note' } },
      ],
    } as any;
  }
  return { json: async () => ({ candles: [] }) } as any;
};

test('renders chart on show_chart event', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);

  let handler: any = null;
  const subscribe = (fn: any) => {
    handler = fn;
    return () => {};
  };

  const chartStub = {
    addCandlestickSeries: () => ({
      setData() {},
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
  });
