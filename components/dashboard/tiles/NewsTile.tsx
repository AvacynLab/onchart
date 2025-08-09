import React from 'react';
import BentoCard from '../BentoCard';
import type { NewsItem } from '@/lib/finance/sources/news';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import NewsTileEmpty from '../empty/NewsTileEmpty';

/**
 * Simple helper removing any HTML tags from an RSS description in order
 * to mitigate XSS when rendering untrusted feed content.
 */
function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Pure presentational component rendering a list of news entries.
 * Exported for unit testing.
 */
export function NewsList({ items }: { items: NewsItem[] }) {
  if (items.length === 0) {
    return <NewsTileEmpty />;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const hostname = (() => {
          try {
            return new URL(item.link).hostname.replace(/^www\./, '');
          } catch {
            return '';
          }
        })();

        const relativeDate = formatDistanceToNow(new Date(item.pubDate), {
          addSuffix: true,
          locale: fr,
        });

        return (
          <li key={item.link} className="text-sm">
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:underline"
            >
              {item.title}
            </a>
            <div className="text-xs text-muted-foreground">
              {hostname} · {relativeDate}
            </div>
            {item.summary && (
              <p className="text-xs mt-1">{stripHtml(item.summary)}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Server component fetching latest business news via the existing API route
 * and rendering them within a Bento card. Results are fetched on the server
 * to allow initial render with data before hydration.
 */
export default async function NewsTile() {
  let items: NewsItem[] = [];
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/finance/news?query=business`, {
      cache: 'no-store',
    });
    if (res.ok) {
      items = (await res.json()) as NewsItem[];
    }
  } catch (err) {
    console.error('failed to load news', err);
  }

  return (
    <BentoCard title="Dernières news">
      <NewsList items={items} />
    </BentoCard>
  );
}

