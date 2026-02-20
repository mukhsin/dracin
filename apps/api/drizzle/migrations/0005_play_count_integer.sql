-- Migration: Change play_count from TEXT to INTEGER
-- This migration converts the play_count column from storing formatted strings (e.g., "4.1M")
-- to storing actual integer values (e.g., 4100000) for proper sorting and comparison

-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table

-- Create a temporary table with the new schema
CREATE TABLE "dramas_new" (
	"id" text PRIMARY KEY NOT NULL,
	"book_id" text UNIQUE,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"poster_url" text,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"language" text,
	"play_count" integer,
	"source_endpoint" text,
	"release_year" integer,
	"country" text,
	"rating" real,
	"total_episodes" integer,
	"genres" text,
	"metadata" text,
	"created_at" integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	"updated_at" integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);

-- Copy data from old table to new table
-- Convert text play_count to integer (parsing "4.1M" -> 4100000, "2.5K" -> 2500)
INSERT INTO "dramas_new" (
	"id", "book_id", "title", "slug", "description", "poster_url", 
	"status", "language", "play_count", "source_endpoint",
	"release_year", "country", "rating", "total_episodes", "genres", "metadata",
	"created_at", "updated_at"
)
SELECT 
	"id", "book_id", "title", "slug", "description", "poster_url",
	"status", "language",
	CASE 
		WHEN "play_count" IS NULL THEN NULL
		WHEN "play_count" = '' THEN NULL
		WHEN UPPER("play_count") LIKE '%M' THEN 
			CAST(ROUND(CAST(REPLACE(LOWER("play_count"), 'm', '') AS REAL) * 1000000) AS INTEGER)
		WHEN UPPER("play_count") LIKE '%K' THEN 
			CAST(ROUND(CAST(REPLACE(LOWER("play_count"), 'k', '') AS REAL) * 1000) AS INTEGER)
		ELSE 
			CAST("play_count" AS INTEGER)
	END,
	"source_endpoint",
	"release_year", "country", "rating", "total_episodes", "genres", "metadata",
	"created_at", "updated_at"
FROM "dramas";

-- Drop old table
DROP TABLE "dramas";

-- Rename new table to old name
ALTER TABLE "dramas_new" RENAME TO "dramas";

-- Recreate indexes
CREATE UNIQUE INDEX "dramas_slug_idx" ON "dramas" ("slug");
CREATE UNIQUE INDEX "dramas_book_id_idx" ON "dramas" ("book_id");
CREATE INDEX "dramas_status_idx" ON "dramas" ("status");
CREATE INDEX "dramas_title_idx" ON "dramas" ("title");
CREATE INDEX "dramas_language_idx" ON "dramas" ("language");
