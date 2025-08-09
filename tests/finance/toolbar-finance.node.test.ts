import { test } from 'node:test';
import assert from 'node:assert/strict';
import { financeToolbarItems } from '../../components/finance/toolbar-items';

test('finance toolbar exposes preset actions', () => {
  const descriptions = financeToolbarItems.map((i) => i.description);
  assert.deepEqual(descriptions, [
    'Afficher AAPL 1D',
    'Scanner opportunités FX',
  ]);
});

