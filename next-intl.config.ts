/**
 * next-intl configuration used by both the server middleware and the build
 * tooling. Keeping the object in a standalone file allows Next.js and
 * Playwright to locate the locale settings without executing application code.
 */
const intlConfig = {
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  // Avoid locale-specific URL segments; negotiation happens via cookies or the
  // `Accept-Language` header. The application renders French at the root `/`
  // while still allowing other locales to be selected without path redirects.
  localePrefix: 'never',
} as const;

export default intlConfig;
