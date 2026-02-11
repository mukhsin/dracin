import { Hono } from "hono";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";

const app = new Hono();

app.get("/", async (c) => {
  try {
    await db.select({ id: users.id }).from(users).limit(1);

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
      503,
    );
  }
});

export { app as healthRoutes };
