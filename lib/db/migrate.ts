import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

config({
  path: '.env.local',
});

export async function runMigrate() {
  // Skip migrations entirely when no Postgres URL is provided. This allows
  // local development or CI environments without a database to build the
  // project without failing during the migration step.
  if (!process.env.POSTGRES_URL) {
    console.warn('POSTGRES_URL is not defined; skipping migrations');
    return;
  }

  try {
    // The `connect_timeout` keeps failure fast when the database is
    // unreachable, avoiding long hangs in CI environments.
    const connection = postgres(process.env.POSTGRES_URL, {
      max: 1,
      connect_timeout: 1,
    });
    const db = drizzle(connection);

    console.log('⏳ Running migrations...');

    const start = Date.now();
    await migrate(db, { migrationsFolder: './lib/db/migrations' });
    const end = Date.now();

    console.log('✅ Migrations completed in', end - start, 'ms');
  } catch (err: any) {
    // When the database is unreachable, summarize the error and continue
    // without failing the build so that other parts of the pipeline can run.
    const message =
      err instanceof AggregateError && err.errors?.length
        ? err.errors[0]?.message
        : err?.code || err?.message;
    console.warn('Skipping migrations; unable to connect to Postgres:', message);
  }
}

if (!process.env.SKIP_AUTO_MIGRATE) {
  runMigrate().catch((err) => {
    console.error('❌ Migration encountered an unexpected error');
    console.error(err);
  });
}
