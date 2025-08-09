CREATE TABLE "Strategy" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId" uuid NOT NULL REFERENCES "User"("id"),
  "chatId" uuid NOT NULL REFERENCES "Chat"("id"),
  "title" text NOT NULL,
  "universe" jsonb NOT NULL,
  "constraints" jsonb NOT NULL,
  "status" varchar NOT NULL DEFAULT 'draft',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX "Strategy_chatId_updatedAt_idx" ON "Strategy" ("chatId", "updatedAt");

CREATE TABLE "StrategyVersion" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "strategyId" uuid NOT NULL REFERENCES "Strategy"("id"),
  "description" text,
  "rules" jsonb NOT NULL,
  "params" jsonb NOT NULL,
  "notes" text,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "StrategyBacktest" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "strategyVersionId" uuid NOT NULL REFERENCES "StrategyVersion"("id"),
  "symbolSet" jsonb NOT NULL,
  "window" jsonb NOT NULL,
  "metrics" jsonb NOT NULL,
  "equityCurve" jsonb NOT NULL,
  "assumptions" jsonb NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
