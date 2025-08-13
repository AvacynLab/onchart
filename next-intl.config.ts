// Minimal next-intl configuration so tooling and the middleware can resolve
// available locales. `localePrefix: 'always'` keeps URLs explicit (`/fr/...`).
const config = {
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localePrefix: 'always',
} as const;

export default config;
