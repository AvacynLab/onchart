import '../helpers/next-intl-stub';
import test from 'node:test';
import assert from 'node:assert/strict';
import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { AssetProvider, useAsset } from '../../lib/asset/AssetContext';
import { NextIntlClientProvider } from 'next-intl';

// Verify that NewsCard re-fetches headlines when the asset symbol changes.
test('NewsCard re-fetches on symbol change', async () => {
  // Setup minimal DOM environment for client rendering.
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  // @ts-expect-error jsdom globals
  globalThis.window = dom.window as any;
  // @ts-expect-error jsdom globals
  globalThis.document = dom.window.document as any;
  // @ts-expect-error jsdom globals
  globalThis.localStorage = { getItem: () => null, setItem: () => {} } as any;

  const calls: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url: string) => {
    calls.push(url);
    return { ok: true, json: async () => [] } as any;
  };

  // Helper component to trigger a symbol change after mount.
  function Wrapper() {
    const { setAsset } = useAsset();
    useEffect(() => {
      setTimeout(() => setAsset('MSFT'), 10);
    }, [setAsset]);
    const { NewsCard } = require('../../components/bento/NewsCard');
    return React.createElement(NewsCard);
  }

  const messages = { dashboard: { bento: { news: 'News', summarize: 'Summarize' } } };
  const root = createRoot(dom.window.document.body);
  root.render(
    <NextIntlClientProvider messages={messages}>
      <AssetProvider>
        <Wrapper />
      </AssetProvider>
    </NextIntlClientProvider>,
  );

  // Wait for initial fetch and subsequent symbol change.
  await new Promise((r) => setTimeout(r, 50));
  assert.ok(calls.some((u) => u.includes('AAPL')));
  await new Promise((r) => setTimeout(r, 100));
  assert.ok(calls.some((u) => u.includes('MSFT')));

  globalThis.fetch = originalFetch;
  // @ts-expect-error jsdom globals
  delete (globalThis as any).localStorage;
  root.unmount();
});

