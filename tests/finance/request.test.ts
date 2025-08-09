import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchWithRetry } from '../../lib/finance/request';
import { DataSourceError } from '../../lib/finance/errors';

/**
 * Ensure fetchWithRetry retries with exponential backoff and eventually succeeds.
 */
test('fetchWithRetry retries then succeeds', async () => {
  const callTimes: number[] = [];
  const fetcher = async () => {
    callTimes.push(Date.now());
    if (callTimes.length < 3) {
      throw new DataSourceError('temporary failure');
    }
    return new Response('ok');
  };
  const start = Date.now();
  const res = await fetchWithRetry('http://example.com', {
    fetcher,
    retries: 2,
    timeoutMs: 50,
    backoffMs: 10,
  });
  const elapsed = Date.now() - start;
  assert.equal(await res.text(), 'ok');
  assert.equal(callTimes.length, 3);
  // Should wait at least 10ms + 20ms between retries
  assert.ok(elapsed >= 30);
});

/**
 * Ensure fetchWithRetry throws after exhausting retries.
 */
test('fetchWithRetry throws after retries exhausted', async () => {
  const fetcher = async () => {
    throw new Error('boom');
  };
  await assert.rejects(
    () => fetchWithRetry('http://example.com', {
      fetcher,
      retries: 1,
      timeoutMs: 20,
      backoffMs: 5,
    }),
    /boom/,
  );
});
