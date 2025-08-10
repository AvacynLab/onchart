import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getFinanceToolbarItems } from '../../components/finance/toolbar-items';
import frFinance from '../../messages/fr/finance.json' assert { type: 'json' };

test('finance toolbar exposes preset actions', () => {
  const t = (path: string) =>
    path.split('.').reduce((acc: any, key) => acc[key], frFinance as any);
  const descriptions = getFinanceToolbarItems(t).map((i) => i.description);
  assert.deepEqual(descriptions, [
    (frFinance as any).toolbar.showAAPL.label,
    (frFinance as any).toolbar.scanFx.label,
  ]);
});

