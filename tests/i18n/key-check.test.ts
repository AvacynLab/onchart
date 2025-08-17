import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkI18nKeys } from '@/scripts/check-i18n';

// Verifies that French and English translation files expose the same keys across
// all namespaces. Any discrepancy indicates a missing localisation entry and
// should fail the test.

test('translation keys are in sync', () => {
  const diff = checkI18nKeys();
  assert.equal(diff.fr.length, 0, `FR missing: ${diff.fr.join(', ')}`);
  assert.equal(diff.en.length, 0, `EN missing: ${diff.en.join(', ')}`);
});
