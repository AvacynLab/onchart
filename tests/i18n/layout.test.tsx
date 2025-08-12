import '../helpers/next-intl-stub';
import Module from 'module';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';

/**
 * Mock `next/headers` and `next-auth/react` so the app layout can be rendered
 * in isolation. The layout reads the `x-next-intl-locale` header to decide
 * which translation files to load, while `SessionProvider` simply renders its
 * children in this test environment.
 */
function mockEnv(locale?: string) {
  const originalLoad = (Module as any)._load;
  (Module as any)._load = function (request: string, parent: any, isMain: boolean) {
    if (request === 'next/headers') {
      return { headers: () => new Headers(locale ? { 'x-next-intl-locale': locale } : {}) };
    }
    if (request === 'next-auth/react') {
      return { SessionProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children) };
    }
    if (request === 'server-only') return {};
    return originalLoad(request, parent, isMain);
  };
  return () => {
    (Module as any)._load = originalLoad;
  };
}

/**
 * The layout should propagate the locale header to the HTML `lang` attribute so
 * assistive technologies and `Intl` formatting behave correctly on the client.
 */
test('sets lang attribute based on locale header', async () => {
  const restore = mockEnv('en');
  const { default: Layout } = await import('../../app/layout');
  const element = await Layout({ children: React.createElement('div') });
  const html = renderToString(element);
  assert.match(html, /<html lang="en"/);
  restore();
});

/**
 * When no locale header is supplied, the layout should fall back to the default
 * locale (`fr`).
 */
test('defaults to fr when locale header missing', async () => {
  const restore = mockEnv();
  const { default: Layout } = await import('../../app/layout');
  const element = await Layout({ children: React.createElement('div') });
  const html = renderToString(element);
  assert.match(html, /<html lang="fr"/);
  restore();
});
