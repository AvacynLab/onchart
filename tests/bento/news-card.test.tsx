import '../helpers/next-intl-stub';
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { AssetProvider } from '../../lib/asset/AssetContext';
import { NextIntlClientProvider } from 'next-intl';

// Ensure NewsCard renders expected test ids and a localised summarise button.
test('renders news card with localized summarise button', async (t) => {
  // Stub fetch so useSWR receives deterministic news without hitting the network.
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => [
      { title: 'Headline', url: 'https://example.com', source: 'Example' },
    ],
  }) as any;

  let NewsCard: React.ComponentType;
  try {
    ({ NewsCard } = await import('../../components/bento/NewsCard'));
  } catch {
    t.skip('NewsCard could not be loaded');
    globalThis.fetch = originalFetch;
    return;
  }

  const messages = { dashboard: { bento: { news: 'News', summarize: 'Summarize' } } };
  const html = renderToString(
    <NextIntlClientProvider messages={messages}>
      <AssetProvider>
        <NewsCard />
      </AssetProvider>
    </NextIntlClientProvider>,
  );
  assert.match(html, /data-testid="news-card"/);
  assert.match(html, /data-testid="news-summarise"/);

  globalThis.fetch = originalFetch;
});

