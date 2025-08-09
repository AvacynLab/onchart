import { test, expect } from '@playwright/test';
import { cachedJsonFetch } from '../../lib/finance/cache';
import { rateLimit } from '../../lib/finance/rate-limit';
import {
  DataSourceError,
  ParseError,
  RateLimitedError,
} from '../../lib/finance/errors';

// Mock fetch to simulate non-OK response
// and ensure DataSourceError is thrown

// Using test.step? But simpler: define inside test.

test('cachedJsonFetch throws DataSourceError on bad status', async () => {
  const original = global.fetch;
  // Simulate HTTP 500 response
  global.fetch = async () =>
    ({
      ok: false,
      status: 500,
      statusText: 'Internal',
      json: async () => ({}),
    } as any);
  await expect(cachedJsonFetch('http://example', 1000)).rejects.toBeInstanceOf(
    DataSourceError,
  );
  global.fetch = original;
});

// Test JSON parsing failure -> ParseError

test('cachedJsonFetch throws ParseError on invalid JSON', async () => {
  const original = global.fetch;
  global.fetch = async () =>
    ({
      ok: true,
      json: async () => {
        throw new Error('bad json');
      },
    } as any);
  await expect(cachedJsonFetch('http://example', 1000)).rejects.toBeInstanceOf(
    ParseError,
  );
  global.fetch = original;
});

// Rate limiter should error after timeout if tokens unavailable

test('rateLimit throws RateLimitedError after timeout', async () => {
  // Consume the only token
  await rateLimit('test', { capacity: 1, refillRate: 1, intervalMs: 1000 });
  await expect(
    rateLimit('test', {
      capacity: 1,
      refillRate: 1,
      intervalMs: 1000,
      timeoutMs: 20,
    }),
  ).rejects.toBeInstanceOf(RateLimitedError);
});
