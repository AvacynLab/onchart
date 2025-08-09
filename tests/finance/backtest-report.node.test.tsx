import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import BacktestReport from '../../components/finance/BacktestReport';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
// @ts-ignore
globalThis.window = dom.window;
// @ts-ignore
globalThis.document = dom.window.document;
// @ts-ignore
globalThis.navigator = dom.window.navigator;

function tick() {
  return new Promise((r) => setTimeout(r, 0));
}

test('renders metrics table', async () => {
  const container = document.createElement('div');
  createRoot(container).render(
    <BacktestReport
      metrics={{
        cagr: 12.34,
        sharpe: 1.2,
        sortino: 1.1,
        maxDrawdown: 5.6,
        hitRate: 0.55,
        profitFactor: 1.7,
      }}
      curve={[{ time: 0, value: 1 }, { time: 1, value: 1.1 }]}
    />,
  );
  await tick();
  const text = container.textContent || '';
  assert.match(text, /12\.34%/);
  assert.match(text, /1\.20/);
  assert.match(text, /55\.0%/);
});

