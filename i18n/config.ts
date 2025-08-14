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
  // Keep URLs identical across locales and rely on the `NEXT_LOCALE` cookie or
  // `Accept-Language` header to select the active language. This mirrors the
  // `next-intl.config.ts` used by middleware and tooling while avoiding route
  // conflicts.
  localePrefix: 'never',
} as const;

export default i18n;
