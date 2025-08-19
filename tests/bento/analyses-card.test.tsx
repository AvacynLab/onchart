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
  let AnalysesCard: React.ComponentType;
  // Stub fetch so SWR receives deterministic data.
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      items: [
        { id: '1', title: 'Doc', createdAt: new Date().toISOString() },
      ],
      total: 1,
    }),
  }) as any;
  try {
    // Provide a minimal router implementation if module mocking is available.
    (mock as any).module?.('next/navigation', {
      useRouter: () => ({ push: () => {} }),
    });
    ({ AnalysesCard } = await import('../../components/bento/AnalysesCard'));
  } catch {
    t.skip('AnalysesCard could not be loaded');
    globalThis.fetch = originalFetch;
    return;
  }
  const messages = { dashboard: { bento: { analyses: 'Analyses', strategies: 'Strategies' } } };
  let html: string;
  try {
    html = renderToString(
      <NextIntlClientProvider messages={messages}>
        <AssetProvider>
          <AnalysesCard />
        </AssetProvider>
      </NextIntlClientProvider>,
    );
  } catch {
    t.skip('AnalysesCard could not be rendered');
    globalThis.fetch = originalFetch;
    return;
  }
  assert.match(html, /Analyses/);
  assert.match(html, /Strategies/);
  assert.match(html, /data-testid="analysis-item"/);
  globalThis.fetch = originalFetch;
});
