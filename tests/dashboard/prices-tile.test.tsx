import '../helpers/next-intl-stub';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { PricesClient } from '../../components/dashboard/tiles/CurrentPricesTile';
import { IntlProvider } from 'next-intl';

const messages = {
  dashboard: {
    prices: {
      title: 'Cours actuels',
      symbol: 'Symbole',
      price: 'Prix',
      change: 'Var. %',
      state: { label: 'État', open: 'Ouvert', closed: 'Fermé' },
      empty: 'Aucun cours à afficher',
    },
  },
};

/** Ensure the prices tile renders a table row for each provided quote. */
test('renders provided quotes', () => {
  const html = renderToString(
    <IntlProvider locale="fr" messages={messages}>
      <PricesClient
        initialQuotes={[
          {
            symbol: 'AAPL',
            price: 123.45,
            change: 0.5,
            changePercent: 0.4,
            marketState: 'REG',
          },
        ]}
      />
    </IntlProvider>,
  );
  assert.match(html, /AAPL/);
  assert.match(html, /123[,.]45/);
});

/** Empty quote list should render placeholder text. */
test('renders empty state', () => {
  const html = renderToString(
    <IntlProvider locale="fr" messages={messages}>
      <PricesClient initialQuotes={[]} />
    </IntlProvider>,
  );
  assert.match(html, /Aucun cours à afficher/);
});
