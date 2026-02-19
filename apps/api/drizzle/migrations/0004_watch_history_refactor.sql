-- Drop old indexes
DROP INDEX IF EXISTS "watch_history_user_episode_idx";
DROP INDEX IF EXISTS "watch_history_episode_idx";

-- Add new columns
ALTER TABLE "watch_history" ADD COLUMN "drama_slug" text NOT NULL DEFAULT '';
ALTER TABLE "watch_history" ADD COLUMN "episode_number" integer NOT NULL DEFAULT 0;

-- Drop old column
ALTER TABLE "watch_history" DROP COLUMN "episode_id";

-- Create new indexes
CREATE UNIQUE INDEX "watch_history_user_drama_episode_idx" ON "watch_history" ("user_id", "drama_slug", "episode_number");
CREATE INDEX "watch_history_drama_slug_idx" ON "watch_history" ("drama_slug");