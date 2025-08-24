import test from 'node:test';
import assert from 'node:assert/strict';

import { hasEntitlement } from '../../lib/ai/entitlements';

// Ensure the pro tier unlocks advanced features.
test('pro plan grants export capability', () => {
  assert.equal(hasEntitlement('pro', 'export-csv'), true);
});

// The free tier should not have access to backtesting.
test('free plan lacks strategy backtests', () => {
  assert.equal(hasEntitlement('free', 'strategy-backtests'), false);
});

// Enterprise includes all features by wildcard.
test('enterprise plan allows any feature', () => {
  assert.ok(hasEntitlement('enterprise', 'anything'));
});
