// JavaScript variant of the Next-Intl configuration so the dev server can
// resolve locales during Playwright runs without relying on TypeScript
// transpilation.
// Mirror the TypeScript `next-intl.config.ts` setup so the development server
// and tooling resolve the same locale settings. Using `localePrefix: 'never'`
// removes locale segments from URLs, keeping the default French locale at the
// root `/` and relying on cookies or headers for language negotiation.
const config = {
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localePrefix: 'never',
};
module.exports = config;
