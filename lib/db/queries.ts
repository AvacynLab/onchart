import { createRequire } from 'node:module';

// Ensure this module is only used in a server context. `server-only` throws
// when evaluated on the client, but during Playwright tests no database is
// available, so skip the check to allow importing query helpers.
const require = createRequire(import.meta.url);
if (!process.env.PLAYWRIGHT) {
  require('server-only');
}

import {
  and,
  asc,
  avg,
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
  candle,
  fundamentals,
  type Candle,
  type Fundamentals,
  newsSentiment,
  type NewsSentiment,
} from './schema';
import type { ArtifactKind } from '@/components/artifact';
import { generateUUID } from '../utils';
import { generateHashedPassword } from './utils';
import type { VisibilityType } from '@/components/visibility-selector';
import { ChatSDKError } from '../errors';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

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

  // When running Playwright tests the database is not available. Return a
  // stubbed user object so authentication can proceed without a write.

  if (process.env.PLAYWRIGHT) {
    return [{ id: 'guest', email }];
  }

  try {
    return await db.insert(user).values({ email, password }).returning({
      id: user.id,
      email: user.email,
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create guest user',
    );
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

    const messageIds = messagesToDelete.map((message) => message.id);

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

    return streamIds.map(({ id }) => id);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get stream ids by chat id',
    );
  }
}

/**
 * Retrieve the most recent candles for a symbol and interval.
 *
 * Returns up to `limit` rows ordered chronologically ascending.
 *
 * @param symbol - Ticker symbol, e.g. `AAPL`.
 * @param interval - Candle interval such as `1m` or `1d`.
 * @param limit - Maximum number of rows to return (default 500).
 */
export async function getCandles({
  symbol,
  interval,
  limit = 500,
}: {
  symbol: string;
  interval: string;
  limit?: number;
}): Promise<Candle[]> {
  try {
    const rows = await db
      .select()
      .from(candle)
      .where(and(eq(candle.symbol, symbol), eq(candle.interval, interval)))
      .orderBy(desc(candle.tsStart))
      .limit(limit);

    // The query orders by most recent first; reverse so the oldest candle is first.
    return rows.reverse();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get candles by symbol and interval',
    );
  }
}

/**
 * Fetches the latest fundamentals entry for a given symbol.
 * Returns `null` when no fundamentals have been stored.
 */
export async function getFundamentals(
  symbol: string,
): Promise<Fundamentals | null> {
  try {
    const [row] = await db
      .select()
      .from(fundamentals)
      .where(eq(fundamentals.symbol, symbol))
      .limit(1);
    return row ?? null;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get fundamentals by symbol',
    );
  }
}

/**
 * Retrieve the most recent news sentiment entries for a given symbol.
 *
 * Each entry contains the headline, optional URL, sentiment score and the
 * timestamp when the article was recorded.
 *
 * @param symbol - Ticker to fetch news for.
 * @param limit - Maximum number of articles to return. Defaults to 5.
 */
export async function getLatestNews(
  symbol: string,
  limit = 5,
): Promise<Array<{ headline: string; url: string | null; score: number; ts: Date }>> {
  try {
    return await db
      .select({
        headline: newsSentiment.headline,
        url: newsSentiment.url,
        score: newsSentiment.score,
        ts: newsSentiment.ts,
      })
      .from(newsSentiment)
      .where(eq(newsSentiment.symbol, symbol))
      .orderBy(desc(newsSentiment.ts))
      .limit(limit);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get news by symbol',
    );
  }
}

/**
 * Aggregate sentiment scores for the last 24 hours for a given symbol.
 *
 * The function computes the overall average score and an hourly histogram
 * of average sentiment. Each histogram bucket represents the mean score
 * of all entries within that hour.
 *
 * @param symbol - Stock ticker to retrieve sentiment for.
 */
export async function getSentiment24h(
  symbol: string,
): Promise<{ score: number; histogram: Array<{ ts: Date; score: number }> }>
{
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const rows = await db
      .select({ ts: newsSentiment.ts, score: newsSentiment.score })
      .from(newsSentiment)
      .where(
        and(eq(newsSentiment.symbol, symbol), gte(newsSentiment.ts, since)),
      )
      .orderBy(asc(newsSentiment.ts));

    if (rows.length === 0) {
      return { score: 0, histogram: [] };
    }

    // Compute global average sentiment score.
    const total = rows.reduce((sum, r) => sum + r.score, 0);
    const average = total / rows.length;

    // Group scores by hour (3600000 ms) and compute average per bucket.
    const buckets = new Map<number, { sum: number; count: number }>();
    for (const r of rows) {
      const hour = Math.floor(r.ts.getTime() / 3_600_000) * 3_600_000;
      const bucket = buckets.get(hour) ?? { sum: 0, count: 0 };
      bucket.sum += r.score;
      bucket.count++;
      buckets.set(hour, bucket);
    }

    const histogram = Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([ts, { sum, count }]) => ({
        ts: new Date(ts),
        score: sum / count,
      }));

    return { score: average, histogram };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get sentiment by symbol',
    );
  }
}

/**
 * Retrieve symbols with the highest average news sentiment over the last day.
 *
 * The query computes the mean sentiment score per symbol for entries in the
 * past 24 hours, returning the top N symbols ordered by descending score.
 *
 * @param limit - Maximum number of symbols to return.
 */
export async function getTopSentimentSymbols(limit: number) {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const score = sql<number>`avg(${newsSentiment.score})`;

    return await db
      .select({ symbol: newsSentiment.symbol, score })
      .from(newsSentiment)
      .where(gte(newsSentiment.ts, since))
      .groupBy(newsSentiment.symbol)
      .orderBy(desc(score))
      .limit(limit);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get top sentiment symbols',
    );
  }
}
