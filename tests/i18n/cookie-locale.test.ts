import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mockRequestEnv } from './mock-env';

// When a `lang` cookie is present it takes precedence over other sources.
test('uses cookie locale', async () => {
  const restore = mockRequestEnv({ cookie: 'en' });
  const { default: resolve } = await import(`../../i18n/request.ts?test=${Date.now()}`);
  const config = await resolve();
  assert.equal(config.locale, 'en');
  // Ensure message bundles for the active locale are loaded.
  assert.equal(config.messages.dashboard.prices.title, 'Current prices');
  restore();
});
