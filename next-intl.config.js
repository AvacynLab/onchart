// JavaScript variant of the Next-Intl configuration so the dev server can
// resolve locales during Playwright runs without relying on TypeScript
// transpilation.
// Mirror the TypeScript `next-intl.config.ts` setup so the development server
// and tooling resolve the same locale settings. Using `localePrefix: 'as-needed'`
// serves the default French locale at the root while exposing English under
// `/en`, keeping paths predictable for Playwright and Next.js.
const config = {
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localePrefix: 'as-needed',
};
module.exports = config;
