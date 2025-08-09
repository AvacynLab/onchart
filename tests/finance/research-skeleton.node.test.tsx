import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import ResearchSkeleton from '../../components/finance/research/ResearchSkeleton';

// The skeleton should render a fixed number of placeholder lines.
test('renders five placeholder lines', () => {
  const html = renderToString(React.createElement(ResearchSkeleton));
  const count = (html.match(/aria-hidden="true"/g) || []).length;
  assert.equal(count, 5);
});

