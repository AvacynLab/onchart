import test from 'node:test';
import { strict as assert } from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { IntlProvider } from 'next-intl';
import { fetchStrategies, StrategyGroupList, type StrategyGroup } from '../../components/dashboard/tiles/StrategiesTile';

test('fetchStrategies returns empty page when chatId missing', async () => {
  const page = await fetchStrategies();
  assert.equal(page.items.length, 0);
  assert.equal(page.nextCursor, null);
});

const messages = {
  dashboard: { strategies: { empty: 'No strategies' } },
  finance: {
    strategy: {
      status: { draft: 'Draft' },
      actions: { backtest: 'Backtest', refine: 'Refine' },
    },
  },
};

test('StrategyGroupList renders link and status', () => {
  const realNow = Date.now;
  Date.now = () => new Date('2024-01-02T00:00:00Z').getTime();
  const group: StrategyGroup = {
    chatId: 'c1',
    chatTitle: 'Chat 1',
    items: [
      {
        id: 's1',
        userId: 'u1',
        chatId: 'c1',
        title: 'Mean Reversion',
        universe: {},
        constraints: {},
        status: 'draft',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      } as any,
    ],
  };
  const html = renderToStaticMarkup(
    <IntlProvider
      locale="en"
      messages={messages}
      now={new Date('2024-01-02T00:00:00Z')}
      timeZone="UTC"
    >
      <StrategyGroupList groups={[group]} labelledBy="t" />
    </IntlProvider>,
  );
  assert.match(html, /Mean Reversion/);
  assert.match(html, /Draft/);
  assert.match(html, /\/chat\/c1/);
  Date.now = realNow;
});
