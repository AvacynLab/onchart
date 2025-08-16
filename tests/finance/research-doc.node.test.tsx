import '../helpers/next-intl-stub';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { NextIntlClientProvider } from 'next-intl';

// Establish minimal DOM environment
const dom = new JSDOM('<!doctype html><html><body></body></html>');
// @ts-ignore
globalThis.window = dom.window;
// @ts-ignore
globalThis.document = dom.window.document;

function tick() {
  return new Promise((r) => setTimeout(r, 0));
}

test('uses translated default section labels', async () => {
  const messages = {
    finance: {
      research: {
        summary: 'Résumé',
      },
    },
  };
  const { default: ResearchDoc } = await import('../../components/finance/research/ResearchDoc');
  const container = document.createElement('div');
  createRoot(container).render(
    <NextIntlClientProvider messages={messages}>
      <ResearchDoc title="Doc" sections={[{ id: 'summary', content: '...'}]} />
    </NextIntlClientProvider>,
  );
  await tick();
  assert.match(container.textContent ?? '', /Résumé/);
});
