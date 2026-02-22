#!/usr/bin/env bun
/**
 * Diagnostic script to check and fix drama_lists table
 * Run this in the API container to diagnose migration issues
 */

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

const DATABASE_URL = process.env.DATABASE_URL || "file:/data/dracin.sqlite";

console.log(`🔍 Checking database: ${DATABASE_URL}`);

const client = createClient({ url: DATABASE_URL });
const db = drizzle(client);

async function checkTable() {
  try {
    // Check if drama_lists table exists
    const result = await client.execute(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='drama_lists'
    `);

    if (result.rows.length === 0) {
      console.log("❌ drama_lists table does NOT exist");
      return false;
    } else {
      console.log("✅ drama_lists table exists");

      // Check table structure
      const columns = await client.execute(`PRAGMA table_info(drama_lists)`);
      console.log("\n📋 Table structure:");
      columns.rows.forEach((col: any) => {
        console.log(
          `  - ${col.name}: ${col.type}${col.notnull ? " NOT NULL" : ""}`,
        );
      });

      // Check row count
      const count = await client.execute(
        `SELECT COUNT(*) as count FROM drama_lists`,
      );
      console.log(`\n📊 Row count: ${count.rows[0].count}`);

      return true;
    }
  } catch (error) {
    console.error("❌ Error checking table:", error);
    return false;
  }
}

async function checkMigrationJournal() {
  try {
    const result = await client.execute(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'
    `);

    if (result.rows.length === 0) {
      console.log("\n⚠️  __drizzle_migrations table does NOT exist");
      return;
    }

    const migrations = await client.execute(
      `SELECT * FROM __drizzle_migrations`,
    );
    console.log("\n📜 Applied migrations:");
    migrations.rows.forEach((row: any) => {
      console.log(
        `  - ${row.hash} (${new Date(row.created_at).toISOString()})`,
      );
    });
  } catch (error) {
    console.error("❌ Error checking migration journal:", error);
  }
}

async function createTable() {
  console.log("\n🔧 Creating drama_lists table...");

  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "drama_lists" (
        "id" text PRIMARY KEY NOT NULL,
        "book_id" text NOT NULL,
        "type" text NOT NULL,
        "position" integer NOT NULL,
        "synced_at" integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
      )
    `);

    await client.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS "drama_lists_book_id_type_idx" 
      ON "drama_lists" ("book_id", "type")
    `);

    await client.execute(`
      CREATE INDEX IF NOT EXISTS "drama_lists_position_idx" 
      ON "drama_lists" ("position")
    `);

    console.log("✅ drama_lists table created successfully!");
  } catch (error) {
    console.error("❌ Error creating table:", error);
    throw error;
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("Drama Lists Table Diagnostic");
  console.log("=".repeat(60));

  const exists = await checkTable();
  await checkMigrationJournal();

  if (!exists) {
    console.log("\n⚠️  Table is missing! Attempting to create...");
    await createTable();

    // Verify
    console.log("\n🔍 Verifying table creation...");
    const verified = await checkTable();

    if (verified) {
      console.log("\n✅ Table created and verified successfully!");
      console.log("\n💡 You can now run the rank sync endpoints.");
    } else {
      console.log("\n❌ Table creation failed!");
      process.exit(1);
    }
  } else {
    console.log("\n✅ Table already exists and is ready to use!");
  }

  await client.close();
  console.log("\n" + "=".repeat(60));
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
