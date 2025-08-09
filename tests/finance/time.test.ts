import { test, expect } from '@playwright/test';
import { toUTCTimestamp, fromUTCTimestamp, isMarketOpen } from '../../lib/finance/time';

// Fixed date for determinism
const jan1 = new Date('2024-01-01T15:00:00Z'); // 10:00 in New York

test('round-trip timezone conversion', () => {
  const ts = toUTCTimestamp(jan1);
  const ny = fromUTCTimestamp(ts, 'America/New_York');
  expect(ny.getHours()).toBe(10);
});

test('market open detection', () => {
  const during = new Date('2024-06-03T14:00:00Z'); // Monday 10:00 NY
  const after = new Date('2024-06-03T23:00:00Z'); // Monday 19:00 NY
  const sunday = new Date('2024-06-02T15:00:00Z'); // Sunday
  expect(isMarketOpen(during, 'America/New_York')).toBe(true);
  expect(isMarketOpen(after, 'America/New_York')).toBe(false);
  expect(isMarketOpen(sunday, 'America/New_York')).toBe(false);
});
