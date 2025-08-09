import { test, expect } from '@playwright/test';
import { fetchKlinesBinance } from '../../lib/finance/sources/binance';

test('fetchKlinesBinance returns klines', async () => {
  const data = await fetchKlinesBinance('BTCUSDT', '1h', 10);
  expect(data.length).toBeGreaterThan(0);
  const c = data[0];
  expect(typeof c.close).toBe('number');
  expect(typeof c.time).toBe('number');
});
