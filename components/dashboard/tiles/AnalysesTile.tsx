import React from 'react';
import BentoCard from '../BentoCard';
import type { Analysis, Research } from '@/lib/db/schema';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import AnalysesTileEmpty from '../empty/AnalysesTileEmpty';

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
export function AnalysisList({ items }: { items: AnalysisSummary[] }) {
  if (items.length === 0) {
    return <AnalysesTileEmpty />;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const relativeDate = formatDistanceToNow(item.date, {
          addSuffix: true,
          locale: fr,
        });
        return (
          <li key={item.id} className="text-sm">
            <a
              href={`/chat/${item.chatId}`}
              className="font-medium hover:underline"
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
export function AnalysisGroupList({ groups }: { groups: AnalysisGroup[] }) {
  if (groups.length === 0) {
    return <AnalysesTileEmpty />;
  }
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.chatId}>
          <h3 className="font-semibold text-sm">
            <a href={`/chat/${g.chatId}`} className="hover:underline">
              {g.chatTitle}
            </a>
          </h3>
          {g.lastMessage && (
            <p className="text-xs text-muted-foreground mb-1 line-clamp-1">
              {g.lastMessage}
            </p>
          )}
          <AnalysisList items={g.items} />
        </div>
      ))}
    </div>
  );
}

/** Client component implementing simple filtering by type and symbol */
export function AnalysesClient({ items }: { items: AnalysisSummary[] }) {
  'use client';
  const [typeFilter, setTypeFilter] = React.useState('');
  const [symbolFilter, setSymbolFilter] = React.useState('');

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
          aria-label="Filtrer par type"
          className="border p-1 text-sm"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">Tous les types</option>
          {uniqueTypes.map((t) => (
            <option key={t} value={t} className="capitalize">
              {t}
            </option>
          ))}
        </select>
        <input
          aria-label="Filtrer par symbole"
          type="text"
          placeholder="Symbole"
          className="border p-1 text-sm flex-1"
          value={symbolFilter}
          onChange={(e) => setSymbolFilter(e.target.value)}
        />
      </div>
      <AnalysisList items={filtered} />
    </div>
  );
}

async function fetchAnalyses(chatId?: string): Promise<AnalysisSummary[]> {
  if (!chatId) return [];
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
}

/**
 * Fetch analyses and research across all user chats and group them by chat id.
 */
async function fetchAnalysesGrouped(): Promise<AnalysisGroup[]> {
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
  const map = new Map(lastMessages.map((m) => [m.chatId, textFromParts(m.parts)]));

  return Array.from(groups.values()).map((g) => ({
    ...g,
    items: g.items
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 3),
    lastMessage: map.get(g.chatId),
  }));
}

/**
 * Server component listing analyses and research documents for the given chat.
 */
export default async function AnalysesTile({
  chatId,
}: {
  chatId?: string;
}) {
  if (chatId) {
    const items = await fetchAnalyses(chatId);
    return (
      <BentoCard title="Mes analyses">
        <AnalysesClient items={items} />
      </BentoCard>
    );
  }
  const groups = await fetchAnalysesGrouped();
  return (
    <BentoCard title="Mes analyses">
      <AnalysisGroupList groups={groups} />
    </BentoCard>
  );
}
