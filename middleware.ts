import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { guestRegex, isDevelopmentEnvironment } from './lib/constants';
import { i18n, type Locale } from './i18n/config';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split('/').filter(Boolean);
  const potentialLocale = segments[0];
  const hasLocale = i18n.locales.includes(potentialLocale as Locale);
  const locale = hasLocale ? (potentialLocale as Locale) : i18n.defaultLocale;
  const pathnameWithoutLocale = hasLocale
    ? '/' + segments.slice(1).join('/')
    : pathname;

  // Redirect requests missing a locale prefix to the default locale.
  if (
    !hasLocale &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/_next') &&
    pathname !== '/favicon.ico'
  ) {
    return NextResponse.redirect(
      new URL(`/${i18n.defaultLocale}${pathname}`, request.url),
    );
  }

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathnameWithoutLocale.startsWith('/ping')) {
    return new Response('pong', { status: 200 });
  }

  if (pathnameWithoutLocale.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  if (!token) {
    const redirectUrl = encodeURIComponent(request.url);

    return NextResponse.redirect(
      new URL(`/api/auth/guest?redirectUrl=${redirectUrl}`, request.url),
    );
  }

  const isGuest = guestRegex.test(token?.email ?? '');

  if (
    token &&
    !isGuest &&
    ['/login', '/register'].includes(pathnameWithoutLocale)
  ) {
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  const response = NextResponse.next();
  // Expose the resolved locale so `getLocale()` can read it server-side.
  response.headers.set('x-next-intl-locale', locale);
  return response;
}

export const config = {
  matcher: [
    '/',
    '/chat/:id',
    '/api/:path*',
    '/login',
    '/register',

    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
