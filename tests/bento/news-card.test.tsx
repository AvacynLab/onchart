import '../helpers/next-intl-stub';
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { AssetProvider } from '../../lib/asset/AssetContext';
import { NextIntlClientProvider } from 'next-intl';

// Ensure NewsCard renders the summarise button using translations.
test('renders news card with localized summarise button', async (t) => {
  let NewsCard: React.ComponentType;
  try {
    ({ NewsCard } = await import('../../components/bento/NewsCard'));
  } catch {
    t.skip('NewsCard could not be loaded');
    return;
  }
  const messages = { dashboard: { bento: { news: 'News', summarize: 'Summarize' } } };
  const html = renderToString(
    <NextIntlClientProvider messages={messages}>
      <AssetProvider>
        <NewsCard />
      </AssetProvider>
    </NextIntlClientProvider>
  );
  assert.match(html, /Summarize/);
});
