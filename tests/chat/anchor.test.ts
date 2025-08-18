import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAnchor, buildInitialInput, formatAnchor } from '@/lib/chat/anchor';

test('parseAnchor returns context for valid value', () => {
  const anchor = parseAnchor('AAPL,1h,1700000000000');
  assert.deepEqual(anchor, { symbol: 'AAPL', timeframe: '1h', timestamp: 1700000000000 });
});

test('parseAnchor returns null for malformed value', () => {
  assert.equal(parseAnchor('invalid'), null);
});

test('buildInitialInput prefixes formatted anchor', () => {
  const ctx = { symbol: 'BTC-USD', timeframe: '1m', timestamp: 1700000000000 };
  assert.equal(buildInitialInput(ctx), `${formatAnchor(ctx)} `);
});
