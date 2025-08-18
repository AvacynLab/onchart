import 'server-only';

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  sql,
  type SQL,
} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  message,
  vote,
  type DBMessage,
  type Chat,
  stream,
  analysis,
  research,
  attentionMarker,
  strategy,
  strategyVersion,
  strategyBacktest,
  userSettings,
} from './schema';
import type { ArtifactKind } from '@/components/artifact';
import { generateUUID } from '../utils';
import { generateHashedPassword } from './utils';
import type { VisibilityType } from '@/components/visibility-selector';
import { ChatSDKError } from '../errors';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

let client: any;
const url = process.env.POSTGRES_URL;
try {
  client = url && url !== 'undefined' ? postgres(url) : undefined;
} catch {
  client = undefined;
}
const db = client ? drizzle(client) : ({} as any);

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get user by email',
    );
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);

  try {
    return await db.insert(user).values({ email, password: hashedPassword });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create user');
  }
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());
  // When no database connection is available (e.g. in CI or ephemeral
  // environments), return a synthetic guest user so the application can still
  // operate. This prevents sign-in flows from failing when Postgres is
  // unreachable. The id is generated locally and not persisted.
  if (!process.env.POSTGRES_URL) {
    return [{ id: generateUUID(), email }];
  }

  try {
    return await db.insert(user).values({ email, password }).returning({
      id: user.id,
      email: user.email,
    });
  } catch (error) {
    console.error('failed to create guest user', error);
    return [{ id: generateUUID(), email }];
  }
}

// Récupérer la langue préférée d'un utilisateur depuis la base.
export async function getUserSettings(
  userId: string,
): Promise<string | null> {
  try {
    if (!client) return null;
    const [row] = await db
      .select({ preferredLocale: userSettings.preferredLocale })
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);
    return row?.preferredLocale ?? null;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get user settings');
  }
}

// Enregistrer ou mettre à jour la langue préférée d'un utilisateur.
export async function setUserPreferredLocale(
  userId: string,
  locale: 'fr' | 'en',
) {
  if (!client) return;
  try {
    await db
      .insert(userSettings)
      .values({ userId, preferredLocale: locale, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: { preferredLocale: locale, updatedAt: new Date() },
      });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to set user preferred locale');
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save chat');
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));

    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();
    return chatsDeleted;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete chat by id',
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id),
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Array<Chat> = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${startingAfter} not found`,
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${endingBefore} not found`,
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get chats by user id',
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get chat by id');
  }
}

export async function saveMessages({
  messages,
}: {
  messages: Array<DBMessage>;
}) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save messages');
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get messages by chat id',
    );
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to vote message');
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get votes by chat id',
    );
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      })
      .returning();
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save document');
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get documents by id',
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get document by id',
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete documents by id after timestamp',
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to save suggestions',
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get suggestions by document id',
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message by id',
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );

    const messageIds = messagesToDelete.map((m: { id: string }) => m.id);

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)),
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds)),
        );
    }
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete messages by chat id after timestamp',
    );
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update chat visibility by id',
    );
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: { id: string; differenceInHours: number }) {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000,
    );

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, twentyFourHoursAgo),
          eq(message.role, 'user'),
        ),
      )
      .execute();

    return stats?.count ?? 0;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message count by user id',
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await db
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create stream id',
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }: { id: string }) => id);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get stream ids by chat id',
    );
  }
}

// Save an analysis result produced by a finance tool.
export async function saveAnalysis({
  userId,
  chatId,
  type,
  input,
  output,
}: {
  userId: string;
  chatId: string;
  type: string;
  input: unknown;
  output: unknown;
}) {
  try {
    await db.insert(analysis).values({
      id: generateUUID(),
      userId,
      chatId,
      type,
      input,
      output,
      createdAt: new Date(),
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to save analysis',
    );
  }
}

// Retrieve analyses linked to a specific chat, ordered from newest to oldest.
export async function listAnalysesByChatId({
  chatId,
}: {
  chatId: string;
}) {
  try {
    return await db
      .select()
      .from(analysis)
      .where(eq(analysis.chatId, chatId))
      .orderBy(desc(analysis.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to list analyses by chat id',
    );
  }
}

// Create a new research document.
export async function createResearch({
  userId,
  chatId,
  kind,
  title,
  sections,
}: {
  userId: string;
  chatId: string;
  kind: 'opportunity' | 'asset_deep_dive' | 'ft_report' | 'general';
  title: string;
  sections: unknown;
}) {
  try {
    const [created] = await db
      .insert(research)
      .values({
        id: generateUUID(),
        userId,
        chatId,
        kind,
        title,
        sections,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return created;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create research document',
    );
  }
}

// Update an existing research document.
export async function updateResearch({
  id,
  sections,
  title,
}: {
  id: string;
  sections?: unknown;
  title?: string;
}) {
  try {
    const [updated] = await db
      .update(research)
      .set({
        ...(sections !== undefined ? { sections } : {}),
        ...(title !== undefined ? { title } : {}),
        updatedAt: new Date(),
      })
      .where(eq(research.id, id))
      .returning();
    return updated;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update research document',
    );
  }
}

// Fetch a research document by its identifier.
export async function getResearchById({
  id,
}: {
  id: string;
}) {
  try {
    const [doc] = await db
      .select()
      .from(research)
      .where(eq(research.id, id))
      .limit(1);
    return doc;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get research by id',
    );
  }
}

// List all research documents for a chat.
export async function listResearchByChatId({
  chatId,
}: {
  chatId: string;
}) {
  try {
    return await db
      .select()
      .from(research)
      .where(eq(research.chatId, chatId))
      .orderBy(desc(research.updatedAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to list research by chat id',
    );
  }
}

// Query analysis and strategy documents for a given asset.
export async function queryDocuments({
  asset,
  timeframe,
  kind = 'analysis',
  limit = 20,
  offset = 0,
}: {
  asset: string;
  timeframe?: string;
  kind?: 'analysis' | 'strategy';
  limit?: number;
  offset?: number;
}) {
  try {
    if (kind === 'strategy') {
      const where = sql`${strategy.universe}::text ILIKE ${'%' + asset + '%'}`;
      const [totalRow] = await db
        .select({ value: count() })
        .from(strategy)
        .where(where);
      const items = await db
        .select({
          id: strategy.id,
          title: strategy.title,
          kind: sql<'strategy'>`'strategy'`.as('kind'),
          createdAt: strategy.updatedAt,
        })
        .from(strategy)
        .where(where)
        .orderBy(desc(strategy.updatedAt))
        .limit(limit)
        .offset(offset);
      return { items, total: Number(totalRow?.value ?? 0) };
    }

    const conditions: SQL[] = [
      sql`${analysis.input} ->> 'symbol' = ${asset}`,
    ];
    if (timeframe) {
      conditions.push(
        sql`${analysis.input} ->> 'timeframe' = ${timeframe}`,
      );
    }
    const where = and(...conditions);
    const [totalRow] = await db
      .select({ value: count() })
      .from(analysis)
      .where(where);
    const items = await db
      .select({
        id: analysis.id,
        title: analysis.type,
        kind: sql<'analysis'>`'analysis'`.as('kind'),
        createdAt: analysis.createdAt,
      })
      .from(analysis)
      .where(where)
      .orderBy(desc(analysis.createdAt))
      .limit(limit)
      .offset(offset);
    return { items, total: Number(totalRow?.value ?? 0) };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to query documents',
    );
  }
}

// Persist a chart annotation created by the agent.
export async function saveAttentionMarker({
  userId,
  chatId,
  symbol,
  timeframe,
  payload,
}: {
  userId: string;
  chatId: string;
  symbol: string;
  timeframe: string;
  payload: unknown;
}): Promise<string> {
  const id = generateUUID();
  try {
    await db.insert(attentionMarker).values({
      id,
      userId,
      chatId,
      symbol,
      timeframe,
      payload,
      createdAt: new Date(),
    });
    return id;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to save attention marker',
    );
  }
}

// Retrieve attention markers filtered by chat, symbol and timeframe.
export async function listAttentionMarkers({
  chatId,
  symbol,
  timeframe,
}: {
  chatId: string;
  symbol: string;
  timeframe: string;
}) {
  try {
    return await db
      .select()
      .from(attentionMarker)
      .where(
        and(
          eq(attentionMarker.chatId, chatId),
          eq(attentionMarker.symbol, symbol),
          eq(attentionMarker.timeframe, timeframe),
        ),
      )
      .orderBy(desc(attentionMarker.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to list attention markers',
    );
  }
}

// Delete a previously saved attention marker by its identifier.
export async function deleteAttentionMarker({
  id,
}: {
  id: string;
}) {
  try {
    await db.delete(attentionMarker).where(eq(attentionMarker.id, id));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete attention marker',
    );
  }
}

// --- Strategy persistence helpers ---

export async function createStrategy({
  userId,
  chatId,
  title,
  universe,
  constraints,
  status = 'draft',
}: {
  userId: string;
  chatId: string;
  title: string;
  universe: unknown;
  constraints: unknown;
  status?: 'draft' | 'proposed' | 'validated';
}) {
  try {
    const [row] = await db
      .insert(strategy)
      .values({
        userId,
        chatId,
        title,
        universe,
        constraints,
        status,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return row;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create strategy');
  }
}

export async function listStrategiesByChat({
  chatId,
  cursor,
  limit = 10,
}: {
  chatId: string;
  /** Return entries strictly older than this timestamp */
  cursor?: Date;
  /** Maximum number of rows to return */
  limit?: number;
}) {
  // In test environments the `POSTGRES_URL` may be unset. Avoid attempting a
  // database query and instead return an empty page so callers can operate
  // without persistent storage.
  if (!process.env.POSTGRES_URL) {
    return { items: [], nextCursor: null };
  }
  try {
    const rows = await db
      .select()
      .from(strategy)
      .where(
        cursor
          ? and(eq(strategy.chatId, chatId), lt(strategy.updatedAt, cursor))
          : eq(strategy.chatId, chatId),
      )
      .orderBy(desc(strategy.updatedAt))
      .limit(limit + 1); // Fetch one extra to detect next page

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore
      ? items[items.length - 1]?.updatedAt ?? null
      : null;
    return { items, nextCursor };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to list strategies by chat',
    );
  }
}

export async function getStrategyById({
  id,
}: {
  id: string;
}) {
  try {
    const [row] = await db
      .select()
      .from(strategy)
      .where(eq(strategy.id, id));
    return row;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get strategy by id',
    );
  }
}

export async function createStrategyVersion({
  strategyId,
  description,
  rules,
  params,
  notes,
}: {
  strategyId: string;
  description?: string;
  rules: unknown;
  params: unknown;
  notes?: string;
}) {
  try {
    const [row] = await db
      .insert(strategyVersion)
      .values({
        strategyId,
        description,
        rules,
        params,
        notes,
        createdAt: new Date(),
      })
      .returning();
    return row;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create strategy version',
    );
  }
}

export async function saveBacktest({
  strategyVersionId,
  symbolSet,
  window,
  metrics,
  equityCurve,
  assumptions,
}: {
  strategyVersionId: string;
  symbolSet: unknown;
  window: unknown;
  metrics: unknown;
  equityCurve: unknown;
  assumptions: unknown;
}) {
  try {
    const [row] = await db
      .insert(strategyBacktest)
      .values({
        strategyVersionId,
        symbolSet,
        window,
        metrics,
        equityCurve,
        assumptions,
        createdAt: new Date(),
      })
      .returning();
    return row;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to save strategy backtest',
    );
  }
}

export async function getStrategyVersion({
  id,
}: {
  id: string;
}) {
  try {
    const [row] = await db
      .select()
      .from(strategyVersion)
      .where(eq(strategyVersion.id, id));
    return row;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get strategy version',
    );
  }
}

export async function updateStrategyStatus({
  id,
  status,
}: {
  id: string;
  status: 'draft' | 'proposed' | 'validated';
}) {
  try {
    const [row] = await db
      .update(strategy)
      .set({ status, updatedAt: new Date() })
      .where(eq(strategy.id, id))
      .returning();
    return row;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update strategy status',
    );
  }
}

/**
 * Fetch the latest message for a list of chats in a single query to avoid N+1 lookups.
 * Returns one entry per chat id with the raw message parts.
 */
export async function getLastMessagesByChatIds({
  chatIds,
}: {
  chatIds: string[];
}) {
  if (chatIds.length === 0) return [];
  try {
    const rows = await db
      .select({
        chatId: message.chatId,
        parts: message.parts,
        createdAt: message.createdAt,
      })
      .from(message)
      .where(inArray(message.chatId, chatIds))
      .orderBy(desc(message.createdAt));
    const latest = new Map<string, { chatId: string; parts: unknown }>();
    for (const row of rows) {
      if (!latest.has(row.chatId)) {
        latest.set(row.chatId, { chatId: row.chatId, parts: row.parts });
      }
    }
    return Array.from(latest.values());
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get last messages by chat ids',
    );
  }
}

/**
 * List all strategies for chats belonging to a user.
 */
export async function listStrategiesByUser({
  userId,
}: {
  userId: string;
}) {
  try {
    return await db
      .select({ strategy, chat })
      .from(strategy)
      .innerJoin(chat, eq(strategy.chatId, chat.id))
      .where(eq(chat.userId, userId))
      .orderBy(desc(strategy.updatedAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to list strategies by user',
    );
  }
}

/**
 * List analyses and research documents for chats belonging to a user.
 */
export async function listAnalysesAndResearchByUser({
  userId,
}: {
  userId: string;
}) {
  try {
    const analysesRows = await db
      .select({
        id: analysis.id,
        chatId: analysis.chatId,
        chatTitle: chat.title,
        type: analysis.type,
        date: analysis.createdAt,
        title: analysis.type,
        input: analysis.input,
      })
      .from(analysis)
      .innerJoin(chat, eq(analysis.chatId, chat.id))
      .where(eq(chat.userId, userId));

    const researchRows = await db
      .select({
        id: research.id,
        chatId: research.chatId,
        chatTitle: chat.title,
        type: research.kind,
        date: research.updatedAt,
        title: research.title,
      })
      .from(research)
      .innerJoin(chat, eq(research.chatId, chat.id))
      .where(eq(chat.userId, userId));

    return [...analysesRows, ...researchRows];
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to list analyses and research by user',
    );
  }
}
