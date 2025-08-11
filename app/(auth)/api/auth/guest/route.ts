import { signIn } from '@/app/(auth)/auth';
import { isDevelopmentEnvironment } from '@/lib/constants';
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

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
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  if (token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Let NextAuth perform the credentials flow and redirect back to the
  // requested URL once the guest session is established.
  return signIn('guest', { redirect: true, redirectTo: redirectUrl });
}
