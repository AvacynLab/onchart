// JavaScript variant of the Next-Intl configuration so the dev server can
// resolve locales during Playwright runs without relying on TypeScript
// transpilation.
// Mirror the TypeScript `next-intl.config.ts` setup so the development server
// and tooling resolve the same locale settings. Using `localePrefix: 'never'`
// serves both French and English from the root `/` and relies on cookies or
// headers for locale negotiation instead of path prefixes.
const config = {
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localePrefix: 'never',
};
module.exports = config;
