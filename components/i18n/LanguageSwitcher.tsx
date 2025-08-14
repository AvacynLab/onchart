'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { locales } from '@/i18n/config';
import { updatePreferredLocale } from './actions';

/**
 * Switch between locales without relying on URL prefixes. Selecting a language
 * updates the `lang` cookie, persists the choice for authenticated users and
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
          onClick={() =>
            startTransition(async () => {
              await updatePreferredLocale(l);
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
