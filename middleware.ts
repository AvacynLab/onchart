import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import nextIntlConfig from './next-intl.config';

// Reuse next-intl's middleware to handle locale prefixes and detection.
// A lightweight `/ping` route remains to signal readiness during Playwright runs.
const intlMiddleware = createMiddleware(nextIntlConfig);

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
