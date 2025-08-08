CREATE TABLE IF NOT EXISTS "candle" (
	"symbol" varchar(16) NOT NULL,
	"interval" varchar(8) NOT NULL,
	"open" double precision NOT NULL,
	"high" double precision NOT NULL,
	"low" double precision NOT NULL,
	"close" double precision NOT NULL,
	"volume" double precision NOT NULL,
	"ts_start" timestamp NOT NULL,
	"ts_end" timestamp NOT NULL,
	CONSTRAINT "candle_symbol_interval_ts_start_pk" PRIMARY KEY("symbol","interval","ts_start")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fundamentals" (
	"symbol" varchar(16) PRIMARY KEY NOT NULL,
	"json" json NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "market_tick" (
	"symbol" varchar(16) NOT NULL,
	"ts" timestamp NOT NULL,
	"price" double precision NOT NULL,
	"volume" double precision,
	CONSTRAINT "market_tick_symbol_ts_pk" PRIMARY KEY("symbol","ts")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "news_sentiment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol" varchar(16) NOT NULL,
	"headline" text NOT NULL,
	"url" text,
	"score" double precision NOT NULL,
	"ts" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_candle_symbol_interval_ts" ON "candle" USING btree ("symbol","interval","ts_start");