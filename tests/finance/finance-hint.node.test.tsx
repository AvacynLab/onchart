import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import FinanceHint from '../../components/finance/FinanceHint';
import { emitUIEvent } from '../../lib/ui/events';

// Setup jsdom for React rendering.
const dom = new JSDOM('<!doctype html><html><body></body></html>');
// @ts-expect-error jsdom globals
globalThis.window = dom.window as any;
// @ts-expect-error jsdom globals
globalThis.document = dom.window.document as any;

test('hides after show_chart event', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  createRoot(container).render(React.createElement(FinanceHint));

  // Wait for subscription effect.
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));

  // Hint should be visible initially.
  let hint = container.querySelector('[data-testid="finance-hint"]');
  assert.ok(hint);

  // Emit chart event which should hide the hint.
  emitUIEvent({
    type: 'show_chart',
    payload: { symbol: 'AAPL', timeframe: '1d' },
  });
  await new Promise((r) => setTimeout(r, 0));

  hint = container.querySelector('[data-testid="finance-hint"]');
  assert.equal(hint, null);
});

