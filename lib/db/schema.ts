import type { InferSelectModel } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  json,
  jsonb,
  uuid,
  text,
  primaryKey,
  foreignKey,
  boolean,
  index,
} from 'drizzle-orm/pg-core';

export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull(),
  password: varchar('password', { length: 64 }),
});

export type User = InferSelectModel<typeof user>;

// Préférences utilisateur persistées, notamment la langue choisie.
export const userSettings = pgTable(
  'UserSettings',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    preferredLocale: varchar('preferredLocale', { enum: ['fr', 'en'] }).notNull(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('usersettings_user_idx').on(t.userId),
  }),
);

export type UserSettings = InferSelectModel<typeof userSettings>;

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

export const analysis = pgTable('Analysis', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  type: varchar('type', { length: 32 }).notNull(),
  input: jsonb('input').notNull(),
  output: jsonb('output').notNull(),
  createdAt: timestamp('createdAt').notNull(),
},
// Composite index accelerates per-chat queries ordered by creation time.
(t) => ({
  chatCreatedIdx: index('analysis_chat_created_idx').on(t.chatId, t.createdAt),
}));

export type Analysis = InferSelectModel<typeof analysis>;

export const research = pgTable('Research', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  kind: varchar('kind', {
    enum: ['opportunity', 'asset_deep_dive', 'ft_report', 'general'],
  }).notNull(),
  title: text('title').notNull(),
  sections: jsonb('sections').notNull(),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
},
// Optimise retrieval of research docs per chat by latest update.
(t) => ({
  chatUpdatedIdx: index('research_chat_updated_idx').on(t.chatId, t.updatedAt),
}));

export type Research = InferSelectModel<typeof research>;

export const attentionMarker = pgTable('AttentionMarker', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  symbol: varchar('symbol', { length: 32 }).notNull(),
  timeframe: varchar('timeframe', { length: 16 }).notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type AttentionMarker = InferSelectModel<typeof attentionMarker>;

export const strategy = pgTable('Strategy', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  title: text('title').notNull(),
  universe: jsonb('universe').notNull(),
  constraints: jsonb('constraints').notNull(),
  status: varchar('status', {
    enum: ['draft', 'proposed', 'validated'],
    length: 16,
  })
    .notNull()
    .default('draft'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
},
// Enable fast retrieval of strategies per chat sorted by most recent update.
(t) => ({
  chatUpdatedIdx: index('strategy_chat_updated_idx').on(t.chatId, t.updatedAt),
}));

export type Strategy = InferSelectModel<typeof strategy>;

export const strategyVersion = pgTable('StrategyVersion', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  strategyId: uuid('strategyId')
    .notNull()
    .references(() => strategy.id),
  description: text('description'),
  rules: jsonb('rules').notNull(),
  params: jsonb('params').notNull(),
  notes: text('notes'),
  createdAt: timestamp('createdAt').notNull(),
});

export type StrategyVersion = InferSelectModel<typeof strategyVersion>;

export const strategyBacktest = pgTable('StrategyBacktest', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  strategyVersionId: uuid('strategyVersionId')
    .notNull()
    .references(() => strategyVersion.id),
  symbolSet: jsonb('symbolSet').notNull(),
  window: jsonb('window').notNull(),
  metrics: jsonb('metrics').notNull(),
  equityCurve: jsonb('equityCurve').notNull(),
  assumptions: jsonb('assumptions').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type StrategyBacktest = InferSelectModel<typeof strategyBacktest>;
