import React from 'react';
import BentoCard from '../BentoCard';
import type { NewsItem } from '@/lib/finance/sources/news';
import NewsTileEmpty from '../empty/NewsTileEmpty';
import { load } from 'cheerio';

/**
 * Sanitize an RSS description by stripping all tags and removing potentially
 * dangerous elements like <script> or <style>. Cheerio is used server-side so
 * no browser DOM is required.
 */
export function sanitizeSummary(input: string): string {
  const $ = load(input);
  $('script,style').remove();
  return $.text();
}

/**
 * Format a JavaScript date into a human readable relative string using the
 * Intl.RelativeTimeFormat API. The function chooses the largest sensible unit
 * (seconds, minutes, hours or days) and returns a locale aware relative time,
 * e.g. "2 h ago" or "il y a 2 h".
 *
 * Exported for unit testing to guarantee consistent relative-time formatting
 * across locales.
 */
export function formatRelative(date: Date, locale: string): string {
  const diffMs = date.getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const seconds = Math.round(diffMs / 1000);
  if (Math.abs(seconds) < 60) return rtf.format(seconds, 'second');
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');
  const days = Math.round(hours / 24);
  return rtf.format(days, 'day');
}

/**
 * Pure presentational component rendering a list of news entries.
 * Exported for unit testing.
 */
export function NewsList({
  items,
  locale,
  emptyLabel,
  labelledBy,
}: {
  /** News articles to render */
  items: NewsItem[];
  /** Current UI locale */
  locale: string;
  /** Localised empty-state message */
  emptyLabel: string;
  /** id of the title element announcing this list */
  labelledBy: string;
}) {
  if (items.length === 0) {
    return <NewsTileEmpty message={emptyLabel} />;
  }

  return (
    <ul className="space-y-3" aria-labelledby={labelledBy}>
      {items.map((item) => {
        const hostname = (() => {
          try {
            return new URL(item.link).hostname.replace(/^www\./, '');
          } catch {
            return '';
          }
        })();

        const relativeDate = formatRelative(new Date(item.pubDate), locale);

        return (
          <li key={item.link} className="text-sm">
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              {item.title}
            </a>
            <div className="text-xs text-muted-foreground">
              {hostname} · {relativeDate}
            </div>
            {item.summary && (
              <p className="text-xs mt-1">{sanitizeSummary(item.summary)}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Server component rendering a list of pre-fetched news items. Fetching happens
 * in the dashboard page so this component simply formats and displays the
 * articles with proper localisation.
 */
export default async function NewsTile({ items }: { items: NewsItem[] }) {
  // Resolve the active locale and translation function without relying on
  // project-wide middleware. `getTranslations` returns a locale-aware `t` helper.
  const { getLocale, getTranslations } = await import('next-intl/server');
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'dashboard' });
  // Generate a unique id so the list can reference the tile's heading.
  // Server components cannot use React hooks, so generate an id manually.
  const titleId = `news-${Math.random().toString(36).slice(2)}`;

  return (
    <BentoCard title={t('news.title')} titleId={titleId}>
      <NewsList
        items={items}
        locale={locale}
        emptyLabel={t('news.empty')}
        labelledBy={titleId}
      />
    </BentoCard>
  );
}
