import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import ResearchList from '../../components/finance/research/ResearchList';

const docs = [
  {
    id: '1',
    title: 'Doc One',
    kind: 'general',
    updatedAt: new Date('2024-01-01').toISOString(),
  },
  {
    id: '2',
    title: 'Doc Two',
    kind: 'opportunity',
    updatedAt: new Date('2024-01-02').toISOString(),
  },
];

test('renders a list item for each document', () => {
  const html = renderToString(
    React.createElement(ResearchList, { documents: docs }),
  );
  const count = (html.match(/<li/g) || []).length;
  assert.equal(count, docs.length);
});
