/**
 * next-intl configuration used by both the server middleware and the build
 * tooling. Keeping the object in a standalone file allows Next.js and
 * Playwright to locate the locale settings without executing application code.
 */
const intlConfig = {
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  // Keep paths unchanged across locales and negotiate language via the
  // `NEXT_LOCALE` cookie or `Accept-Language` header. Avoiding locale segments
  // prevents conflicts with Next.js routing while still allowing explicit
  // language selection.
  localePrefix: 'never',
} as const;

export default intlConfig;
