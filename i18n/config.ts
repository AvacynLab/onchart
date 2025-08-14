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
// Serve the default French locale at the root path while prefixing other
// locales such as English under `/en`. Using `as-needed` ensures predictable
// URLs for non-default languages without cluttering the default route.
  localePrefix: 'as-needed',
} as const;

export default i18n;
