import { Pool } from "pg";
import { readFileSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env") });

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || "postgresql://localhost:5432/dracin",
});

async function runMigration(filename) {
  const client = await pool.connect();
  try {
    const sql = readFileSync(resolve("drizzle/migrations", filename), "utf8");
    console.log(`Applying ${filename}...`);
    await client.query(sql);
    console.log(`✓ Applied ${filename}`);
  } catch (err) {
    console.error(`✗ Failed ${filename}:`, err.message);
  } finally {
    client.release();
  }
}

async function main() {
  console.log("Running pending migrations...\n");

  await runMigration("0001_remove_seasons_update_schema.sql");
  await runMigration("0002_better_auth_fields.sql");
  await runMigration("0003_better_auth_tables.sql");
  await runMigration("0004_prefix_auth_tables.sql");

  console.log("\nMigration complete!");
  await pool.end();
}

main();
