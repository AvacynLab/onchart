import test from 'node:test';
import { strict as assert } from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { IntlProvider } from 'next-intl';
import AnalysesTileClient from '../../components/dashboard/tiles/AnalysesTileClient';
import type { AnalysisSummary } from '../../components/dashboard/tiles/AnalysesTile';

test('AnalysesClient renders filter controls', () => {
  const items: AnalysisSummary[] = [
    {
      id: 'a1',
      chatId: 'c1',
      title: 'My analysis',
      type: 'analysis',
      date: new Date('2024-01-01T00:00:00Z'),
      symbol: 'AAPL',
    },
  ];
  const messages = {
    dashboard: {
      analyses: {
        filters: {
          typeLabel: 'Type',
          symbolLabel: 'Symbol',
          symbol: 'Symbol',
          allTypes: 'All types',
        },
        empty: 'No analyses',
      },
    },
  };
  const html = renderToStaticMarkup(
    <IntlProvider locale="en" messages={messages} now={new Date('2024-01-02T00:00:00Z')} timeZone="UTC">
      <AnalysesTileClient items={items} titleId="t" />
    </IntlProvider>,
  );
  // Should render a select for type filtering and an input for symbol filtering
  assert.match(html, /<select/);
  assert.match(html, /<input/);
});
