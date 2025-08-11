export const isProductionEnvironment = process.env.NODE_ENV === 'production';
export const isDevelopmentEnvironment = process.env.NODE_ENV === 'development';
export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT,
);

export const guestRegex = /^guest-\d+$/;

/**
 * Precomputed bcrypt hash for the guest user's placeholder password. Using a
 * static value avoids bundling the heavy `bcrypt-ts` library into edge
 * runtimes while still providing a realistic hash for downstream checks.
 */
export const DUMMY_PASSWORD =
  '$2a$10$kB9zKzcSULPgbIXBacEbA.W7x4bsmwqhy7rFc18F97LDw9aDvvB7W';
