import '../helpers/next-intl-stub';
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { AssetProvider } from '../../lib/asset/AssetContext';
import { NextIntlClientProvider } from 'next-intl';
import { ChartCard } from '../../components/bento/ChartCard';

// Chart card shows asset symbol and renders a grid with the current pane count.
test('ChartCard renders asset title and grid', () => {
  const messages = { dashboard: { bento: { split: 'Split', sync: 'Sync' } } };
  const html = renderToString(
    <NextIntlClientProvider messages={messages}>
      <AssetProvider>
        <ChartCard />
      </AssetProvider>
    </NextIntlClientProvider>,
  );
  assert.match(html, /AAPL/);
  const count = html.match(/data-testid="chart-pane"/g)?.length ?? 0;
  assert.equal(count, 1);
});

