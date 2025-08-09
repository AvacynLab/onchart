import { test, expect } from '@playwright/test';
import { fetchDailyStooq } from '../../lib/finance/sources/stooq';

test('fetchDailyStooq returns daily candles', async () => {
  const data = await fetchDailyStooq('AAPL');
  expect(data.length).toBeGreaterThan(0);
  const c = data[0];
  expect(typeof c.open).toBe('number');
  expect(typeof c.time).toBe('number');
});
