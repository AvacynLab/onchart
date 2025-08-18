import * as cheerio from 'cheerio';
import { fetchWithRetry } from '../request';

/** Normalised news item returned by the aggregator */
export interface NewsItem {
  /** Headline text */
  title: string;
  /** URL pointing to the full article */
  url: string;
  /** Source identifier (e.g. yahoo, reuters) */
  source: string;
  /** Publication timestamp */
  publishedAt: Date;
  /** Optional short summary extracted from the feed */
  summary?: string;
}

/**
 * Extracts news items from a raw RSS/Atom XML string.
 * Uses cheerio in XML mode to parse items and pull basic fields.
 */
export function extractItems(xml: string, source: string): NewsItem[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const items: NewsItem[] = [];
  $('item').each((_, el) => {
    const title = $(el).find('title').first().text().trim();
    const link = $(el).find('link').first().text().trim();
    const pubDateText = $(el).find('pubDate').first().text().trim();
    const summary = $(el).find('description').first().text().trim();
    items.push({
      title,
      url: link,
      source,
      publishedAt: pubDateText ? new Date(pubDateText) : new Date(0),
      summary,
    });
  });
  return items;
}

/**
 * Fetches public RSS feeds related to a given symbol or keyword
 * from Yahoo Finance, Reuters and Nasdaq. Items are merged, filtered
 * by a time window and returned sorted by publication date.
 *
 * @param query Ticker symbol or free-text keyword
 * @param windowDays Number of days to look back (default 7)
 */
export async function fetchRssFeeds(
  query: string,
  windowDays = 7,
  fetcher: typeof fetch = fetch,
): Promise<NewsItem[]> {
  const feeds = [
    {
      url: `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(query)}&region=US&lang=en-US`,
      source: 'yahoo',
    },
    { url: 'https://feeds.reuters.com/reuters/businessNews', source: 'reuters' },
    {
      url: `https://www.nasdaq.com/feed/rssoutbound?symbol=${encodeURIComponent(query)}`,
      source: 'nasdaq',
    },
  ];

  const now = Date.now();
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const all: NewsItem[] = [];

  for (const { url, source } of feeds) {
    try {
      const res = await fetchWithRetry(url, { fetcher });
      const xml = await res.text();
      const items = extractItems(xml, source).filter(
        (i) => now - i.publishedAt.getTime() <= windowMs,
      );
      all.push(...items);
    } catch {
      // Ignore network errors so one failing feed doesn't break the call
    }
  }

  return all.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}
