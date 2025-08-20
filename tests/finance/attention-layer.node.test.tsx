import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import AttentionLayer from '../../components/finance/AttentionLayer';
import { emitUIEvent } from '../../lib/ui/events';

// Setup a minimal DOM environment for React rendering.
const dom = new JSDOM('<!doctype html><html><body></body></html>');
// @ts-expect-error jsdom globals
globalThis.window = dom.window as any;
// @ts-expect-error jsdom globals
globalThis.document = dom.window.document as any;

// Stub lightweight‑charts chart with only the methods used for coordinate
// conversion and subscriptions.
const chartStub = {
  timeScale: () => ({
    timeToCoordinate: (t: number) => t,
    subscribeVisibleTimeRangeChange: () => {},
    unsubscribeVisibleTimeRangeChange: () => {},
  }),
} as any;

test('renders markers and handles clicks', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const clicked: any[] = [];
  createRoot(container).render(
    React.createElement(AttentionLayer, {
      chart: chartStub,
      symbol: 'AAPL',
      chatId: 'c1',
      userId: 'u1',
      onSelect: (m) => clicked.push(m),
    }),
  );

  // Allow the component's effects to subscribe to events before emitting.
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));

  emitUIEvent({
    type: 'add_annotation',
    payload: { id: 'a1', symbol: 'AAPL', at: 5, type: 'note', text: 'hi' },
  });

  // Wait for React state updates.
  await new Promise((r) => setTimeout(r, 0));

  const marker = container.querySelector('[data-testid="attention-marker"]') as HTMLElement;
  assert.ok(marker);
  assert.equal(marker.textContent, 'hi');

  marker.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.equal(clicked[0].id, 'a1');

  emitUIEvent({ type: 'remove_annotation', payload: { id: 'a1' } });
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(container.querySelector('[data-testid="attention-marker"]'), null);
});

test('persists marker when id missing', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let body: any = null;
  const fetcher = async (_url: string, opts: any) => {
    body = JSON.parse(opts.body);
    return { json: async () => ({ id: 'g1' }) } as any;
  };

  createRoot(container).render(
    React.createElement(AttentionLayer, {
      chart: chartStub,
      symbol: 'AAPL',
      chatId: 'c1',
      userId: 'u1',
      fetcher,
    }),
  );

  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));

  emitUIEvent({
    type: 'add_annotation',
    payload: { symbol: 'AAPL', timeframe: '1d', at: 9, type: 'note', text: 'p' },
  });
  // Allow the debounced persistence to fire before asserting.
  await new Promise((r) => setTimeout(r, 300));

  const marker = container.querySelector('[data-testid="attention-marker"]') as HTMLElement;
  assert.ok(marker);
  assert.equal(marker.textContent, 'p');
  assert.equal(body.chatId, 'c1');
});
