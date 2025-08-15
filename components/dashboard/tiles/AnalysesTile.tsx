import React from 'react';
import BentoCard from '../BentoCard';
import type { Analysis, Research } from '@/lib/db/schema';
import AnalysesTileEmpty from '../empty/AnalysesTileEmpty';
import { getLocale } from 'next-intl/server';
import AnalysesTileClient from './AnalysesTileClient';
import AnalysisList from './AnalysisList';
import fr from '@/messages/fr/dashboard.json' assert { type: 'json' };
import en from '@/messages/en/dashboard.json' assert { type: 'json' };

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
  const messages = locale === 'en' ? (en as any) : (fr as any);
  // Generate a deterministic id for accessibility without relying on React
  // hooks (server components cannot use `useId`).
  const titleId = `analyses-${Math.random().toString(36).slice(2)}`;

  if (chatId) {
    const items = await fetchAnalyses(chatId);
    return (
      <BentoCard title={messages.analyses.title} titleId={titleId}>
        <AnalysesTileClient items={items} titleId={titleId} />
      </BentoCard>
    );
  }
  const groups = await fetchAnalysesGrouped();
  return (
    <BentoCard title={messages.analyses.title} titleId={titleId}>
      <AnalysisGroupList
        groups={groups}
        locale={locale}
        emptyLabel={messages.analyses.empty}
        labelledBy={titleId}
      />
    </BentoCard>
  );
}
