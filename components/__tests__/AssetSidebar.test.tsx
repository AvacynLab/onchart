import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import AssetSidebar from '../AssetSidebar';

// Basic render test ensures the component can be server-side rendered and
// displays the expected tab labels.
test('renders asset sidebar with all tabs', () => {
  const html = renderToString(<AssetSidebar symbol="AAPL" />);
  for (const label of ['Overview', 'Fundamentals', 'Sentiment', 'News']) {
    assert.ok(html.includes(label));
  }
});
