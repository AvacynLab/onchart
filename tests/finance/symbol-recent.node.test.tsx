import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import SymbolRecent from '../../components/finance/SymbolRecent';

// Setup JSDOM environment
const dom = new JSDOM('<!doctype html><html><body></body></html>');
// @ts-expect-error assign globals for ReactDOM
globalThis.window = dom.window as any;
// @ts-expect-error
globalThis.document = dom.window.document as any;

test('renders recent symbols and triggers callback', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);

  let selected: string | null = null;
  createRoot(container).render(
    React.createElement(SymbolRecent, {
      symbols: ['AAPL', 'TSLA'],
      onSelect: (s: string) => {
        selected = s;
      },
    }),
  );

  await new Promise((r) => setTimeout(r, 0));

  const chips = container.querySelectorAll('[data-testid="symbol-chip"]');
  assert.equal(chips.length, 2);
  (chips[0] as HTMLButtonElement).click();
  assert.equal(selected, 'AAPL');
});

