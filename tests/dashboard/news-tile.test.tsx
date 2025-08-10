import '../helpers/next-intl-stub';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { NewsList } from '../../components/dashboard/tiles/NewsTile';
import type { NewsItem } from '../../lib/finance/sources/news';

/**
 * Ensure the news tile correctly renders a provided item and sanitises summary.
 */
test('renders news items', () => {
  const items: NewsItem[] = [
    {
      title: 'Titre',
      link: 'https://example.com',
      pubDate: new Date().toISOString(),
      summary: '<b>Important</b> update',
    },
  ];
  const html = renderToString(
    <NewsList items={items} locale="fr" emptyLabel="" labelledBy="title" />,
  );
  assert.match(html, /Titre/);
  // Sanitiser removes HTML tags from the summary
  assert.doesNotMatch(html, /<b>/);
});

/**
 * Empty list should show a friendly placeholder.
 */
test('renders empty state', () => {
  const html = renderToString(
    <NewsList items={[]} locale="fr" emptyLabel="Aucune news disponible" labelledBy="title" />,
  );
  assert.match(html, /Aucune news disponible/);
});
