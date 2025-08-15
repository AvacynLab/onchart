import { getLocale } from 'next-intl/server';
import type { Strategy } from '@/lib/db/schema';
import StrategyCard from '@/components/finance/StrategyCard';
import StrategiesTileClient from './StrategiesTileClient';
import StrategiesTileEmpty from '../empty/StrategiesTileEmpty';
import BentoCard from '../BentoCard';
import fr from '@/messages/fr/dashboard.json' assert { type: 'json' };
import en from '@/messages/en/dashboard.json' assert { type: 'json' };

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
    // Build the absolute URL to the API using either the deployed Vercel domain
    // or the port of the local dev server. Playwright sets `PORT` explicitly so
    // internal fetches work during tests.
    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : `http://localhost:${process.env.PORT ?? 3000}`;
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
  // In test environments the database connection string is absent. Skip any
  // queries and return an empty list so the dashboard can render without
  // hitting Postgres.
  if (!process.env.POSTGRES_URL) return [];
  try {
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
    const map = new Map(
      lastMessages.map((m) => [m.chatId, textFromParts(m.parts)]),
    );

    return Array.from(groups.values()).map((g) => ({
      ...g,
      items: g.items.sort(
        (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
      ),
      lastMessage: map.get(g.chatId),
    }));
  } catch (err) {
    console.error('failed to load strategies', err);
    return [];
  }
}

export function StrategyList({
  items,
  labelledBy,
  messages,
}: {
  items: Strategy[];
  labelledBy: string;
  messages: any;
}) {
  if (items.length === 0) {
    return <StrategiesTileEmpty message={messages.strategies.empty} />;
  }
  return (
    <ul className="space-y-2" aria-labelledby={labelledBy}>
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
export function StrategyGroupList({
  groups,
  labelledBy,
  messages,
}: {
  groups: StrategyGroup[];
  labelledBy: string;
  messages: any;
}) {
  if (groups.length === 0) {
    return <StrategiesTileEmpty message={messages.strategies.empty} />;
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
          <StrategyList
            items={g.items}
            labelledBy={labelledBy}
            messages={messages}
          />
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
  const locale = await getLocale();
  const messages = locale === 'en' ? (en as any) : (fr as any);
  const titleId = `strategies-${Math.random().toString(36).slice(2)}`;
  const titleTestId = 'tile-strategies-title';
  if (chatId) {
    const page = await fetchStrategies(chatId);
    return (
      <StrategiesTileClient
        initial={page.items}
        chatId={chatId}
        initialCursor={page.nextCursor}
        titleId={titleId}
        titleTestId={titleTestId}
      />
    );
  }
  const groups = await fetchStrategiesGrouped();
  return (
    <BentoCard
      title={messages.strategies.title}
      titleId={titleId}
      titleTestId={titleTestId}
    >
      <StrategyGroupList
        groups={groups}
        labelledBy={titleId}
        messages={messages}
      />
    </BentoCard>
  );
}
