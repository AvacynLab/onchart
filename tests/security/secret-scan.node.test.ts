import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanRepoForSecrets } from '../../scripts/scan-secrets';

/**
 * Basic regression test ensuring the repository does not accidentally contain
 * API keys or bearer tokens. The scan mimics the CI script used during builds.
 */
test('repository secrets scan finds no secret-like patterns', () => {
  const matches = scanRepoForSecrets();
  assert.equal(matches.length, 0, `potential secrets detected: ${JSON.stringify(matches)}`);
});
