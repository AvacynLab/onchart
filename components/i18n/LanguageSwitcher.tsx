'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { locales } from '@/i18n/config';

/**
 * Switch between locales without relying on URL prefixes. Selecting a language
 * updates the `NEXT_LOCALE` cookie, persists the choice for authenticated users and
 * refreshes the current route so translations update in place.
 */
export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <nav aria-label="language switcher" className="flex gap-2">
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          disabled={pending}
          className={locale === l ? 'font-bold underline' : ''}
          data-testid={`locale-${l}`}
          onClick={() =>
            startTransition(async () => {
              // Persist the user's choice via the locale API without altering
              // the current path. The subsequent refresh reloads translations
              // server-side so client components update in place.
              await fetch(`/api/locale?lang=${l}`, { method: 'POST' });
              router.refresh();
            })
          }
        >
          {l.toUpperCase()}
        </button>
      ))}
    </nav>
  );
}
