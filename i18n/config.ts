// Export locale constants so both runtime code and tests can import them
// without risk of circular dependencies. Declaring them individually keeps
// literal string types (`'fr' | 'en'`) intact.
export const locales = ['fr', 'en'] as const;
export const defaultLocale = 'fr' as const;

// Type alias representing any supported locale.
export type Locale = (typeof locales)[number];

// Consolidated configuration object consumed by next-intl utilities.
const i18n = {
  locales,
  defaultLocale,
// Serve both French and English from the same root path. Locale negotiation
// occurs via the `lang` cookie or `Accept-Language` headers rather than URL
// prefixes, so no language codes appear in the path.
  localePrefix: 'never',
} as const;

export default i18n;
