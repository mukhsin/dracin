import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import {
  getFeatured,
  getLatest,
  getRank,
  getChannel,
  getIndo,
} from "../services/api-proxy.service.js";

const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  size: z.coerce.number().int().positive().max(100).default(20),
});

const RankQuerySchema = z.object({
  type: z.coerce.number().int().positive().default(1),
});

const ChannelParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const app = new Hono();

app.get("/featured", zValidator("query", PaginationQuerySchema), async (c) => {
  const { page, size } = c.req.valid("query");

  try {
    const result = await getFeatured(page, size);

    c.header("Cache-Control", "public, max-age=300");

    return c.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Failed to fetch featured dramas",
    });
  }
});

app.get("/latest", zValidator("query", PaginationQuerySchema), async (c) => {
  const { page, size } = c.req.valid("query");

  try {
    const result = await getLatest(page, size);

    c.header("Cache-Control", "public, max-age=300");

    return c.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Failed to fetch latest dramas",
    });
  }
});

app.get("/rank", zValidator("query", RankQuerySchema), async (c) => {
  const { type } = c.req.valid("query");

  try {
    const result = await getRank(type);

    c.header("Cache-Control", "public, max-age=300");

    return c.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Failed to fetch ranked dramas",
    });
  }
});

app.get(
  "/channel/:id",
  zValidator("param", ChannelParamsSchema),
  zValidator("query", PaginationQuerySchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const { page, size } = c.req.valid("query");

    try {
      const result = await getChannel(id, page, size);

      c.header("Cache-Control", "public, max-age=300");

      return c.json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(500, {
        message: `Failed to fetch channel ${id} dramas`,
      });
    }
  },
);

app.get("/indo", zValidator("query", PaginationQuerySchema), async (c) => {
  const { page, size } = c.req.valid("query");

  try {
    const result = await getIndo(page, size);

    c.header("Cache-Control", "public, max-age=300");

    return c.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Failed to fetch Indonesian dubbed dramas",
    });
  }
});

export const catalogRoutes = app;
export type CatalogRoutes = typeof app;
