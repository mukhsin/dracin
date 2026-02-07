-- Migration: Remove seasons table, update dramas and episodes for SQL data structure

-- ============================================
-- Step 1: Add new columns to dramas table
-- ============================================
ALTER TABLE "dramas" ADD COLUMN IF NOT EXISTS "book_id" bigint UNIQUE;
ALTER TABLE "dramas" ADD COLUMN IF NOT EXISTS "language" text;
ALTER TABLE "dramas" ADD COLUMN IF NOT EXISTS "play_count" integer;
ALTER TABLE "dramas" ADD COLUMN IF NOT EXISTS "source_endpoint" text;

-- Add index on language
CREATE INDEX IF NOT EXISTS "dramas_language_idx" ON "dramas" USING btree ("language");

-- ============================================
-- Step 2: Add new columns to episodes table
-- ============================================
ALTER TABLE "episodes" ADD COLUMN IF NOT EXISTS "drama_id" uuid;
ALTER TABLE "episodes" ADD COLUMN IF NOT EXISTS "book_id" bigint;
ALTER TABLE "episodes" ADD COLUMN IF NOT EXISTS "source_url" text;

-- Add indexes
CREATE INDEX IF NOT EXISTS "episodes_book_id_idx" ON "episodes" USING btree ("book_id");

-- ============================================
-- Step 3: Migrate data - Link episodes to dramas via seasons
-- ============================================
-- First, update episodes to point directly to dramas
UPDATE "episodes" e
SET "drama_id" = s."drama_id"
FROM "seasons" s
WHERE e."season_id" = s."id";

-- Make drama_id not null after migration
ALTER TABLE "episodes" ALTER COLUMN "drama_id" SET NOT NULL;

-- ============================================
-- Step 4: Update unique constraint for episodes
-- ============================================
-- Drop old unique constraint on season_id + number
DROP INDEX IF EXISTS "episodes_season_number_idx";

-- Create new unique constraint on drama_id + number
CREATE UNIQUE INDEX "episodes_drama_number_idx" ON "episodes" USING btree ("drama_id", "number");

-- ============================================
-- Step 5: Drop foreign key and column from episodes to seasons
-- ============================================
ALTER TABLE "episodes" DROP CONSTRAINT IF EXISTS "episodes_season_id_seasons_id_fk";
ALTER TABLE "episodes" DROP COLUMN IF EXISTS "season_id";

-- Drop index on season_id
DROP INDEX IF EXISTS "episodes_season_idx";

-- ============================================
-- Step 6: Add foreign key from episodes to dramas
-- ============================================
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_drama_id_dramas_id_fk" 
  FOREIGN KEY ("drama_id") REFERENCES "public"."dramas"("id") ON DELETE cascade ON UPDATE no action;

-- Add index on drama_id
CREATE INDEX "episodes_drama_idx" ON "episodes" USING btree ("drama_id");

-- ============================================
-- Step 7: Drop seasons table
-- ============================================
-- Drop foreign key from seasons to dramas
ALTER TABLE "seasons" DROP CONSTRAINT IF EXISTS "seasons_drama_id_dramas_id_fk";

-- Drop indexes on seasons
DROP INDEX IF EXISTS "seasons_drama_number_idx";
DROP INDEX IF EXISTS "seasons_drama_idx";

-- Drop seasons table
DROP TABLE IF EXISTS "seasons";

-- ============================================
-- Step 8: Add unique index on dramas.book_id
-- ============================================
CREATE UNIQUE INDEX IF NOT EXISTS "dramas_book_id_idx" ON "dramas" USING btree ("book_id");
