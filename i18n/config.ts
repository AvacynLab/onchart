export const i18n = {
  locales: ['fr', 'en'] as const,
  defaultLocale: 'fr',
};

export type Locale = (typeof i18n)['locales'][number];
