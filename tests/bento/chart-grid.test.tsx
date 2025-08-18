import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ChartGrid } from '../../components/bento/ChartGrid';

// Ensure the grid renders the requested number of panes.
test('ChartGrid renders correct pane count', () => {
  const html = renderToString(
    <ChartGrid panes={4} asset={{ symbol: 'AAPL', timeframe: '1h', panes: 4, sync: false }} timeframe="1h" sync={false} />,
  );
  const count = html.match(/data-testid="chart-pane"/g)?.length ?? 0;
  assert.equal(count, 4);
});

