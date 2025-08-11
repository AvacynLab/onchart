import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'module';

// Stub out `server-only` so database helpers can be imported in this test
// environment without triggering Next.js runtime guards.
const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === 'server-only') return {};
  return originalLoad(request, parent, isMain);
};

// Ensure createGuestUser returns a synthetic user when no Postgres URL is
// configured, allowing authentication flows to proceed in environments without
// a database.
test('createGuestUser falls back to synthetic user without Postgres', async () => {
  const original = process.env.POSTGRES_URL;
  delete process.env.POSTGRES_URL;
  const serverOnly = require.resolve('server-only');
  require.cache[serverOnly] = { exports: {} } as any;
  const queries = require('../../../lib/db/queries');
  const users = await queries.createGuestUser();
  assert.equal(users.length, 1);
  assert.match(users[0].email, /^guest-/);
  assert.ok(users[0].id);
  if (original) process.env.POSTGRES_URL = original;
});

// Restore original loader after test execution.
(Module as any)._load = originalLoad;
