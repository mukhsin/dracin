#!/usr/bin/env bun
/**
 * Emergency migration repair script
 * Run this in production to apply missing migrations
 */

import { createClient } from "@libsql/client";

const DATABASE_URL = process.env.DATABASE_URL || "file:/data/dracin.sqlite";

console.log(`🔧 Migration Repair Tool`);
console.log(`Database: ${DATABASE_URL}`);
console.log("=".repeat(60));

const client = createClient({ url: DATABASE_URL });

// Track applied migrations
const appliedMigrations = new Set<string>();

async function checkAppliedMigrations() {
  try {
    const result = await client.execute(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'
    `);

    if (result.rows.length === 0) {
      console.log("⚠️  __drizzle_migrations table does NOT exist");
      return;
    }

    const migrations = await client.execute(
      `SELECT hash FROM __drizzle_migrations`,
    );
    migrations.rows.forEach((row: any) => {
      appliedMigrations.add(row.hash);
    });

    console.log("📜 Applied migrations:");
    migrations.rows.forEach((row: any) => {
      console.log(`  ✅ ${row.hash}`);
    });
  } catch (error) {
    console.error("❌ Error checking migrations:", error);
  }
}

async function applyMigration0004() {
  console.log("\n🔧 Applying migration 0004: watch_history_refactor...");

  try {
    // Check if already applied
    const check = await client.execute(`PRAGMA table_info(watch_history)`);
    const columns = new Set(check.rows.map((col: any) => col.name));

    if (columns.size === 0) {
      console.log("  ⏭️  watch_history table not created yet, skipping");
      return;
    }

    // A failed previous attempt may have added drama_slug/episode_number but
    // left episode_id behind (it is NOT NULL without a default, so inserts
    // would fail). Treat that as still needing the rebuild.
    const needsRebuild =
      !columns.has("drama_slug") ||
      !columns.has("episode_number") ||
      columns.has("episode_id");

    if (!needsRebuild) {
      console.log("  ✅ Already applied (drama_slug + episode_number exist)");
      return;
    }

    // The original table declares FOREIGN KEY (episode_id) REFERENCES
    // episodes(id) and SQLite refuses to drop a column used by a foreign key
    // definition, so the table must be rebuilt rather than altered in place.
    await client.execute(`PRAGMA foreign_keys = OFF`);

    await client.execute(`DROP TABLE IF EXISTS "watch_history_new"`);
    await client.execute(`
      CREATE TABLE "watch_history_new" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL,
        "drama_slug" text NOT NULL DEFAULT '',
        "episode_number" integer NOT NULL DEFAULT 0,
        "progress" integer DEFAULT 0 NOT NULL,
        "watched_at" integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
        "completed" integer DEFAULT false NOT NULL,
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE cascade
      )
    `);

    await client.execute(`
      INSERT INTO "watch_history_new" (
        "id", "user_id", "drama_slug", "episode_number",
        "progress", "watched_at", "completed"
      )
      SELECT
        "wh"."id",
        "wh"."user_id",
        COALESCE((
          SELECT "d"."slug" FROM "episodes" "e"
          JOIN "dramas" "d" ON "d"."id" = "e"."drama_id"
          WHERE "e"."id" = "wh"."episode_id"
        ), ''),
        COALESCE((
          SELECT "e"."number" FROM "episodes" "e" WHERE "e"."id" = "wh"."episode_id"
        ), 0),
        "wh"."progress",
        "wh"."watched_at",
        "wh"."completed"
      FROM "watch_history" "wh"
    `);

    await client.execute(`DROP TABLE "watch_history"`);
    await client.execute(
      `ALTER TABLE "watch_history_new" RENAME TO "watch_history"`,
    );

    // Rows whose episode could not be resolved collapse onto ('', 0), so keep
    // only the newest row per (user, drama, episode) before the unique index.
    await client.execute(`
      DELETE FROM "watch_history" WHERE "rowid" NOT IN (
        SELECT MAX("rowid") FROM "watch_history"
        GROUP BY "user_id", "drama_slug", "episode_number"
      )
    `);

    await client.execute(
      `CREATE UNIQUE INDEX IF NOT EXISTS "watch_history_user_drama_episode_idx" ON "watch_history" ("user_id", "drama_slug", "episode_number")`,
    );
    await client.execute(
      `CREATE INDEX IF NOT EXISTS "watch_history_drama_slug_idx" ON "watch_history" ("drama_slug")`,
    );
    await client.execute(
      `CREATE INDEX IF NOT EXISTS "watch_history_user_watched_at_idx" ON "watch_history" ("user_id", "watched_at")`,
    );
    await client.execute(
      `CREATE INDEX IF NOT EXISTS "watch_history_user_idx" ON "watch_history" ("user_id")`,
    );

    // Re-enable foreign keys
    await client.execute(`PRAGMA foreign_keys = ON`);

    console.log("  ✅ Migration 0004 applied successfully");
  } catch (error) {
    console.error("  ❌ Error applying migration 0004:", error);
    throw error;
  }
}

async function applyMigration0005() {
  console.log("\n🔧 Applying migration 0005: play_count_integer...");

  try {
    // Check if play_count is already integer
    const check = await client.execute(`PRAGMA table_info(dramas)`);
    const playCountCol = check.rows.find(
      (col: any) => col.name === "play_count",
    );

    // SQLite reports the declared type verbatim ("integer"), so compare
    // case-insensitively - otherwise this rebuild would run on every boot.
    if (
      playCountCol &&
      String(playCountCol.type).trim().toUpperCase() === "INTEGER"
    ) {
      console.log("  ✅ Already applied (play_count is INTEGER)");
      return;
    }

    // Create new table with integer play_count
    // Drop leftover from a previously interrupted repair attempt.
    await client.execute(`DROP TABLE IF EXISTS "dramas_new"`);
    // Rebuilding dramas must not cascade-delete episodes/history rows.
    await client.execute(`PRAGMA foreign_keys = OFF`);
    await client.execute(`
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
      )
    `);

    // Copy data with conversion
    await client.execute(`
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
      FROM "dramas"
    `);

    await client.execute(`DROP TABLE "dramas"`);
    await client.execute(`ALTER TABLE "dramas_new" RENAME TO "dramas"`);

    await client.execute(
      `CREATE UNIQUE INDEX IF NOT EXISTS "dramas_slug_idx" ON "dramas" ("slug")`,
    );
    await client.execute(
      `CREATE UNIQUE INDEX IF NOT EXISTS "dramas_book_id_idx" ON "dramas" ("book_id")`,
    );
    await client.execute(
      `CREATE INDEX IF NOT EXISTS "dramas_status_idx" ON "dramas" ("status")`,
    );
    await client.execute(
      `CREATE INDEX IF NOT EXISTS "dramas_title_idx" ON "dramas" ("title")`,
    );
    await client.execute(
      `CREATE INDEX IF NOT EXISTS "dramas_language_idx" ON "dramas" ("language")`,
    );

    await client.execute(`PRAGMA foreign_keys = ON`);

    console.log("  ✅ Migration 0005 applied successfully");
  } catch (error) {
    console.error("  ❌ Error applying migration 0005:", error);
    throw error;
  }
}

async function applyMigration0006() {
  console.log("\n🔧 Applying migration 0006: merge_drama_lists...");

  try {
    // Check if drama_lists table exists
    const result = await client.execute(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='drama_lists'
    `);

    if (result.rows.length > 0) {
      console.log("  ✅ Already applied (drama_lists table exists)");
      return;
    }

    // Create drama_lists table
    await client.execute(`
      CREATE TABLE "drama_lists" (
        "id" text PRIMARY KEY NOT NULL,
        "book_id" text NOT NULL,
        "type" text NOT NULL,
        "position" integer NOT NULL,
        "synced_at" integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
      )
    `);

    await client.execute(
      `CREATE UNIQUE INDEX IF NOT EXISTS "drama_lists_book_id_type_idx" ON "drama_lists" ("book_id", "type")`,
    );
    await client.execute(
      `CREATE INDEX IF NOT EXISTS "drama_lists_position_idx" ON "drama_lists" ("position")`,
    );

    // Drop old tables if they exist
    await client.execute(`DROP TABLE IF EXISTS "latest_dramas"`);
    await client.execute(`DROP TABLE IF EXISTS "featured_dramas"`);

    console.log("  ✅ Migration 0006 applied successfully");
  } catch (error) {
    console.error("  ❌ Error applying migration 0006:", error);
    throw error;
  }
}
async function applyMigration0007() {
  console.log("\n🔧 Applying migration 0007: add_favorites_table...");

  try {
    // Check if favorites table exists
    const result = await client.execute(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='favorites'
    `);

    if (result.rows.length > 0) {
      console.log("  ✅ Already applied (favorites table exists)");
      return;
    }

    // Create favorites table
    await client.execute(`
      CREATE TABLE "favorites" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL,
        "drama_id" text NOT NULL,
        "added_at" integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE cascade,
        FOREIGN KEY ("drama_id") REFERENCES "dramas"("id") ON UPDATE no action ON DELETE cascade
      )
    `);

    await client.execute(
      `CREATE UNIQUE INDEX IF NOT EXISTS "favorites_user_drama_idx" ON "favorites" ("user_id","drama_id")`,
    );
    await client.execute(
      `CREATE INDEX IF NOT EXISTS "favorites_user_added_at_idx" ON "favorites" ("user_id","added_at")`,
    );
    await client.execute(
      `CREATE INDEX IF NOT EXISTS "favorites_user_idx" ON "favorites" ("user_id")`,
    );
    await client.execute(
      `CREATE INDEX IF NOT EXISTS "favorites_drama_idx" ON "favorites" ("drama_id")`,
    );

    console.log("  ✅ Migration 0007 applied successfully");
  } catch (error) {
    console.error("  ❌ Error applying migration 0007:", error);
    throw error;
  }
}



async function recordMigrations() {
  console.log("\n📝 Recording migrations in journal...");

  try {
    // Create __drizzle_migrations table if not exists
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT UNIQUE NOT NULL,
        created_at INTEGER DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
      )
    `);

    // Must be greater than the folderMillis of the last correctly ordered
    // journal entry (0003_hot_mystique), yet smaller than any future
    // drizzle-kit generated timestamp. Writing "now" here would make
    // drizzle-kit skip every future migration forever.
    const JOURNAL_BASE_TIMESTAMP = 1771479073546; // 0003_hot_mystique

    // Record migrations
    const migrations = [
      "0004_watch_history_refactor",
      "0005_play_count_integer",
      "0006_merge_drama_lists",
      "0007_add_favorites_table",
    ];

    for (const [index, migration] of migrations.entries()) {
      const existing = await client.execute({
        sql: `SELECT id FROM "__drizzle_migrations" WHERE hash = ? LIMIT 1`,
        args: [migration],
      });

      if (existing.rows.length > 0) {
        continue;
      }

      await client.execute({
        sql: `INSERT INTO "__drizzle_migrations" ("hash", "created_at") VALUES (?, ?)`,
        args: [migration, JOURNAL_BASE_TIMESTAMP + index + 1],
      });
      console.log(`  ✅ Recorded: ${migration}`);
    }
  } catch (error) {
    console.error("❌ Error recording migrations:", error);
  }
}

async function main() {
  await checkAppliedMigrations();
  await applyMigration0004();
  await applyMigration0005();
  await applyMigration0006();
  await applyMigration0007();
  await recordMigrations();

  console.log("\n" + "=".repeat(60));
  console.log("✅ All migrations applied successfully!");
  console.log("=".repeat(60));

  await client.close();
}

main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
