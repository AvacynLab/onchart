// JavaScript variant of the Next-Intl configuration so the dev server can
// resolve locales during Playwright runs without relying on TypeScript
// transpilation.
const config = { locales: ['fr', 'en'], defaultLocale: 'fr', localePrefix: 'always' };
module.exports = config;
