CREATE TABLE IF NOT EXISTS "Analysis" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "userId" uuid NOT NULL,
        "chatId" uuid NOT NULL,
        "type" varchar(32) NOT NULL,
        "input" jsonb NOT NULL,
        "output" jsonb NOT NULL,
        "createdAt" timestamp NOT NULL,
        CONSTRAINT "Analysis_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "Research" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "userId" uuid NOT NULL,
        "chatId" uuid NOT NULL,
        "kind" varchar(32) NOT NULL,
        "title" text NOT NULL,
        "sections" jsonb NOT NULL,
        "createdAt" timestamp NOT NULL,
        "updatedAt" timestamp NOT NULL,
        CONSTRAINT "Research_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Research" ADD CONSTRAINT "Research_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Research" ADD CONSTRAINT "Research_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "AttentionMarker" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "userId" uuid NOT NULL,
        "chatId" uuid NOT NULL,
        "symbol" varchar(32) NOT NULL,
        "timeframe" varchar(16) NOT NULL,
        "payload" jsonb NOT NULL,
        "createdAt" timestamp NOT NULL,
        CONSTRAINT "AttentionMarker_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AttentionMarker" ADD CONSTRAINT "AttentionMarker_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AttentionMarker" ADD CONSTRAINT "AttentionMarker_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
