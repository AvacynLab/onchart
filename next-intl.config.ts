/**
 * next-intl configuration used by both the server middleware and the build
 * tooling. Keeping the object in a standalone file allows Next.js and
 * Playwright to locate the locale settings without executing application code.
 */
const intlConfig = {
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  // Serve both French and English from the same `/` routes. Locale negotiation
  // happens via the `lang` cookie or `Accept-Language` headers rather than path
  // segments, so no locale prefixes are added to URLs.
  localePrefix: 'never',
} as const;

export default intlConfig;
