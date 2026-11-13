-- Migration: watch_history refactor (episode_id -> drama_slug + episode_number)
--
-- The original table declares FOREIGN KEY (episode_id) REFERENCES episodes(id),
-- and SQLite refuses `ALTER TABLE ... DROP COLUMN episode_id` because the column
-- is used by a foreign key definition. The table therefore has to be rebuilt
-- (SQLite's documented 12-step procedure) instead of altered in place.

CREATE TABLE "watch_history_new" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"drama_slug" text NOT NULL DEFAULT '',
	"episode_number" integer NOT NULL DEFAULT 0,
	"progress" integer DEFAULT 0 NOT NULL,
	"watched_at" integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	"completed" integer DEFAULT false NOT NULL,
	FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO "watch_history_new" ("id", "user_id", "drama_slug", "episode_number", "progress", "watched_at", "completed")
SELECT
	"wh"."id",
	"wh"."user_id",
	COALESCE((SELECT "d"."slug" FROM "episodes" "e" JOIN "dramas" "d" ON "d"."id" = "e"."drama_id" WHERE "e"."id" = "wh"."episode_id"), ''),
	COALESCE((SELECT "e"."number" FROM "episodes" "e" WHERE "e"."id" = "wh"."episode_id"), 0),
	"wh"."progress",
	"wh"."watched_at",
	"wh"."completed"
FROM "watch_history" "wh";
--> statement-breakpoint
DROP TABLE "watch_history";
--> statement-breakpoint
ALTER TABLE "watch_history_new" RENAME TO "watch_history";
--> statement-breakpoint
-- Rows whose episode could not be resolved collapse onto ('', 0), so keep only
-- the newest row per (user, drama, episode) before adding the unique index.
DELETE FROM "watch_history" WHERE "rowid" NOT IN (
	SELECT MAX("rowid") FROM "watch_history" GROUP BY "user_id", "drama_slug", "episode_number"
);
--> statement-breakpoint
CREATE UNIQUE INDEX "watch_history_user_drama_episode_idx" ON "watch_history" ("user_id", "drama_slug", "episode_number");
--> statement-breakpoint
CREATE INDEX "watch_history_drama_slug_idx" ON "watch_history" ("drama_slug");
--> statement-breakpoint
CREATE INDEX "watch_history_user_watched_at_idx" ON "watch_history" ("user_id", "watched_at");
--> statement-breakpoint
CREATE INDEX "watch_history_user_idx" ON "watch_history" ("user_id");
