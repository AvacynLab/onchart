import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { locales, defaultLocale } from './i18n/config';

/**
 * Minimal i18n middleware that reads the `NEXT_LOCALE` cookie or the first
 * language from the `Accept-Language` header and forwards the resolved locale to
 * Next.js via the `x-next-intl-locale` header. Routes remain unchanged so French
 * and English content are both served from `/`.
 */
export function middleware(request: NextRequest) {
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  const headerLocale = request.headers
    .get('accept-language')
    ?.split(',')[0]
    ?.split('-')[0];
  // Choose the cookie locale if valid, otherwise the header locale, falling
  // back to the default locale. Using an imperative flow ensures TypeScript
  // infers `locale` as a plain string rather than `string | undefined`.
  let locale: string;
  if (cookieLocale && locales.includes(cookieLocale as any)) {
    locale = cookieLocale;
  } else if (headerLocale && locales.includes(headerLocale as any)) {
    locale = headerLocale;
  } else {
    locale = defaultLocale;
  }
  const response = NextResponse.next();
  response.headers.set('x-next-intl-locale', locale);
  return response;
}

// Avoid intercepting Next.js internals, API routes or static assets.
export const config = {
  matcher: ['/((?!api|_next|ping|.*\\..*).*)'],
};
