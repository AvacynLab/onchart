import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  marketTick,
  candle,
  fundamentals,
  newsSentiment,
  watchlist,
} from '../schema';

// Ensure financial tables are exported correctly

test('financial tables are defined', () => {
  assert.ok(marketTick, 'marketTick table should be defined');
  assert.ok(candle, 'candle table should be defined');
  assert.ok(fundamentals, 'fundamentals table should be defined');
  assert.ok(newsSentiment, 'newsSentiment table should be defined');
  assert.ok(watchlist, 'watchlist table should be defined');
});
