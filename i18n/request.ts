import { getRequestConfig } from 'next-intl/server';

// Expose the request-level i18n configuration so Next.js and next-intl can
// resolve the active locale and load the corresponding message bundles.
// Each request pulls in all namespaces (`common`, `dashboard`, `finance`,
// `chat`) for the detected locale to keep lookups simple in server components
// and during Playwright tests.
export default getRequestConfig(async ({ locale }) => {
  const activeLocale = locale ?? 'fr';
  return {
    locale: activeLocale,
    messages: {
      ...(await import(`../messages/${activeLocale}/common.json`)).default,
      ...(await import(`../messages/${activeLocale}/dashboard.json`)).default,
      ...(await import(`../messages/${activeLocale}/finance.json`)).default,
      ...(await import(`../messages/${activeLocale}/chat.json`)).default,
    },
  };
});
