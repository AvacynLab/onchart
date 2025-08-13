-- Add indexes to accelerate listings of analyses, research and strategies per chat
CREATE INDEX IF NOT EXISTS analysis_chat_created_idx ON "Analysis" ("chatId", "createdAt");
CREATE INDEX IF NOT EXISTS research_chat_updated_idx ON "Research" ("chatId", "updatedAt");
CREATE INDEX IF NOT EXISTS strategy_chat_updated_idx ON "Strategy" ("chatId", "updatedAt");
