import '../helpers/next-intl-stub';
import Module from 'module';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';

/**
 * Mock environment modules so the app layout can render in isolation. The
 * layout reads the `lang` cookie or user settings from the database to
 * determine the active locale.
 */
function mockEnv(cookieLang?: string, dbLocale?: string) {
  const originalLoad = (Module as any)._load;
  (Module as any)._load = function (request: string, parent: any, isMain: boolean) {
    if (request === 'next/headers') {
      return {
        headers: async () => ({
          get: (name: string) =>
            name === 'cookie' && cookieLang ? `lang=${cookieLang}` : undefined,
        }),
      } as any;
    }
    if (request === '@/app/(auth)/auth') {
      return { auth: async () => (dbLocale ? { user: { id: 'u1' } } : null) } as any;
    }
    if (request === '@/lib/db/queries') {
      return { getUserSettings: async () => dbLocale } as any;
    }
    if (request === 'next-auth/react') {
      return {
        SessionProvider: ({ children }: { children: React.ReactNode }) =>
          React.createElement(React.Fragment, null, children),
      } as any;
    }
    if (request.endsWith('.css')) {
      return {};
    }
    if (request === 'next/font/local') {
      return () => ({ className: '', variable: '' });
    }
    if (request === 'server-only') return {};
    return originalLoad(request, parent, isMain);
  };
  return () => {
    (Module as any)._load = originalLoad;
  };
}

// The layout should honor the `lang` cookie when present.
test('renders with cookie locale', async () => {
  const restore = mockEnv('en');
  const { default: Layout } = await import(`../../app/layout.tsx?test=${Date.now()}`);
  const element = await Layout({ children: React.createElement('div') });
  const html = renderToString(element);
  assert.match(html, /<html lang="en"/);
  restore();
});

// When no cookie or preference exists, the default French locale is used.
test('falls back to default locale', async () => {
  const restore = mockEnv();
  const { default: Layout } = await import(`../../app/layout.tsx?test=${Date.now()}`);
  const element = await Layout({ children: React.createElement('div') });
  const html = renderToString(element);
  assert.match(html, /<html lang="fr"/);
  restore();
});
