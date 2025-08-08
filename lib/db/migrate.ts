import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { pathToFileURL } from 'node:url';

config({
  path: '.env.local',
});

/**
 * Execute pending database migrations using Drizzle's migrator.
 *
 * The function expects `POSTGRES_URL` to be defined and will run all SQL files
 * located under `./lib/db/migrations`.
 */
export async function runMigrate(
  deps: {
    postgres?: typeof postgres;
    drizzle?: typeof drizzle;
    migrate?: typeof migrate;
  } = {},
) {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not defined');
  }

  const pg = deps.postgres ?? postgres;
  const drizzleFn = deps.drizzle ?? drizzle;
  const migrateFn = deps.migrate ?? migrate;

  const connection = pg(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzleFn(connection);

  console.log('⏳ Running migrations...');

  const start = Date.now();
  await migrateFn(db, { migrationsFolder: './lib/db/migrations' });
  const end = Date.now();

  console.log('✅ Migrations completed in', end - start, 'ms');
}

// Allow this file to be executed directly as a script while still exposing the
// `runMigrate` function for unit tests.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  runMigrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Migration failed');
      console.error(err);
      process.exit(1);
    });
}
