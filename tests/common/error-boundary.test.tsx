import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';

// Verify that the error boundary renders the fallback UI when a child throws.
test('renders fallback on error', () => {
  const Boom = () => {
    throw new Error('boom');
  };

  const html = renderToString(
    <ErrorBoundary>
      <Boom />
    </ErrorBoundary>,
  );

  assert.match(html, /data-testid="ui-error"/);
});

