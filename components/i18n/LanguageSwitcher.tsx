'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { i18n } from '@/i18n/config';

/**
 * Simple locale switcher that toggles between available languages by
 * rewriting the first segment of the current path. When no locale is
 * present, links point to the locale root.
 */
export default function LanguageSwitcher() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const currentLocale = segments[0];
  const restPath = segments.slice(1).join('/');

  return (
    <nav aria-label="language switcher" className="flex gap-2">
      {i18n.locales.map((locale) => {
        const href = `/${locale}` + (restPath ? `/${restPath}` : '');
        return (
          <Link
            key={locale}
            href={href}
            className={currentLocale === locale ? 'font-bold underline' : ''}
          >
            {locale.toUpperCase()}
          </Link>
        );
      })}
    </nav>
  );
}
