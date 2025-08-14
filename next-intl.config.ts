/**
 * next-intl configuration used by both the server middleware and the build
 * tooling. Keeping the object in a standalone file allows Next.js and
 * Playwright to locate the locale settings without executing application code.
 */
const intlConfig = {
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  // Expose the default French locale at the root while prefixing other
  // languages only when needed. This mirrors production routing and lets tests
  // navigate to `/` without redirects while still supporting `/en` for English
  // content.
  localePrefix: 'as-needed',
} as const;

export default intlConfig;
