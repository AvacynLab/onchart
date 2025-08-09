import { test, expect } from '@playwright/test';
import { setCache, getCache } from '../../lib/finance/cache';

/**
 * Verify that the in-memory cache stores values until the TTL expires
 * and then evicts them automatically.
 */
test('stores and retrieves value within ttl', () => {
  setCache('foo', 42, 1000); // 1s TTL
  expect(getCache<number>('foo')).toBe(42);
});

test('expires value after ttl', async () => {
  setCache('bar', 7, 10); // 10ms TTL
  await new Promise((r) => setTimeout(r, 20));
  expect(getCache('bar')).toBeUndefined();
});
