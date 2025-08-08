import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { runMigrate } from '../migrate.ts';

/**
 * Ensure that the migration helper executes Drizzle's migrator with the
 * expected folder. External connections are mocked to avoid touching a real DB.
 */
test('runMigrate executes migrations from the migration folder', async () => {
  const migrate = mock.fn(async () => {});
  const drizzle = mock.fn(() => ({}));
  const postgres = mock.fn(() => ({}));

  process.env.POSTGRES_URL = 'postgres://user:pass@localhost:5432/db';

  await runMigrate({ migrate, drizzle, postgres });

  assert.strictEqual(migrate.mock.callCount(), 1);
  const [, options] = migrate.mock.calls[0].arguments;
  assert.deepEqual(options, { migrationsFolder: './lib/db/migrations' });
});
