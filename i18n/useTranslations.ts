import { useTranslations as baseUseTranslations, IntlErrorCode } from 'next-intl';

/**
 * Wrapper around next-intl's `useTranslations` hook that prevents runtime
 * crashes when translation keys are missing during development. If a requested
 * message cannot be found and the library throws a `MISSING_MESSAGE` error, the
 * key is returned surrounded by brackets instead. This mirrors the behaviour of
 * our testing stubs and makes missing translations immediately visible in the
 * UI without interrupting rendering.
 *
 * In production environments the original error is rethrown so that
 * misconfigured deployments still surface failures.
 */
export function useTranslations(namespace?: Parameters<typeof baseUseTranslations>[0]) {
  const t = baseUseTranslations(namespace);

  return ((key: Parameters<typeof t>[0], ...rest: any[]) => {
    try {
      // Delegate to next-intl for the actual lookup and formatting logic.
      return t(key, ...rest);
    } catch (err: any) {
      // When a translation is missing, next-intl throws an error with code
      // `MISSING_MESSAGE`. In development we swallow the error and surface the
      // raw key so developers can spot gaps in localisation files without the
      // application crashing.
      if (
        process.env.NODE_ENV !== 'production' &&
        err?.code === IntlErrorCode.MISSING_MESSAGE
      ) {
        return `[${String(key)}]`;
      }
      throw err;
    }
  }) as typeof t;
}
