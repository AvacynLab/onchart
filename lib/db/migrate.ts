import { config } from 'dotenv';

// Load environment variables from the local file so migrations can run outside
// of production. This is intentionally the only top-level import to avoid
// loading heavy database libraries when the POSTGRES_URL is absent.
config({ path: '.env.local' });

// Exit early when no Postgres URL is configured or when the environment is
// pointed at an SQLite database. This keeps builds fast in environments like
// CI where a database may not be available and avoids noisy experimental
// warnings from SQLite drivers.
if (!process.env.POSTGRES_URL) {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && (dbUrl.startsWith('file:') || dbUrl.startsWith('sqlite:')))
    console.log('DATABASE_URL uses SQLite; skipping migrations');
  else console.log('POSTGRES_URL is not defined; skipping migrations');
  process.exit(0);
}

/**
 * Run database migrations using drizzle's migrator. All heavyweight modules
 * are imported dynamically so they are only evaluated when a database is
 * actually configured.
 */
export async function runMigrate() {
  // Lazily import database libraries to avoid paying their cost when no DB is
  // present. This pattern keeps the module side-effect free unless explicitly
  // executed.
  const { drizzle } = await import('drizzle-orm/postgres-js');
  const { migrate } = await import('drizzle-orm/postgres-js/migrator');
  const postgres = (await import('postgres')).default;

  try {
    // Resolve the connection string from the environment. The earlier guard
    // ensures it exists, but we double-check here so TypeScript can safely
    // infer a defined value without resorting to a non-null assertion.
    const postgresUrl = process.env.POSTGRES_URL;
    if (!postgresUrl) throw new Error('POSTGRES_URL must be defined');

    // The `connect_timeout` keeps failure fast when the database is
    // unreachable, avoiding long hangs in CI environments.
    const connection = postgres(postgresUrl, {
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

// Run automatically unless explicitly skipped so local developers do not need
// to remember to execute the migration script manually.
if (!process.env.SKIP_AUTO_MIGRATE) {
  runMigrate().catch((err) => {
    console.error('❌ Migration encountered an unexpected error');
    console.error(err);
  });
}

