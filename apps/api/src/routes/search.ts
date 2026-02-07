import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { search, suggest } from "../services/api-proxy.service.js";

const SearchQuerySchema = z.object({
  q: z.string().min(1),
  page: z.coerce.number().int().positive().default(1),
  size: z.coerce.number().int().positive().max(100).default(20),
});

const SuggestQuerySchema = z.object({
  q: z.string().min(1),
});

const app = new Hono();

app.get("/", zValidator("query", SearchQuerySchema), async (c) => {
  const { q, page, size } = c.req.valid("query");

  const result = await search(q, page, size);

  c.header("Cache-Control", "public, max-age=60");

  return c.json({
    success: true,
    data: result.data,
  });
});

app.get("/suggest", zValidator("query", SuggestQuerySchema), async (c) => {
  const { q } = c.req.valid("query");

  const result = await suggest(q);

  c.header("Cache-Control", "public, max-age=60");

  return c.json({
    success: true,
    data: result.data,
  });
});

export const searchRoutes = app;
export type SearchRoutes = typeof app;
