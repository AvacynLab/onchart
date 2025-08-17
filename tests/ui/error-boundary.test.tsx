import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';
import React from 'react';

import GlobalError from '../../app/error';

// Rendering the global error boundary should include the error message and stack
// so failures are visible in CI logs.
test('renders stack trace in error boundary', () => {
  const err = new Error('boom');
  const html = renderToString(
    <GlobalError error={err} reset={() => { /* noop */ }} />
  );
  assert.ok(html.includes('boom'));
  // Extract the contents of the stack trace <pre> block and ensure it includes
  // a frame ("at ...") so stack traces remain visible in CI logs.
  const stackMatch = html.match(/data-testid="error-stack">([\s\S]+?)<\/pre>/);
  assert.ok(stackMatch?.[1].includes('at'));
});
