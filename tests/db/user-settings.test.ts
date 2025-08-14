import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'node:module';

// Stub `server-only` pour permettre l'import des helpers de base de données.
const originalLoad = (Module as any)._load;
(Module as any)._load = (request: string, parent: any, isMain: boolean) => {
  if (request === 'server-only') return {};
  return originalLoad(request, parent, isMain);
};

test('helpers user settings sans base de données', async () => {
  const original = process.env.POSTGRES_URL;
  delete process.env.POSTGRES_URL;
  const serverOnly = require.resolve('server-only');
  require.cache[serverOnly] = { exports: {} } as any;
  const queries = require('../../lib/db/queries');
  await queries.setUserPreferredLocale('user', 'en');
  const locale = await queries.getUserSettings('user');
  assert.equal(locale, null);
  if (original) process.env.POSTGRES_URL = original;
});

// Restaurer le loader original.
(Module as any)._load = originalLoad;
