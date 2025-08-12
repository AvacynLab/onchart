import test from 'node:test';
import { strict as assert } from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ListTileEmpty from '../../components/dashboard/empty/ListTileEmpty';

// Ensure the empty state exposes status role and polite live region
// so screen readers announce updates when a tile has no content.
test('ListTileEmpty uses status role for accessibility', () => {
  const html = renderToStaticMarkup(<ListTileEmpty>Nothing here</ListTileEmpty>);
  assert.match(html, /role="status"/);
  assert.match(html, /aria-live="polite"/);
});
