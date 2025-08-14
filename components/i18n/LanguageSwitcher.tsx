'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import i18n from '@/i18n/config';

/**
 * Locale switcher that toggles between available languages without relying on
 * URL prefixes. The current route is preserved and `next-intl` sets the
 * `NEXT_LOCALE` cookie when a new locale is chosen.
 */
export default function LanguageSwitcher() {
  const pathname = usePathname();
  const locale = useLocale();

  return (
    <nav aria-label="language switcher" className="flex gap-2">
      {i18n.locales.map((l) => (
        <Link
          key={l}
          href={pathname}
          locale={l}
          className={locale === l ? 'font-bold underline' : ''}
        >
          {l.toUpperCase()}
        </Link>
      ))}
    </nav>
  );
}
