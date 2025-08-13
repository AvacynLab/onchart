import type { NextIntlRequestConfig } from 'next-intl/server';
import config from '../next-intl.config';

// Provide the request-level i18n configuration so next-intl can
// resolve the active locale for each incoming request.
export default function getRequestConfig(): NextIntlRequestConfig {
  return config;
}
