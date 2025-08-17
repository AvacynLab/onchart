import { locales, defaultLocale } from './config';

/**
 * Configuration for next-intl's navigation helpers. We deliberately avoid
 * locale prefixes in the URL (`localePrefix: 'never'`) so switching languages
 * does not alter the path. The `pathnames` map can be extended once specific
 * routes require custom translations.
 */
/**
 * Utility to map the same pathname for all supported locales. While the
 * application currently shares paths across languages, defining explicit
 * mappings makes it straightforward to introduce translated slugs later on.
 */
const shared = (path: string) => ({ en: path, fr: path }) as const;

export const routing = {
  locales,
  defaultLocale,
  localePrefix: 'never' as const,
  pathnames: {
    '/': shared('/'),
    '/chat': shared('/chat'),
    '/login': shared('/login'),
    '/register': shared('/register'),
  },
} as const;

export type Routing = typeof routing;
