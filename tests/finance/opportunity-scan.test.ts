import { test, expect } from '@playwright/test';
import { opportunityScan } from '../../lib/finance/strategies';

test('opportunity scan flags symbols with relevant signals', () => {
  const data = {
    VOL: [1, 2, 0.5, 3, 0.2],
    BB: [1, 1, 1, 1, 1, 1.5],
    MA: [1, 1, 1, 1, 1, 2],
  };
  const res = opportunityScan(data, {
    volThreshold: 0.2,
    maShort: 2,
    maLong: 5,
    bbPeriod: 5,
  });
  const map: Record<string, string[]> = Object.fromEntries(
    res.map((r) => [r.symbol, r.reasons]),
  );
  expect(map.VOL).toContain('volatility');
  expect(map.BB).toContain('breakout_bb');
  expect(map.MA).toContain('ma_crossover');
});
