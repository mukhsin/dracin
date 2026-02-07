import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { watchlistService } from "../services/watchlist.service.js";
import { requireAuth, type AuthContext } from "../middleware/auth.js";
import { HTTPException } from "hono/http-exception";

export const AddToWatchlistSchema = z.object({
  dramaId: z.string().uuid(),
});

export const RemoveFromWatchlistSchema = z.object({
  dramaId: z.string().uuid(),
});

const app = new Hono<{ Variables: AuthContext }>();

app.use("*", requireAuth);

app.get("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const result = await watchlistService.getUserWatchlist(user.id);

  return c.json({
    success: true,
    data: result,
  });
});

app.post(
  "/",
  zValidator("json", AddToWatchlistSchema),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const { dramaId } = c.req.valid("json");

    const item = await watchlistService.addToWatchlist(user.id, dramaId);

    if (!item) {
      throw new HTTPException(409, {
        message: "Drama is already in watchlist",
      });
    }

    return c.json(
      {
        success: true,
        data: item,
        message: "Added to watchlist",
      },
      201
    );
  }
);

app.delete(
  "/:dramaId",
  zValidator("param", RemoveFromWatchlistSchema),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const { dramaId } = c.req.valid("param");

    const removed = await watchlistService.removeFromWatchlist(user.id, dramaId);

    if (!removed) {
      throw new HTTPException(404, {
        message: "Drama not found in watchlist",
      });
    }

    return c.json({
      success: true,
      message: "Removed from watchlist",
    });
  }
);

app.get("/check/:dramaId", async (c) => {
  const user = c.get("user");
  if (!user) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const dramaId = c.req.param("dramaId");

  const isInWatchlist = await watchlistService.isInWatchlist(user.id, dramaId);

  return c.json({
    success: true,
    data: {
      isInWatchlist,
    },
  });
});

export const watchlistRoutes = app;
export type WatchlistRoutes = typeof app;
