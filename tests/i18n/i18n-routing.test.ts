import Module from 'module';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

/**
 * Utility to mock `next-auth/jwt`'s `getToken` so the middleware can be
 * executed in isolation. Each test supplies the value that should be returned
 * to simulate authenticated or anonymous requests.
 */
function mockGetToken(returnValue: any) {
  const originalLoad = (Module as any)._load;
  (Module as any)._load = function (
    request: string,
    parent: any,
    isMain: boolean,
  ) {
    if (request === 'next-auth/jwt') {
      return { getToken: async () => returnValue };
    }
    if (request === 'server-only') return {};
    return originalLoad(request, parent, isMain);
  };
  return () => {
    (Module as any)._load = originalLoad;
  };
}

// Ensure requests lacking a locale prefix are redirected to the default one.
test('redirects to default locale when none is provided', async () => {
  const restore = mockGetToken(null);
  const { middleware } = await import('../../middleware?redirect');
  const res = await middleware(new NextRequest('http://example.com/'));
  assert.equal(res.status, 307);
  assert.equal(res.headers.get('location'), 'http://example.com/fr/');
  restore();
});

// When a locale is already present, the middleware should pass through and
// expose it via the `x-next-intl-locale` header for server-side helpers.
test('sets locale header when prefix is present', async () => {
  const restore = mockGetToken({ email: 'guest-1' });
  const { middleware } = await import('../../middleware?locale');
  const res = await middleware(
    new NextRequest('http://example.com/en/dashboard'),
  );
  assert.equal(res.headers.get('x-next-intl-locale'), 'en');
  restore();
});
