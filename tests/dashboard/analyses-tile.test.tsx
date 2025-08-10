import '../helpers/next-intl-stub';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  AnalysisList,
  type AnalysisSummary,
  AnalysisGroupList,
  type AnalysisGroup,
} from '../../components/dashboard/tiles/AnalysesTile';

/**
 * Ensure the analyses tile renders items and handles empty states.
 */
test('renders analysis summaries', () => {
  const items: AnalysisSummary[] = [
    {
      id: '1',
      chatId: 'c1',
      title: 'Analyse AAPL',
      type: 'ohlc',
      date: new Date('2023-01-01'),
      symbol: 'AAPL',
    },
  ];
  const html = renderToString(
    <AnalysisList
      items={items}
      locale="fr"
      emptyLabel="Aucune analyse enregistrée"
      labelledBy="title"
    />,
  );
  assert.match(html, /Analyse AAPL/);
  assert.match(html, /ohlc/);
});

/**
 * Empty list should display placeholder text.
 */
test('renders empty state', () => {
  const html = renderToString(
    <AnalysisList items={[]} locale="fr" emptyLabel="Aucune analyse enregistrée" labelledBy="title" />,
  );
  assert.match(html, /Aucune analyse enregistrée/);
});

/**
 * Group list should include chat title and last message snippet.
 */
test('renders grouped analyses', () => {
  const groups: AnalysisGroup[] = [
    {
      chatId: 'c1',
      chatTitle: 'Chat A',
      lastMessage: 'Dernier message',
      items: [
        {
          id: '1',
          chatId: 'c1',
          title: 'Analyse AAPL',
          type: 'ohlc',
          date: new Date('2023-01-01'),
        },
      ],
    },
  ];
  const html = renderToString(
    <AnalysisGroupList
      groups={groups}
      locale="fr"
      emptyLabel="Aucune analyse enregistrée"
      labelledBy="title"
    />,
  );
  assert.match(html, /Chat A/);
  assert.match(html, /Dernier message/);
  assert.match(html, /Analyse AAPL/);
});
