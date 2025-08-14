import { useState } from 'react';
import BentoCard from '../BentoCard';
import type { Analysis, Research } from '@/lib/db/schema';
import AnalysesTileEmpty from '../empty/AnalysesTileEmpty';
import { useTranslations, useLocale } from 'next-intl';
import { getTranslations, getLocale } from 'next-intl/server';

/**
 * Format a date into a human readable relative string using
 * Intl.RelativeTimeFormat. Chooses the largest appropriate unit among
 * seconds, minutes, hours and days.
 */
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

/** Summary information used by the analyses tile list */
export interface AnalysisSummary {
  id: string;
  chatId: string;
  title: string;
  type: string;
  date: Date;
  symbol?: string;
}

/** Group of analyses associated with a specific chat */
export interface AnalysisGroup {
  chatId: string;
  chatTitle: string;
  lastMessage?: string;
  items: AnalysisSummary[];
}

/**
 * Pure presentational component rendering a list of analysis summaries.
 * Exported for unit testing.
 */
export function AnalysisList({
  items,
  locale,
  emptyLabel,
  labelledBy,
}: {
  /** Analyses and research summaries to render */
  items: AnalysisSummary[];
  /** Active UI locale */
  locale: string;
  /** Localised empty state text */
  emptyLabel: string;
  /** id of title used for aria-labelledby */
  labelledBy: string;
}) {
  if (items.length === 0) {
    return <AnalysesTileEmpty message={emptyLabel} />;
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

/**
 * Render analysis summaries grouped by chat with optional last-message context.
 * Exported for unit testing.
 */
export function AnalysisGroupList({
  groups,
  locale,
  emptyLabel,
  labelledBy,
}: {
  /** Groups of analyses keyed by chat */
  groups: AnalysisGroup[];
  /** Active UI locale */
  locale: string;
  /** Localised empty state text */
  emptyLabel: string;
  /** id of title announcing the list */
  labelledBy: string;
}) {
  if (groups.length === 0) {
    return <AnalysesTileEmpty message={emptyLabel} />;
  }
  return (
    <div className="space-y-4" aria-labelledby={labelledBy}>
      {groups.map((g) => (
        <div key={g.chatId}>
          <h3 className="font-semibold text-sm">
            <a
              href={`/chat/${g.chatId}`}
              className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              {g.chatTitle}
            </a>
          </h3>
          {g.lastMessage && (
            <p className="text-xs text-muted-foreground mb-1 line-clamp-1">
              {g.lastMessage}
            </p>
          )}
          <AnalysisList
            items={g.items}
            locale={locale}
            emptyLabel={emptyLabel}
            labelledBy={labelledBy}
          />
        </div>
      ))}
    </div>
  );
}

/** Client component implementing simple filtering by type and symbol */
export function AnalysesClient({
  items,
  titleId,
}: {
  items: AnalysisSummary[];
  titleId: string;
}) {
  'use client';
  const t = useTranslations('dashboard.analyses');
  const locale = useLocale();
  const [typeFilter, setTypeFilter] = useState('');
  const [symbolFilter, setSymbolFilter] = useState('');

  const filtered = items.filter((i) => {
    const typeMatch = typeFilter ? i.type === typeFilter : true;
    const symbolMatch = symbolFilter
      ? i.symbol?.toLowerCase().includes(symbolFilter.toLowerCase())
      : true;
    return typeMatch && symbolMatch;
  });

  const uniqueTypes = Array.from(new Set(items.map((i) => i.type)));

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <select
          aria-label={t('filters.typeLabel')}
          className="border p-1 text-sm"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">{t('filters.allTypes')}</option>
          {uniqueTypes.map((tVal) => (
            <option key={tVal} value={tVal} className="capitalize">
              {tVal}
            </option>
          ))}
        </select>
        <input
          aria-label={t('filters.symbolLabel')}
          type="text"
          placeholder={t('filters.symbol')}
          className="border p-1 text-sm flex-1"
          value={symbolFilter}
          onChange={(e) => setSymbolFilter(e.target.value)}
        />
      </div>
      <AnalysisList
        items={filtered}
        locale={locale}
        emptyLabel={t('empty')}
        labelledBy={titleId}
      />
    </div>
  );
}

async function fetchAnalyses(chatId?: string): Promise<AnalysisSummary[]> {
  if (!chatId) return [];
  // Avoid importing the database layer when no connection string is provided
  // (e.g. during tests) to prevent runtime errors.
  if (!process.env.POSTGRES_URL) return [];
  try {
    const { listAnalysesByChatId, listResearchByChatId } = await import(
      '@/lib/db/queries'
    );
    const [analyses, researchDocs] = await Promise.all([
      listAnalysesByChatId({ chatId }),
      listResearchByChatId({ chatId }),
    ]);

    const mapAnalysis = (a: Analysis): AnalysisSummary => ({
      id: a.id,
      chatId: a.chatId,
      title: a.type,
      type: a.type,
      date: a.createdAt,
      symbol: (a.input as any)?.symbol,
    });

    const mapResearch = (r: Research): AnalysisSummary => ({
      id: r.id,
      chatId: r.chatId,
      title: r.title,
      type: r.kind,
      date: r.updatedAt,
    });

    return [...analyses.map(mapAnalysis), ...researchDocs.map(mapResearch)].sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    );
  } catch (err) {
    console.error('failed to load analyses', err);
    return [];
  }
}

/**
 * Fetch analyses and research across all user chats and group them by chat id.
 */
async function fetchAnalysesGrouped(): Promise<AnalysisGroup[]> {
  // Skip database access when the connection string is missing so the
  // dashboard can render in offline environments.
  if (!process.env.POSTGRES_URL) return [];
  try {
    const { auth } = await import('@/app/(auth)/auth');
    const session = await auth();
    if (!session) return [];
    const {
      listAnalysesAndResearchByUser,
      getLastMessagesByChatIds,
    } = await import('@/lib/db/queries');
    const rows = await listAnalysesAndResearchByUser({
      userId: session.user.id,
    });
    const groups = new Map<string, AnalysisGroup>();
    for (const row of rows) {
      const item: AnalysisSummary = {
        id: row.id,
        chatId: row.chatId,
        title: row.title,
        type: row.type,
        date: row.date,
      };
      const existing = groups.get(row.chatId);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.set(row.chatId, {
          chatId: row.chatId,
          chatTitle: row.chatTitle,
          items: [item],
        });
      }
    }
    const chatIds = Array.from(groups.keys());
    const lastMessages = await getLastMessagesByChatIds({ chatIds });
    const textFromParts = (parts: any): string | undefined => {
      const part = Array.isArray(parts)
        ? parts.find((p: any) => p.type === 'text')
        : undefined;
      return part?.text as string | undefined;
    };
    const map = new Map(
      lastMessages.map((m) => [m.chatId, textFromParts(m.parts)]),
    );

    return Array.from(groups.values()).map((g) => ({
      ...g,
      items: g.items
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 3),
      lastMessage: map.get(g.chatId),
    }));
  } catch (err) {
    console.error('failed to load analyses', err);
    return [];
  }
}

/**
 * Server component listing analyses and research documents for the given chat.
 */
export default async function AnalysesTile({
  chatId,
}: {
  chatId?: string;
}) {
  const locale = await getLocale();
  const t = await getTranslations('dashboard');
  // Generate a deterministic id for accessibility without relying on React
  // hooks (server components cannot use `useId`).
  const titleId = `analyses-${Math.random().toString(36).slice(2)}`;

  if (chatId) {
    const items = await fetchAnalyses(chatId);
    return (
      <BentoCard title={t('analyses.title')} titleId={titleId}>
        <AnalysesClient items={items} titleId={titleId} />
      </BentoCard>
    );
  }
  const groups = await fetchAnalysesGrouped();
  return (
    <BentoCard title={t('analyses.title')} titleId={titleId}>
      <AnalysisGroupList
        groups={groups}
        locale={locale}
        emptyLabel={t('analyses.empty')}
        labelledBy={titleId}
      />
    </BentoCard>
  );
}
