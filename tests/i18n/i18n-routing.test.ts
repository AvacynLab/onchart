import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
// No auth token is set; middleware should redirect to guest auth when accessing
// protected routes. Environment variables still need to exist for imports.
process.env.AUTH_SECRET = '01234567890123456789012345678901';
process.env.NODE_ENV = 'development';

/**
 * Requests to the root should be redirected to the default locale (fr).
 */
test('redirects / to /fr', async () => {
  const { middleware } = await import('../../middleware');
  const res = await middleware(new NextRequest('http://localhost/'));
  assert.equal(res.status, 307);
  assert.equal(res.headers.get('location'), 'http://localhost/fr/');
});

/**
 * When a locale prefix is present and a session token exists, the middleware
 * should expose the locale via `x-next-intl-locale`.
 */
test('redirect preserves locale in query', async () => {
  const request = new NextRequest('http://localhost/en/page');
  const { middleware } = await import('../../middleware');
  const res = await middleware(request);
  assert.equal(res.status, 307);
  assert.match(
    res.headers.get('location')!,
    /redirectUrl=http%3A%2F%2Flocalhost%2Fen%2Fpage/,
  );
});
