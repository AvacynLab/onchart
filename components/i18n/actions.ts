'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { auth } from '@/app/(auth)/auth';
import { setUserPreferredLocale } from '@/lib/db/queries';
import { locales, type Locale } from '@/i18n/config';

/**
 * Persist the selected locale in a cookie and, if the user is authenticated,
 * store it in the database. The root layout is revalidated so server components
 * pick up the new language on the next render.
 */
export async function updatePreferredLocale(locale: Locale) {
  if (!locales.includes(locale)) return;

  const cookieStore = await cookies();
  cookieStore.set('lang', locale, { path: '/' });

  const session = await auth();
  if (session?.user?.id) {
    await setUserPreferredLocale(session.user.id, locale);
  }

  // Ensure server components are re-rendered with the new locale.
  revalidatePath('/');
}
