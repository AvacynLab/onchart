import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import ListTileSkeleton from '../../components/dashboard/skeletons/ListTileSkeleton';

// The skeleton should render three list items as placeholders.
test('renders three placeholder lines', () => {
  const html = renderToString(<ListTileSkeleton title="Chargement" />);
  const count = (html.match(/<li/g) || []).length;
  assert.equal(count, 3);
});
