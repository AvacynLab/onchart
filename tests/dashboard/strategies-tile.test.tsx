import '../helpers/next-intl-stub';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  StrategyList,
  StrategyGroupList,
  fetchStrategies,
  type StrategyGroup,
} from '../../components/dashboard/tiles/StrategiesTile';
import type { Strategy } from '../../lib/db/schema';
import { IntlProvider } from 'next-intl';

const messages = {
  dashboard: { strategies: { empty: 'Aucune stratégie enregistrée' } },
  finance: { strategy: { status: { draft: 'Ébauche' } } },
};

/**
 * Ensure the strategies tile renders provided items.
 */
test('renders strategies list', () => {
  const items: Strategy[] = [
    {
      id: 's1',
      userId: 'u1',
      chatId: 'c1',
      title: 'Ma stratégie',
      universe: {},
      constraints: {},
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  const html = renderToString(
    <IntlProvider locale="fr" messages={messages}>
      <StrategyList items={items} labelledBy="title" />
    </IntlProvider>,
  );
  assert.match(html, /Ma stratégie/);
});

/**
 * Empty list should show guidance.
 */
test('renders empty state', () => {
  const html = renderToString(
    <IntlProvider locale="fr" messages={messages}>
      <StrategyList items={[]} labelledBy="title" />
    </IntlProvider>,
  );
  assert.match(html, /Aucune stratégie enregistrée/);
});

/**
 * Group list should render chat headers and last message context.
 */
test('renders grouped strategies', () => {
  const groups: StrategyGroup[] = [
    {
      chatId: 'c1',
      chatTitle: 'Chat A',
      lastMessage: 'Bonjour',
      items: [
        {
          id: 's1',
          userId: 'u1',
          chatId: 'c1',
          title: 'Ma stratégie',
          universe: {},
          constraints: {},
          status: 'draft',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    },
  ];
  const html = renderToString(
    <IntlProvider locale="fr" messages={messages}>
      <StrategyGroupList groups={groups} labelledBy="title" />
    </IntlProvider>,
  );
  assert.match(html, /Chat A/);
  assert.match(html, /Bonjour/);
  assert.match(html, /Ma stratégie/);
});

/**
 * Ensure fetchStrategies appends cursor when provided.
 */
test('fetchStrategies with cursor', async () => {
  let url = '';
  // @ts-ignore override global fetch
  global.fetch = async (input: RequestInfo) => {
    url = typeof input === 'string' ? input : input.url;
    return new Response(
      JSON.stringify({ items: [], nextCursor: null }),
      { status: 200 },
    );
  };
  await fetchStrategies('c1', '2023-01-01T00:00:00.000Z');
  assert.ok(url.includes('cursor=2023-01-01T00%3A00%3A00.000Z'));
});
