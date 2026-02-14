#!/usr/bin/env bun
/**
 * Execute SQL data file in production
 * Usage: bun run scripts/execute-sql.ts /path/to/file.sql
 */
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { readFileSync } from "fs";

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error("Usage: bun run scripts/execute-sql.ts <sql-file>");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL || "file:/data/dracin.sqlite";

async function executeSql() {
  console.log(`Connecting to: ${databaseUrl}`);
  console.log(`Executing: ${sqlFile}`);

  const client = createClient({ url: databaseUrl });
  const db = drizzle(client);

  try {
    const sql = readFileSync(sqlFile, "utf-8");

    // Split by semicolon and execute each statement
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    console.log(`Found ${statements.length} statements`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await client.execute(stmt);
        if ((i + 1) % 100 === 0) {
          console.log(`Executed ${i + 1}/${statements.length}...`);
        }
      } catch (err) {
        console.error(`Error on statement ${i + 1}:`, err);
        // Continue with next statement
      }
    }

    console.log("SQL execution completed!");
  } finally {
    await client.close();
  }
}

executeSql().catch((err) => {
  console.error("Failed to execute SQL:", err);
  process.exit(1);
});
