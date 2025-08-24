import { signIn } from '@/app/(auth)/auth';
import { isDevelopmentEnvironment } from '@/lib/constants';
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

// NextAuth depends on Node.js primitives; force the Node runtime to ensure the
// JWT helper and cookies work reliably across platforms.
export const runtime = 'nodejs';

/**
 * Authenticate as a guest user. When a session already exists, simply redirect
 * to the dashboard. Otherwise, delegate to NextAuth which issues the session
 * cookie and handles the redirect internally.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectUrl = searchParams.get('redirectUrl') || '/';

  // Reuse any existing session to avoid creating multiple guest accounts.
  const token = await getToken({
    req: request,
    // Only include `secret` when defined to satisfy `exactOptionalPropertyTypes`.
    ...(process.env.AUTH_SECRET ? { secret: process.env.AUTH_SECRET } : {}),
    secureCookie: !isDevelopmentEnvironment,
  });

  if (token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Let NextAuth perform the credentials flow and redirect back to the
  // requested URL once the guest session is established.
  return signIn('guest', { redirect: true, redirectTo: redirectUrl });
}
