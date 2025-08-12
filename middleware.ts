import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import i18n from './i18n/config';

// Reuse next-intl's middleware to handle locale prefixes and detection.
// A lightweight `/ping` route remains to signal readiness during Playwright runs.
// Initialize next-intl's middleware with the shared locale configuration.
const intlMiddleware = createMiddleware(i18n);

export default function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/ping') {
    return new Response('pong', { status: 200 });
  }
  return intlMiddleware(request);
}

// Ensure we don't intercept Next.js internals, API routes or static assets.
export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
