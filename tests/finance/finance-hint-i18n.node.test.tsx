import '../helpers/next-intl-stub';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import FinanceHint from '../../components/finance/FinanceHint';
import { NextIntlClientProvider } from 'next-intl';

// Helper to render the component with given messages and return text content.
function renderWithMessages(messages: any) {
  return renderToString(
    React.createElement(
      NextIntlClientProvider,
      { locale: 'en', messages },
      React.createElement(FinanceHint, { subscribe: () => () => {} }),
    ),
  );
}

test('finance hint displays translated message', () => {
  const enText = renderWithMessages({ chat: { financeHint: 'Ask for a chart' } });
  assert.match(enText, /Ask for a chart/);

  const frText = renderWithMessages({ chat: { financeHint: 'Demandez un graphique' } });
  assert.match(frText, /Demandez un graphique/);
});
