import test from 'node:test';
import { strict as assert } from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AssetProvider, useAsset } from '@/lib/asset/AssetContext';

/**
 * Helper component to expose context values during server-side rendering.
 */
function ReadAsset() {
  const { asset } = useAsset();
  return (
    <span>
      {asset.symbol}-{asset.timeframe}-{asset.panes}-{asset.sync ? '1' : '0'}
    </span>
  );
}

test('AssetProvider yields default asset state', () => {
  const html = renderToStaticMarkup(
    <AssetProvider>
      <ReadAsset />
    </AssetProvider>,
  );
  assert.match(html, /AAPL-1h-1-0/);
});
