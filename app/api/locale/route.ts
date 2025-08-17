import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/app/(auth)/auth';
import { setUserPreferredLocale } from '@/lib/db/queries';
import { locales, defaultLocale, type Locale } from '@/i18n/config';

/**
 * API route to update the active locale. The client sends the desired language
 * via the `lang` search parameter. The value is validated against the list of
 * supported locales before persisting it to a cookie and, when the user is
 * authenticated, to the database.
 */
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') as Locale | null;
  const locale = locales.includes(lang as any) ? (lang as Locale) : defaultLocale;

  const cookieStore = await cookies();
  cookieStore.set('NEXT_LOCALE', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  const session = await auth();
  if (session?.user?.id) {
    await setUserPreferredLocale(session.user.id, locale);
  }

  return new NextResponse(null, { status: 204 });
}

export async function GET(request: Request) {
  return POST(request);
}
