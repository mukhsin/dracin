import { Hono } from "hono";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

const app = new Hono();

app.get("/", async (c) => {
  try {
    await db.execute(sql`SELECT 1`);

    return c.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch (error) {
    console.error("Health check failed:", error);

    return c.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        database: "disconnected",
      },
      503
    );
  }
});

export { app as healthRoutes };
