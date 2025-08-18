import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mockRequestEnv } from './mock-env';

// Ensure the request loader returns namespaced messages without mocking them.
test('loads dashboard namespace with prices title', async () => {
  const restore = mockRequestEnv({ cookie: 'fr' });
  const { default: resolve } = await import(
    `../../i18n/request.ts?test=${Date.now()}`
  );
  const config = await resolve();
  assert.equal(config.messages.dashboard.prices.title, 'Cours actuels');
  restore();
});
