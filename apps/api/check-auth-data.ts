import { Pool } from "pg";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || "postgresql://localhost:5432/dracin",
});

async function queryDatabase() {
  const client = await pool.connect();
  try {
    console.log("=== Auth Sessions ===");
    const sessionsResult = await client.query(
      "SELECT id, user_id, token, expires_at, created_at FROM auth_sessions LIMIT 5",
    );
    if (sessionsResult.rows.length === 0) {
      console.log("No sessions found");
    } else {
      sessionsResult.rows.forEach((row) => {
        console.log(`Session: ${row.id}`);
        console.log(`  User ID: ${row.user_id}`);
        console.log(`  Token: ${row.token.substring(0, 20)}...`);
        console.log(`  Expires: ${row.expires_at}`);
        console.log(`  Created: ${row.created_at}`);
        console.log("");
      });
    }

    console.log("\n=== Auth Accounts ===");
    const accountsResult = await client.query(
      "SELECT id, user_id, provider_id, created_at FROM auth_accounts LIMIT 5",
    );
    if (accountsResult.rows.length === 0) {
      console.log("No accounts found");
    } else {
      accountsResult.rows.forEach((row) => {
        console.log(`Account: ${row.id}`);
        console.log(`  User ID: ${row.user_id}`);
        console.log(`  Provider: ${row.provider_id}`);
        console.log(`  Created: ${row.created_at}`);
        console.log("");
      });
    }

    console.log("\n=== Users ===");
    const usersResult = await client.query(
      "SELECT id, email, name, created_at FROM users LIMIT 5",
    );
    if (usersResult.rows.length === 0) {
      console.log("No users found");
    } else {
      usersResult.rows.forEach((row) => {
        console.log(`User: ${row.id}`);
        console.log(`  Email: ${row.email}`);
        console.log(`  Name: ${row.name}`);
        console.log(`  Created: ${row.created_at}`);
        console.log("");
      });
    }
  } catch (err) {
    console.error("Query failed:", err.message);
  } finally {
    client.release();
  }
  await pool.end();
}

queryDatabase();
