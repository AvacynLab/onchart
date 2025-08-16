import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';
import { auth } from '@/app/(auth)/auth';
import { getUserSettings } from '@/lib/db/queries';
import { locales, defaultLocale, type Locale } from './config';

/**
 * Resolve the active locale for each incoming request using the following
 * priority order:
 * 1. Preferred locale stored in the database for a signed-in user.
 * 2. Explicit `lang` cookie set by the application.
 * 3. `Accept-Language` HTTP header supplied by the client.
 * 4. Default locale (`fr`).
 *
 * All message namespaces are loaded for the resolved locale so server
 * components can access translations without additional lookups.
 */
export default getRequestConfig(async () => {
  const headerList = await headers();

  // Attempt to retrieve the preferred locale stored in the database for an
  // authenticated user. During Playwright runs we skip the session lookup to
  // keep the environment lean.
  let locale: Locale | undefined;
  const session = process.env.PLAYWRIGHT ? null : await auth();
  if (session?.user?.id) {
    const preferred = await getUserSettings(session.user.id);
    if (preferred && locales.includes(preferred as Locale)) {
      locale = preferred as Locale;
    }
  }

  // 2) Check the `lang` cookie explicitly set by the application if no
  // database preference exists.
  if (!locale) {
    locale = headerList
      .get('cookie')
      ?.split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('lang='))
      ?.split('=')[1] as Locale | undefined;
  }

  // 3) Fall back to the first supported language from the Accept-Language
  // header when neither a database preference nor cookie are available.
  if (!locale) {
    const accept = headerList.get('accept-language');
    if (accept) {
      const code = accept.split(',')[0]?.split('-')[0];
      if (code && locales.includes(code as Locale)) {
        locale = code as Locale;
      }
    }
  }

  // 4) Default to French when no other source yields a valid locale.
  const activeLocale = locale ?? defaultLocale;

  return {
    locale: activeLocale,
    messages: {
      ...(await import(`../messages/${activeLocale}/common.json`)).default,
      ...(await import(`../messages/${activeLocale}/dashboard.json`)).default,
      ...(await import(`../messages/${activeLocale}/finance.json`)).default,
      ...(await import(`../messages/${activeLocale}/chat.json`)).default,
    },
  };
});
