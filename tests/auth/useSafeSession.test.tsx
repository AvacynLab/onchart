import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { useSafeSession } from '@/lib/auth/useSafeSession';

/**
 * Verifies that `useSafeSession` yields a harmless unauthenticated stub when
 * the NextAuth SessionProvider is absent. This ensures client components using
 * the hook remain stable in test or CI environments where the provider may not
 * be mounted.
 */
test('falls back to unauthenticated stub without provider', async () => {
  let session: ReturnType<typeof useSafeSession> | undefined;
  function Probe() {
    session = useSafeSession();
    return null;
  }
  renderToString(<Probe />);
  assert.equal(session?.status, 'unauthenticated');
  // update is a no-op that resolves to null
  assert.equal(await session?.update(), null);
});
