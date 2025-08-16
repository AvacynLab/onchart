import Module from 'module';

/**
 * Mock modules consumed by `i18n/request.ts` so unit tests can inject
 * cookies, headers, and database values without relying on Next.js runtime
 * helpers.
 */
export function mockRequestEnv({
  cookie,
  accept,
  dbLocale,
  session = false,
}: {
  cookie?: string;
  accept?: string;
  dbLocale?: string | null;
  session?: boolean;
}) {
  const originalLoad = (Module as any)._load;
  const originalRuntime = process.env.NEXT_RUNTIME;
  process.env.NEXT_RUNTIME = 'nodejs';
  (Module as any)._load = function (request: string, parent: any, isMain: boolean) {
    if (request === 'next/headers') {
      return {
        headers: async () => ({
          get: (name: string) => {
            if (name === 'cookie' && cookie) return `NEXT_LOCALE=${cookie}`;
            if (name === 'accept-language') return accept;
            return undefined;
          },
        }),
      } as any;
    }
    if (request === '@/app/(auth)/auth') {
      return { auth: async () => (session ? { user: { id: 'u1' } } : null) } as any;
    }
    if (request === '@/lib/db/queries') {
      return {
        getUserSettings: async () => dbLocale,
      } as any;
    }
    if (request === 'next-intl/server') {
      return { getRequestConfig: (cb: any) => cb } as any;
    }
    if (request === 'server-only') return {};
    return originalLoad(request, parent, isMain);
  };
  return () => {
    (Module as any)._load = originalLoad;
    process.env.NEXT_RUNTIME = originalRuntime;
  };
}
