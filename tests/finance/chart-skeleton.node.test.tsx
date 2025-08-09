import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import ChartSkeleton from '../../components/finance/ChartSkeleton';

// The skeleton should expose a status role so screen readers can announce
// ongoing loading state to users.
test('renders a status role for chart loading', () => {
  const html = renderToString(React.createElement(ChartSkeleton));
  assert.match(html, /role="status"/);
});

