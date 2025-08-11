import test from 'node:test';
import { strict as assert } from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { IntlProvider } from 'next-intl';
import { PricesClient, type QuoteResult } from '../../components/dashboard/tiles/CurrentPricesTile';
import { DEFAULT_SYMBOLS } from '../../components/dashboard/tiles/CurrentPricesTile';
import { isCryptoSymbol } from '../../lib/finance/live';

/**
 * Ensure the default symbol list mixes equities and crypto assets so the tile
 * exercises both polling and websocket update paths.
 */
test('DEFAULT_SYMBOLS mixes equities and crypto', () => {
  assert(DEFAULT_SYMBOLS.some((s) => isCryptoSymbol(s)));
  assert(DEFAULT_SYMBOLS.some((s) => !isCryptoSymbol(s)));
});

/**
 * Render the client portion of the tile with seed quotes and verify the table
 * contains formatted price, percentage change, and market state label.
 */
test('PricesClient renders initial quotes with formatting', () => {
  const quotes: QuoteResult[] = [
    { symbol: 'AAPL', price: 123.45, changePercent: 1.23, marketState: 'REG' },
  ];
  const messages = {
    dashboard: {
      prices: {
        title: 'Prices',
        symbol: 'Symbol',
        price: 'Price',
        change: 'Change',
        state: { label: 'State', open: 'Open', closed: 'Closed' },
        empty: 'No prices',
      },
    },
  } as const;
  const html = renderToStaticMarkup(
    <IntlProvider locale="en" messages={messages} onError={() => undefined}>
      <PricesClient initialQuotes={quotes} />
    </IntlProvider>,
  );
  assert.match(html, /AAPL/);
  // Prices formatted to two decimals using locale-aware formatter.
  assert.match(html, /123\.45/);
  // Change percent also formatted with two decimals and a percent sign.
  assert.match(html, /1\.23%/);
  // Market state label sourced from translation messages.
  assert.match(html, /Open/);
});
