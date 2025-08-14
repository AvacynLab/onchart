// JavaScript variant of the Next-Intl configuration so the dev server can
// resolve locales during Playwright runs without relying on TypeScript
// transpilation.
// Mirror the TypeScript `next-intl.config.ts` setup so the development server
// and tooling resolve the same locale settings. Using `localePrefix: 'as-needed'`
// serves French content from the root `/` while exposing English pages under
// `/en`, providing stable paths for non-default locales.
const config = {
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localePrefix: 'as-needed',
};
module.exports = config;
