import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import StrategyCard from '../../components/finance/StrategyCard';
import type { Strategy } from '../../lib/db/schema';

/**
 * Ensure the strategy card exposes French status labels for persisted codes.
 */
test('renders localized status', () => {
  const strategy: Strategy = {
    id: 's1',
    userId: 'u1',
    chatId: 'c1',
    title: 'Ma stratégie',
    universe: {},
    constraints: {},
    status: 'validated',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const html = renderToString(<StrategyCard strategy={strategy} />);
  assert.match(html, /Validée/);
});
