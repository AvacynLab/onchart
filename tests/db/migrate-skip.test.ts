import { test } from 'node:test';
import assert from 'node:assert/strict';

// Ensure migrations resolve gracefully when the database is unreachable. We
// set an invalid POSTGRES_URL and disable the automatic migration so the test
// can invoke the function directly.
test('runMigrate resolves without Postgres', async () => {
  process.env.SKIP_AUTO_MIGRATE = 'true';
  process.env.POSTGRES_URL = 'postgres://user:pass@203.0.113.1:5432/db';

  const { runMigrate } = await import('../../lib/db/migrate');
  await assert.doesNotReject(runMigrate());
});
