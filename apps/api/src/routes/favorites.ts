import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { favoritesService } from "../services/favorites.service.js";
import { requireAuth, type AuthContext } from "../middleware/auth.js";
import { HTTPException } from "hono/http-exception";

export const AddToFavoritesSchema = z.object({
  dramaId: z.string().uuid(),
});

export const RemoveFromFavoritesSchema = z.object({
  dramaId: z.string().uuid(),
});

const app = new Hono<{ Variables: AuthContext }>();

app.use("*", requireAuth);

app.get("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const result = await favoritesService.getUserFavorites(user.id);

  return c.json({
    success: true,
    data: result,
  });
});

app.post("/", zValidator("json", AddToFavoritesSchema), async (c) => {
  const user = c.get("user");
  if (!user) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const { dramaId } = c.req.valid("json");

  const item = await favoritesService.addToFavorites(user.id, dramaId);

  if (!item) {
    throw new HTTPException(409, {
      message: "Drama is already in favorites",
    });
  }

  return c.json(
    {
      success: true,
      data: item,
      message: "Added to favorites",
    },
    201,
  );
});

app.delete(
  "/:dramaId",
  zValidator("param", RemoveFromFavoritesSchema),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const { dramaId } = c.req.valid("param");

    const removed = await favoritesService.removeFromFavorites(
      user.id,
      dramaId,
    );

    if (!removed) {
      throw new HTTPException(404, {
        message: "Drama not found in favorites",
      });
    }

    return c.json({
      success: true,
      message: "Removed from favorites",
    });
  },
);

app.get("/check/:dramaId", async (c) => {
  const user = c.get("user");
  if (!user) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const dramaId = c.req.param("dramaId");

  const isInFavorites = await favoritesService.isInFavorites(user.id, dramaId);

  return c.json({
    success: true,
    data: {
      isInFavorites,
    },
  });
});

export const favoritesRoutes = app;
export type FavoritesRoutes = typeof app;
