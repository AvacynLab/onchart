import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';

// Verify that chart artifacts render overlay indicator data when a custom
// chart factory is provided.
test('renders indicator overlays on chart artifact', async () => {
  const overlayData: any[] = [];
  const createChartFn = () => ({
    addCandlestickSeries: () => ({ setData: () => {} }),
    addLineSeries: () => ({ setData: (d: any) => overlayData.push(d) }),
    subscribeClick: () => {},
    remove: () => {},
  });

  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  // @ts-expect-error jsdom globals
  globalThis.window = dom.window as any;
  // @ts-expect-error jsdom globals
  globalThis.document = dom.window.document as any;
  globalThis.fetch = async () => ({ json: async () => ({ candles: [] }) }) as any;

  const container = document.createElement('div');
  document.body.appendChild(container);
  const { default: ArtifactViewer } = await import('../../components/artifact/ArtifactViewer');
  createRoot(container).render(
    React.createElement(ArtifactViewer, {
      artifact: {
        type: 'chart',
        symbol: 'AAPL',
        timeframe: '1m',
        overlays: [
          {
            name: 'sma',
            data: [
              { time: 0, value: 1 },
              { time: 60000, value: 2 },
            ],
          },
        ],
      },
      createChartFn,
      useRouterHook: () => ({ push: () => {} }),
    }),
  );
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(overlayData.length, 1);
  assert.deepEqual(overlayData[0], [
    { time: 0, value: 1 },
    { time: 60, value: 2 },
  ]);
});
