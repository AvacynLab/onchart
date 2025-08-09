import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import BentoGrid from '../../components/dashboard/BentoGrid';
import BentoCard from '../../components/dashboard/BentoCard';

/**
 * Basic server side rendering test ensuring the grid outputs children.
 */
test('renders children in the grid', () => {
  const html = renderToString(
    <BentoGrid>
      <BentoCard title="A">A</BentoCard>
      <BentoCard title="B">B</BentoCard>
    </BentoGrid>,
  );
  assert.ok(html.includes('A'));
  assert.ok(html.includes('B'));
});
