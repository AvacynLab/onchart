import { test } from 'node:test';
import assert from 'node:assert/strict';
import { invalidateCache } from '../../../lib/finance/cache';

/**
 * Verify that SEC scrapers send a default user agent and honour the
 * `SEC_USER_AGENT` environment override for polite scraping.
 */
async function getUA(override?: string) {
  const original = process.env.SEC_USER_AGENT;
  if (override !== undefined) process.env.SEC_USER_AGENT = override;
  const { searchCompanyCIK } = await import(
    `../../../lib/finance/sources/sec.ts?${Math.random()}`
  );
  let ua: string | undefined;
  const fetchImpl = (async (_url: string, init?: RequestInit) => {
    ua = (init?.headers as any)?.['User-Agent'];
    return new Response(
      JSON.stringify({ '0': { cik_str: 1, ticker: 'TEST', title: 'Test' } }),
      { status: 200 },
    );
  }) as any;
  await searchCompanyCIK(override ? 'XYZ' : 'TEST', fetchImpl);
  process.env.SEC_USER_AGENT = original;
  invalidateCache('https://www.sec.gov/files/company_tickers.json');
  return ua;
}

test('uses default SEC user agent', async () => {
  const ua = await getUA();
  assert.equal(ua, 'onchart/1.0 (support@example.com)');
});

test('overrides SEC user agent via env', async () => {
  const ua = await getUA('custom-agent');
  assert.equal(ua, 'custom-agent');
});
