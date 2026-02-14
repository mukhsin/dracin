import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { dramaService } from "../services/drama.service.js";
import { HTTPException } from "hono/http-exception";

const ListDramasQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  q: z.string().optional(),
  status: z.enum(["ongoing", "completed", "upcoming"]).optional(),
  language: z.string().optional(),
  sortBy: z.enum(["title", "createdAt", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const GetDramaParamsSchema = z.object({
  slug: z.string().min(1),
});

const GetEpisodesParamsSchema = z.object({
  slug: z.string().min(1),
});

const app = new Hono();

app.get("/", zValidator("query", ListDramasQuerySchema), async (c) => {
  const { page, pageSize, q, status, language, sortBy, sortOrder } =
    c.req.valid("query");

  const result = await dramaService.list(page, pageSize, {
    search: q,
    status,
    language,
    sortBy,
    sortOrder,
  });

  c.header("Cache-Control", "public, max-age=300");

  return c.json({
    success: true,
    data: result,
    meta: { source: result.source || "db" },
  });
});

app.get("/:slug", zValidator("param", GetDramaParamsSchema), async (c) => {
  const { slug } = c.req.valid("param");

  const drama = await dramaService.getBySlugWithValidation(slug);

  if (!drama) {
    throw new HTTPException(404, {
      message: `Drama with slug "${slug}" not found`,
    });
  }

  c.header("Cache-Control", "public, max-age=60");

  return c.json({
    success: true,
    data: drama,
    meta: { source: drama.source },
  });
});

app.get(
  "/:slug/episodes",
  zValidator("param", GetEpisodesParamsSchema),
  async (c) => {
    const { slug } = c.req.valid("param");

    const result = await dramaService.getEpisodesByDramaSlug(slug);

    if (!result.drama) {
      throw new HTTPException(404, {
        message: `Drama with slug "${slug}" not found`,
      });
    }

    c.header("Cache-Control", "public, max-age=60");

    return c.json({
      success: true,
      data: result,
    });
  },
);

export const dramaRoutes = app;
export type DramaRoutes = typeof app;
