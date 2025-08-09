import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import StrategyWizard from '../../components/finance/StrategyWizard';

// Minimal DOM setup for React rendering
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

test('collects answers through all steps', async () => {
  const container = document.createElement('div');
  let result: any = null;
  createRoot(container).render(
    <StrategyWizard onComplete={(answers) => (result = answers)} />,
  );
  await tick();

  const submit = () =>
    container.querySelector('form')!.dispatchEvent(
      new dom.window.Event('submit', { bubbles: true, cancelable: true }),
    );

  const input = () => container.querySelector('input') as HTMLInputElement;

  input().value = 'court terme';
  submit();
  await tick();

  input().value = 'modéré';
  submit();
  await tick();

  input().value = 'actions';
  submit();
  await tick();

  input().value = '0.1';
  submit();
  await tick();

  assert.deepEqual(result, {
    horizon: 'court terme',
    risk: 'modéré',
    universe: 'actions',
    fees: 0.1,
  });
});

