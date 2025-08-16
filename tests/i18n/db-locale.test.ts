import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mockRequestEnv } from './mock-env';

// A stored user preference should override cookies and headers.
test('database locale overrides cookie and header', async () => {
  const restore = mockRequestEnv({ accept: 'fr-FR,fr;q=0.8', dbLocale: 'en', session: true });
  const { default: resolve } = await import(`../../i18n/request.ts?test=${Date.now()}`);
  const config = await resolve();
  assert.equal(config.locale, 'en');
  assert.equal(config.messages.dashboard.prices.title, 'Current prices');
  restore();
});
