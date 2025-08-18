import '../helpers/next-intl-stub';
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { AssetProvider } from '../../lib/asset/AssetContext';
import { NextIntlClientProvider } from 'next-intl';

// Ensure the analyses card renders both tabs with provided translations.
test('renders analyses and strategies tabs', async (t) => {
  // Dynamically import the component so the test can be skipped if optional
  // dependencies like lightweight-charts are unavailable in the environment.
  let AnalysesCard;
  try {
    // Provide a minimal router implementation for components using useRouter.
    mock.module('next/navigation', {
      useRouter: () => ({ push: () => {} }),
    });
    ({ AnalysesCard } = await import('../../components/bento/AnalysesCard'));
  } catch {
    t.skip('AnalysesCard could not be loaded');
    return;
  }
  const messages = { dashboard: { bento: { analyses: 'Analyses', strategies: 'Strategies' } } };
  const html = renderToString(
    <NextIntlClientProvider messages={messages}>
      <AssetProvider>
        <AnalysesCard />
      </AssetProvider>
    </NextIntlClientProvider>,
  );
  assert.match(html, /Analyses/);
  assert.match(html, /Strategies/);
});
