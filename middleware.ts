import createMiddleware from 'next-intl/middleware';
import intlConfig from './next-intl.config';

// Delegate locale negotiation to next-intl without altering the URL structure.
// The middleware reads the `NEXT_LOCALE` cookie or `Accept-Language` header and
// sets the active locale accordingly, leaving routes untouched.
export default createMiddleware(intlConfig);

// Avoid intercepting Next.js internals, API routes or static assets.
export const config = {
  // Allow the `/ping` healthcheck endpoint to bypass locale negotiation so the
  // Playwright readiness probe receives a direct 200 response.
  matcher: ['/((?!api|_next|ping|.*\\..*).*)'],
};
