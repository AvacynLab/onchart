// Export locale constants so both runtime code and tests can import them
// without risk of circular dependencies. Declaring them individually keeps
// literal string types (`'fr' | 'en'`) intact.
export const locales = ['en', 'fr'] as const;
export const defaultLocale = 'en' as const;

// Type alias representing any supported locale.
export type Locale = (typeof locales)[number];

// Consolidated configuration object consumed by next-intl utilities.
const i18n = {
  locales,
  defaultLocale,
// Serve both French and English from the same root path. Locale negotiation
// occurs via the `NEXT_LOCALE` cookie or `Accept-Language` headers rather than URL
// prefixes, so no language codes appear in the path.
  localePrefix: 'never',
} as const;

export default i18n;
