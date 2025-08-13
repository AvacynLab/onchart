import '../helpers/next-intl-stub';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import FinanceHint from '../../components/finance/FinanceHint';
import { NextIntlClientProvider } from 'next-intl';

// Setup jsdom environment for rendering.
const dom = new JSDOM('<!doctype html><html><body></body></html>');
// @ts-expect-error jsdom globals
globalThis.window = dom.window as any;
// @ts-expect-error jsdom globals
globalThis.document = dom.window.document as any;

// Helper to render the component with given messages and return text content.
async function renderWithMessages(messages: any) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  createRoot(container).render(
    React.createElement(
      NextIntlClientProvider,
      { locale: 'en', messages },
      React.createElement(FinanceHint, { subscribe: () => () => {} }),
    ),
  );
  // Wait for effects to run.
  await new Promise((r) => setTimeout(r, 0));
  return container.textContent ?? '';
}

test('finance hint displays translated message', async () => {
  const enText = await renderWithMessages({ chat: { financeHint: 'Ask for a chart' } });
  assert.match(enText, /Ask for a chart/);

  const frText = await renderWithMessages({ chat: { financeHint: 'Demandez un graphique' } });
  assert.match(frText, /Demandez un graphique/);
});
