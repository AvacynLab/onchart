import { test } from 'node:test';
import assert from 'node:assert/strict';
import useMarketSocket from '../useMarketSocket';

test('exports useMarketSocket hook', () => {
  assert.equal(typeof useMarketSocket, 'function');
});

