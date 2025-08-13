// Centralize locales and derive the `Locale` union type directly from the
// configuration object. Marking the object `as const` preserves literal types
// (`'fr' | 'en'`) so consumers such as the middleware receive the exact values
// expected by `next-intl` rather than generic `string` types.
export const i18n = {
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  // Always prefix routes with the locale to keep URLs explicit in URLs.
  localePrefix: 'always',
} as const;

export type Locale = (typeof i18n)['locales'][number];

// Export the configuration for use by the Next.js plugin and runtime.
export default i18n;
