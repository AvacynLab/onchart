import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import ResearchDoc, {
  ResearchSection,
} from '../../components/finance/research/ResearchDoc';

const sections: ResearchSection[] = [
  { id: 'summary', content: 'A short blurb' },
  { id: 'market-context', content: 'Context' },
  { id: 'data', content: 'Numbers' },
  { id: 'charts', content: 'Chart refs' },
  { id: 'signals', content: 'Signals' },
  { id: 'risks', content: 'Risks' },
  { id: 'sources', content: 'Links' },
];

test('renders all canonical sections when provided', () => {
  const html = renderToString(
    React.createElement(ResearchDoc, { title: 'Doc', sections }),
  );
  const labels = [
    'Summary',
    'Market Context',
    'Data',
    'Charts',
    'Signals',
    'Risks',
    'Sources',
  ];
  for (const label of labels) {
    assert.ok(html.includes(label));
  }
});
