import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import MenuTile from '../../components/dashboard/tiles/MenuTile';
import { ToolbarProvider } from '../../components/toolbar-store';
import { NextIntlClientProvider } from 'next-intl';

// Setup minimal DOM environment for React rendering.
const dom = new JSDOM('<!doctype html><html><body></body></html>');
// @ts-ignore
globalThis.window = dom.window;
// @ts-ignore
globalThis.document = dom.window.document;
// @ts-ignore
globalThis.navigator = dom.window.navigator;

test('menu toggle button exposes accessibility attributes', async () => {
  const container = document.createElement('div');
  // Append container to document body so click events propagate correctly
  document.body.appendChild(container);
  createRoot(container).render(
    <NextIntlClientProvider
      locale="en"
      messages={{ dashboard: { menu: { title: 'Menu', toggle: 'Toggle', open: 'Open', close: 'Close', hidden: 'Hidden' } } }}
    >
      <ToolbarProvider>
        <MenuTile />
      </ToolbarProvider>
    </NextIntlClientProvider>,
  );
  await new Promise((r) => setTimeout(r, 0));
  const button = container.querySelector('button') as HTMLButtonElement;
  assert.ok(button);
  assert.equal(button.getAttribute('type'), 'button');
  assert.equal(button.getAttribute('aria-expanded'), 'false');
  // We only verify the initial state and explicit type. Behavioural aspects are
  // covered by integration tests elsewhere.
});
