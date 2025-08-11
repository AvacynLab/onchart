// Use CommonJS exports so the Next-Intl runtime can `require` this file during
// development and Playwright runs. Using ESM (`export default`) caused the dev
// server to fail loading the configuration, preventing locale detection.
module.exports = {
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
};
