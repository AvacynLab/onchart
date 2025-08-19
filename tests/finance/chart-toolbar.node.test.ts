import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import ChartToolbar from '../../components/finance/ChartToolbar';
import { NextIntlClientProvider } from 'next-intl';

// Minimal DOM setup with JSDOM so that the component can mount.
const dom = new JSDOM('<!doctype html><html><body></body></html>');
// @ts-expect-error assign jsdom globals
globalThis.window = dom.window as any;
// @ts-expect-error assign jsdom globals
globalThis.document = dom.window.document as any;

const messages = {
  finance: {
    chart: {
      series: { candlestick: 'Candlestick', line: 'Line' },
      indicators: { sma: 'SMA', rsi: 'RSI' },
    },
  },
};

test('callbacks fire when interacting with the toolbar', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);

  let tf: string | null = null;
  let series: string | null = null;
  let toggled: string[] | null = null;

  createRoot(container).render(
    React.createElement(
      NextIntlClientProvider,
      { locale: 'en', messages },
      React.createElement(ChartToolbar, {
        timeframe: '1m',
        seriesType: 'candlestick',
        indicators: [],
        onTimeframeChange: (t: string) => {
          tf = t;
        },
        onSeriesTypeChange: (s: string) => {
          series = s;
        },
        onToggleIndicator: (inds: string[]) => {
          toggled = inds;
        },
      }),
    ),
  );

  // Wait for the component to mount.
  await new Promise((r) => setTimeout(r, 0));

  // Click a different timeframe
  (document.querySelector('[data-testid="tf-5m"]') as HTMLButtonElement)?.click();
  assert.equal(tf, '5m');

  // Change series type
  (document.querySelector('[data-testid="series-line"]') as HTMLButtonElement)?.click();
  assert.equal(series, 'line');

  // Toggle indicator
  (document.querySelector('[data-testid="ind-rsi"]') as HTMLInputElement)?.click();
  assert.deepEqual(toggled, ['rsi']);
});

test('indicator toggles maintain a unique list', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);

  let indicators: string[] = [];
  createRoot(container).render(
    React.createElement(
      NextIntlClientProvider,
      { locale: 'en', messages },
      React.createElement(ChartToolbar, {
        timeframe: '1m',
        seriesType: 'candlestick',
        indicators: [],
        onToggleIndicator: (inds: string[]) => {
          indicators = inds;
        },
      }),
    ),
  );

  await new Promise((r) => setTimeout(r, 0));

  const sma = document.querySelector(
    '[data-testid="ind-sma"]',
  ) as HTMLInputElement;
  // Rapid toggles should not create duplicates.
  sma.click();
  sma.click();
  assert.deepEqual(indicators, []);
});
