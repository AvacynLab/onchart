import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import ListTileSkeleton from '../../components/dashboard/skeletons/ListTileSkeleton';
import NewsTileSkeleton from '../../components/dashboard/skeletons/NewsTileSkeleton';

// The skeleton should render three list items as placeholders.
test('renders three placeholder lines', () => {
  const html = renderToString(<ListTileSkeleton title="Chargement" />);
  const count = (html.match(/<li/g) || []).length;
  assert.equal(count, 3);
});

/**
 * NewsTileSkeleton should resolve its title via `next-intl` which is stubbed in
 * tests to return the translation key. This ensures loading fallbacks are
 * locale-aware instead of hard-coded French strings.
 */
test('NewsTileSkeleton uses translation key', async () => {
  const element = await NewsTileSkeleton();
  const html = renderToString(element);
  assert.match(html, /news\.title/, 'expected translated title');
});
