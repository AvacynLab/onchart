import type { InferSelectModel } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  json,
  uuid,
  text,
  primaryKey,
  foreignKey,
  boolean,
  doublePrecision,
  index,
} from 'drizzle-orm/pg-core';

export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull(),
  password: varchar('password', { length: 64 }),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable('Chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('createdAt').notNull(),
  title: text('title').notNull(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  visibility: varchar('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
});

export type Chat = InferSelectModel<typeof chat>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const messageDeprecated = pgTable('Message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  content: json('content').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = pgTable('Message_v2', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  parts: json('parts').notNull(),
  attachments: json('attachments').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const voteDeprecated = pgTable(
  'Vote',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => messageDeprecated.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = pgTable(
  'Vote_v2',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  'Document',
  {
    id: uuid('id').notNull().defaultRandom(),
    createdAt: timestamp('createdAt').notNull(),
    title: text('title').notNull(),
    content: text('content'),
    kind: varchar('text', { enum: ['text', 'code', 'image', 'sheet'] })
      .notNull()
      .default('text'),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  },
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  'Suggestion',
  {
    id: uuid('id').notNull().defaultRandom(),
    documentId: uuid('documentId').notNull(),
    documentCreatedAt: timestamp('documentCreatedAt').notNull(),
    originalText: text('originalText').notNull(),
    suggestedText: text('suggestedText').notNull(),
    description: text('description'),
    isResolved: boolean('isResolved').notNull().default(false),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  }),
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  'Stream',
  {
    id: uuid('id').notNull().defaultRandom(),
    chatId: uuid('chatId').notNull(),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  }),
);

export type Stream = InferSelectModel<typeof stream>;

// -- Financial module tables -------------------------------------------------

/**
 * Stores every raw tick received from the market WebSocket.
 * A composite primary key prevents duplicate ticks for the same symbol and timestamp.
 */
export const marketTick = pgTable(
  'market_tick',
  {
    symbol: varchar('symbol', { length: 16 }).notNull(),
    ts: timestamp('ts').notNull(),
    price: doublePrecision('price').notNull(),
    volume: doublePrecision('volume'),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.symbol, table.ts] }),
  }),
);

export type MarketTick = InferSelectModel<typeof marketTick>;

/**
 * Aggregated OHLCV candles derived from ticks. Each interval for a symbol is unique.
 */
export const candle = pgTable(
  'candle',
  {
    symbol: varchar('symbol', { length: 16 }).notNull(),
    interval: varchar('interval', { length: 8 }).notNull(),
    open: doublePrecision('open').notNull(),
    high: doublePrecision('high').notNull(),
    low: doublePrecision('low').notNull(),
    close: doublePrecision('close').notNull(),
    volume: doublePrecision('volume').notNull(),
    tsStart: timestamp('ts_start').notNull(),
    tsEnd: timestamp('ts_end').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.symbol, table.interval, table.tsStart] }),
    idxSymbolIntervalTs: index('idx_candle_symbol_interval_ts').on(
      table.symbol,
      table.interval,
      table.tsStart,
    ),
  }),
);

export type Candle = InferSelectModel<typeof candle>;

/**
 * Latest cached fundamentals for a given symbol stored as raw JSON from providers.
 */
export const fundamentals = pgTable('fundamentals', {
  symbol: varchar('symbol', { length: 16 }).primaryKey(),
  json: json('json').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export type Fundamentals = InferSelectModel<typeof fundamentals>;

/**
 * News or social sentiment entries associated with a market symbol.
 */
export const newsSentiment = pgTable('news_sentiment', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  symbol: varchar('symbol', { length: 16 }).notNull(),
  headline: text('headline').notNull(),
  url: text('url'),
  score: doublePrecision('score').notNull(),
  ts: timestamp('ts').notNull(),
});

export type NewsSentiment = InferSelectModel<typeof newsSentiment>;

/**
 * Symbols that the SaaS should track across all market workers.
 *
 * Storing the watchlist in the database allows runtime subscription updates
 * without redeploying services. Each entry is a unique ticker symbol.
 */
export const watchlist = pgTable('watchlist', {
  /** Ticker symbol, e.g. 'AAPL'. */
  symbol: varchar('symbol', { length: 16 }).primaryKey(),
});

export type Watchlist = InferSelectModel<typeof watchlist>;
