import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { historyService } from "../services/history.service.js";
import { requireAuth, type AuthContext } from "../middleware/auth.js";
import { HTTPException } from "hono/http-exception";

export const RecordProgressSchema = z.object({
  episodeId: z.string().uuid(),
  progress: z.number().int().min(0),
  completed: z.boolean().optional(),
});

const app = new Hono<{ Variables: AuthContext }>();

app.use("*", requireAuth);

app.get("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const result = await historyService.getUserHistory(user.id);

  return c.json({
    success: true,
    data: result,
  });
});

app.get("/continue", async (c) => {
  const user = c.get("user");
  if (!user) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const items = await historyService.getContinueWatching(user.id);

  return c.json({
    success: true,
    data: items,
  });
});

app.post(
  "/",
  zValidator("json", RecordProgressSchema),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const { episodeId, progress, completed } = c.req.valid("json");

    const item = await historyService.recordProgress(
      user.id,
      episodeId,
      progress,
      completed ?? false
    );

    return c.json({
      success: true,
      data: item,
      message: "Progress recorded",
    });
  }
);

app.get("/episodes/:episodeId", async (c) => {
  const user = c.get("user");
  if (!user) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const episodeId = c.req.param("episodeId");

  const progress = await historyService.getEpisodeProgress(user.id, episodeId);

  return c.json({
    success: true,
    data: progress,
  });
});

app.delete("/:historyId", async (c) => {
  const user = c.get("user");
  if (!user) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const historyId = c.req.param("historyId");

  const deleted = await historyService.deleteHistoryEntry(user.id, historyId);

  if (!deleted) {
    throw new HTTPException(404, {
      message: "History entry not found",
    });
  }

  return c.json({
    success: true,
    message: "History entry deleted",
  });
});

app.delete("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const count = await historyService.clearHistory(user.id);

  return c.json({
    success: true,
    data: { deletedCount: count },
    message: "History cleared",
  });
});

export const historyRoutes = app;
export type HistoryRoutes = typeof app;
