import React from 'react';
import AnalysesTileEmpty from '../empty/AnalysesTileEmpty';
import type { AnalysisSummary } from './AnalysesTile';

interface Props {
  /** Analyses and research summaries to render */
  items: AnalysisSummary[];
  /** Active UI locale */
  locale: string;
  /** Localised empty state text */
  emptyLabel: string;
  /** id of title used for aria-labelledby */
  labelledBy: string;
}

/**
 * Pure presentational component rendering a list of analysis summaries.
 * Exported for reuse in both server and client components.
 */
export default function AnalysisList({
  items,
  locale,
  emptyLabel,
  labelledBy,
}: Props) {
  if (items.length === 0) {
    return <AnalysesTileEmpty message={emptyLabel} />;
  }

  function formatRelative(date: Date, locale: string): string {
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

  return (
    <ul className="space-y-2" aria-labelledby={labelledBy}>
      {items.map((item) => {
        const relativeDate = formatRelative(item.date, locale);
        return (
          <li key={item.id} className="text-sm">
            <a
              href={`/chat/${item.chatId}`}
              className="font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              {item.title}
            </a>
            <div className="text-xs text-muted-foreground">
              <span className="mr-2 capitalize">{item.type}</span>
              · {relativeDate}
              {item.symbol && <span className="ml-2">{item.symbol}</span>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

