// Centralize locales and derive the Locale union type from the array to keep
// the configuration strongly typed. `defaultLocale` is explicitly cast to
// `Locale` so downstream checks can rely on it without additional assertions.
export const locales = ['fr', 'en'] as const;
export type Locale = (typeof locales)[number];

export const i18n = {
  locales,
  defaultLocale: 'fr' as Locale,
};

// Export a default config so `next-intl`'s plugin can import it when building
// the Next.js configuration. The plugin serializes this object and exposes it
// to the runtime via `NEXT_INTL_CONFIG`.
export default i18n;
