import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import ChartWidget, { applyCandleUpdate } from '../ChartWidget';

// Basic server-side render test with mocked dependencies. This ensures the
// component can render without accessing browser APIs. Live chart updates are
// not exercised here.
test('renders chart widget container on the server', () => {
  const html = renderToString(
    <ChartWidget
      symbol="AAPL"
      interval="1m"
      fetchCandles={async () => []}
      chartFactory={{
        createChart: () => ({
          addCandlestickSeries: () => ({
            setData() {},
            update() {},
          }),
          remove() {},
        }),
      }}
      socketHook={() => ({ candle: null })}
    />,
  );

  assert.ok(html.includes('<div'));
});

// Ensure that live candle updates are forwarded to the chart series.
// The component's effect uses {@link applyCandleUpdate}; we test the helper
// directly to avoid needing a DOM environment.
test('applyCandleUpdate forwards candle updates to series', () => {
  const updates: any[] = [];
  const series = {
    update: (candle: any) => updates.push(candle),
  } as any;

  const candle = {
    time: 1,
    open: 1,
    high: 2,
    low: 0.5,
    close: 1.5,
    volume: 10,
  };

  applyCandleUpdate(series, candle);
  assert.deepEqual(updates, [candle]);

  // Passing null candle or series should be a no-op
  applyCandleUpdate(series, null);
  applyCandleUpdate(null, candle);
  assert.deepEqual(updates, [candle]);
});
