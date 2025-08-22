import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { locales, defaultLocale } from './i18n/config';

/**
 * Middleware maison : lit le cookie `lang` ou l’en-tête `Accept-Language` pour
 * déterminer la langue et la transmet au serveur via l’en-tête
 * `x-next-intl-locale`. Si aucun cookie n’est présent, il est écrit afin que la
 * préférence persiste. Aucune réécriture de chemin n’est effectuée.
 */
export function middleware(request: NextRequest) {
  const cookieLocale = request.cookies.get('lang')?.value;
  const headerLocale = request.headers
    .get('accept-language')
    ?.split(',')[0]
    ?.split('-')[0];
  // Choisir la langue du cookie si valide, sinon négocier via l’en-tête puis
  // retomber sur la locale par défaut. La structure impérative garantit une
  // simple chaîne de caractères.
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
  // Écrire le cookie si absent ou différent pour mémoriser la préférence.
  if (!cookieLocale || cookieLocale !== locale) {
    response.cookies.set('lang', locale, { path: '/' });
  }
  return response;
}

// Avoid intercepting Next.js internals, API routes, static assets, or the
// `/ping` healthcheck used by Playwright.
export const config = {
  matcher: ['/((?!api|_next|ping|.*\\..*).*)'],
};
