import { test, expect } from '@playwright/test';
import { rateLimit } from '../../lib/finance/rate-limit';
import { RateLimitedError } from '../../lib/finance/errors';

/**
 * Ensure the token bucket refills after the interval and enforces timeouts
 * when no tokens are available.
 */
test('refills tokens after interval', async () => {
  const opts = { capacity: 1, refillRate: 1, intervalMs: 50, timeoutMs: 200 };
  const start = Date.now();
  await rateLimit('example.com', opts); // consume first token
  await rateLimit('example.com', opts); // waits ~50ms for refill
  const elapsed = Date.now() - start;
  expect(elapsed).toBeGreaterThanOrEqual(50);
});

test('throws after timeout when bucket empty', async () => {
  const opts = { capacity: 1, refillRate: 0, intervalMs: 1000, timeoutMs: 100 };
  await rateLimit('limited.com', opts);
  await expect(rateLimit('limited.com', opts)).rejects.toBeInstanceOf(RateLimitedError);
});
