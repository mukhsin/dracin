import { Hono } from "hono";
import {
  getFeatured,
  getLatest,
  getPopular,
} from "../services/home.service.js";

const app = new Hono();

app.get("/featured", async (c) => {
  const result = await getFeatured();

  const sanitizedItems = result.items.map((drama) => {
    const { createdAt: _c, updatedAt: _u, ...rest } = drama;
    return {
      ...rest,
      posterUrl: `/api/dramas/${drama.slug}/poster.jpg`,
    };
  });

  c.header("Cache-Control", "public, max-age=300");

  return c.json({
    success: true,
    data: { items: sanitizedItems },
  });
});

app.get("/latest", async (c) => {
  const result = await getLatest();

  const sanitizedItems = result.items.map((drama) => {
    const { createdAt: _c, updatedAt: _u, ...rest } = drama;
    return {
      ...rest,
      posterUrl: `/api/dramas/${drama.slug}/poster.jpg`,
    };
  });

  c.header("Cache-Control", "public, max-age=300");

  return c.json({
    success: true,
    data: { items: sanitizedItems },
  });
});

app.get("/popular", async (c) => {
  const result = await getPopular();

  const sanitizedItems = result.items.map((drama) => {
    const { createdAt: _c, updatedAt: _u, ...rest } = drama;
    return {
      ...rest,
      posterUrl: `/api/dramas/${drama.slug}/poster.jpg`,
    };
  });

  c.header("Cache-Control", "public, max-age=300");

  return c.json({
    success: true,
    data: { items: sanitizedItems },
  });
});

export const homeRoutes = app;
export type HomeRoutes = typeof app;
