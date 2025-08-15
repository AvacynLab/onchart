import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'module';

// Mock the `server-only` module imported by `lib/db/queries` so the file can be
// evaluated in a test environment without Next.js server components.
const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === 'server-only') return {};
  return originalLoad(request, parent, isMain);
};

// The user settings helpers should resolve gracefully when no database
// connection is available. In this scenario both functions are no-ops and
// return null rather than throwing.
test('get and set user preferred locale without Postgres', async () => {
  delete process.env.POSTGRES_URL;
  const { getUserSettings, setUserPreferredLocale } = await import(`../../lib/db/queries.ts?test=${Date.now()}`);
  await assert.doesNotReject(() => setUserPreferredLocale('u1', 'en'));
  const locale = await getUserSettings('u1');
  assert.equal(locale, null);
  (Module as any)._load = originalLoad;
});
