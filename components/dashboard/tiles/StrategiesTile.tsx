import React from 'react';
import type { Strategy } from '@/lib/db/schema';
import StrategyCard from '@/components/finance/StrategyCard';
import StrategiesTileClient from './StrategiesTileClient';
import StrategiesTileEmpty from '../empty/StrategiesTileEmpty';
import BentoCard from '../BentoCard';

export interface StrategyPage {
  items: Strategy[];
  nextCursor: string | null;
}

/** Fetch a page of strategies for a given chat. */
export async function fetchStrategies(
  chatId?: string,
  cursor?: string,
): Promise<StrategyPage> {
  if (!chatId) return { items: [], nextCursor: null };
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : 'http://localhost:3000';
    const params = new URLSearchParams({ chatId });
    if (cursor) params.set('cursor', cursor);
    const res = await fetch(
      `${baseUrl}/api/finance/strategy?${params.toString()}`,
      { cache: 'no-store' },
    );
    if (res.ok) {
      return (await res.json()) as StrategyPage;
    }
  } catch (err) {
    console.error('failed to load strategies', err);
  }
  return { items: [], nextCursor: null };
}

/** Fetch strategies across all chats for the current user and group them by chat id. */
async function fetchStrategiesGrouped(): Promise<StrategyGroup[]> {
  const { auth } = await import('@/app/(auth)/auth');
  const session = await auth();
  if (!session) return [];
  const { listStrategiesByUser, getLastMessagesByChatIds } = await import(
    '@/lib/db/queries'
  );
  const rows = await listStrategiesByUser({ userId: session.user.id });
  const groups = new Map<string, StrategyGroup>();
  for (const row of rows) {
    const existing = groups.get(row.chat.id);
    if (existing) {
      existing.items.push(row.strategy);
    } else {
      groups.set(row.chat.id, {
        chatId: row.chat.id,
        chatTitle: row.chat.title,
        items: [row.strategy],
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
    items: g.items.sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    ),
    lastMessage: map.get(g.chatId),
  }));
}

export function StrategyList({ items }: { items: Strategy[] }) {
  if (items.length === 0) {
    return <StrategiesTileEmpty />;
  }
  return (
    <ul className="space-y-2">
      {items.map((s) => (
        <li key={s.id}>
          <StrategyCard strategy={s} />
        </li>
      ))}
    </ul>
  );
}

/** Group of strategies belonging to a specific chat */
export interface StrategyGroup {
  chatId: string;
  chatTitle: string;
  lastMessage?: string;
  items: Strategy[];
}

/**
 * Render grouped strategies with chat context.
 * Exported for unit testing.
 */
export function StrategyGroupList({ groups }: { groups: StrategyGroup[] }) {
  if (groups.length === 0) {
    return <StrategiesTileEmpty />;
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
          <StrategyList items={g.items} />
        </div>
      ))}
    </div>
  );
}

/**
 * Server component fetching strategies then delegating rendering to the client
 * component which also handles creation through the wizard.
 */
export default async function StrategiesTile({
  chatId,
}: {
  chatId?: string;
}) {
  if (chatId) {
    const page = await fetchStrategies(chatId);
    return (
      <StrategiesTileClient
        initial={page.items}
        chatId={chatId}
        initialCursor={page.nextCursor}
      />
    );
  }
  const groups = await fetchStrategiesGrouped();
  return (
    <BentoCard title="Mes stratégies">
      <StrategyGroupList groups={groups} />
    </BentoCard>
  );
}

