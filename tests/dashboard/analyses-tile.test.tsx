import test from 'node:test';
import { strict as assert } from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AnalysisGroupList, type AnalysisSummary } from '../../components/dashboard/tiles/AnalysesTile';
import AnalysisList from '../../components/dashboard/tiles/AnalysisList';

test('AnalysisList formats relative dates and symbol', () => {
  const realNow = Date.now;
  Date.now = () => new Date('2024-01-02T00:00:00Z').getTime();
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
  const html = renderToStaticMarkup(
    <AnalysisList
      items={items}
      locale="en"
      emptyLabel="No analyses"
      labelledBy="t"
    />,
  );
  assert.match(html, /My analysis/);
  assert.match(html, /AAPL/);
  // Relative time should indicate a day difference ("yesterday").
  assert.match(html, /yesterday/);
  Date.now = realNow;
});

test('AnalysisGroupList renders empty state', () => {
  const html = renderToStaticMarkup(
    <AnalysisGroupList
      groups={[]}
      locale="en"
      emptyLabel="No analyses"
      labelledBy="t"
    />,
  );
  assert.match(html, /No analyses/);
});
