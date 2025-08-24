'use client';

import { useContext } from 'react';
import { SessionContext } from 'next-auth/react';

/**
 * Shape of the object returned by {@link useSafeSession}.
 * The `update` function mirrors `useSession`'s update but defaults to a no-op
 * when the provider is absent to avoid crashes in tests or CI.
 */
type SafeSession = {
  data: { user?: { email?: string } } | null;
  status: 'authenticated' | 'unauthenticated' | 'loading';
  update: (...args: unknown[]) => Promise<unknown>;
};

/**
 * Safe alternative to `useSession` that tolerates a missing `SessionProvider`.
 * Returns a stub session object with a no-op `update` so components can call it
 * without checking for provider presence.
 */
export function useSafeSession(): SafeSession {
  try {
    // Access the internal NextAuth session context. This throws when the
    // provider has not been mounted, which we gracefully handle below.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value: unknown = useContext(SessionContext as any);
    if (value && typeof value === 'object') return value as SafeSession;
  } catch {
    // ignore and fall through to stub
  }
  return {
    data: null,
    status: 'unauthenticated',
    update: async () => null,
  };
}
