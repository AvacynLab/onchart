/**
 * next-intl configuration used by both the server middleware and the build
 * tooling. Keeping the object in a standalone file allows Next.js and
 * Playwright to locate the locale settings without executing application code.
 */
const intlConfig = {
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  // Expose English pages under `/en` while serving French content from the
  // root `/`. Other locales would also receive a path prefix when added.
  // Using `as-needed` keeps the default locale segment-free but still
  // generates predictable URLs for non-default languages.
  localePrefix: 'as-needed',
} as const;

export default intlConfig;
