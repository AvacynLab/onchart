import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mockRequestEnv } from './mock-env';

// When no cookie is provided, the first supported language from the
// Accept-Language header becomes active.
test('falls back to Accept-Language', async () => {
  const restore = mockRequestEnv({ accept: 'en-US,en;q=0.9' });
  const { default: resolve } = await import(`../../i18n/request.ts?test=${Date.now()}`);
  const config = await resolve();
  assert.equal(config.locale, 'en');
  assert.equal(config.messages.dashboard.prices.title, 'Current prices');
  restore();
});
