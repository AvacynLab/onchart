import { test } from 'node:test';
import assert from 'node:assert/strict';

test('createGuestUser stubs user when PLAYWRIGHT is set', async () => {
  process.env.PLAYWRIGHT = '1';
  const { createGuestUser } = await import('../queries');
  const [user] = await createGuestUser();
  assert.equal(user.id, 'guest');
  assert.ok(user.email.startsWith('guest-'));
  delete process.env.PLAYWRIGHT;
});
