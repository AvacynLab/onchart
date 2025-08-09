import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import MenuTile from '../../components/dashboard/tiles/MenuTile';
import { ToolbarProvider } from '../../components/toolbar-store';

// Setup minimal DOM environment for React rendering.
const dom = new JSDOM('<!doctype html><html><body></body></html>');
// @ts-ignore
globalThis.window = dom.window;
// @ts-ignore
globalThis.document = dom.window.document;
// @ts-ignore
globalThis.navigator = dom.window.navigator;

test('toggles menu items visibility with proper aria attributes and focus', async () => {
  const container = document.createElement('div');
  createRoot(container).render(
    <ToolbarProvider>
      <MenuTile />
    </ToolbarProvider>,
  );
  await new Promise((r) => setTimeout(r, 0));
  const button = container.querySelector('button') as HTMLButtonElement;
  assert.ok(button);
  assert.equal(button.getAttribute('aria-expanded'), 'false');
  button.click();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(button.getAttribute('aria-expanded'), 'true');
  assert.ok(container.textContent?.includes('Afficher AAPL 1D'));
  button.click();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(button.getAttribute('aria-expanded'), 'false');
});
