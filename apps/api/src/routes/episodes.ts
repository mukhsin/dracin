import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { dramaService } from "../services/drama.service.js";
import { HTTPException } from "hono/http-exception";

// ============================================
// Validation Schemas
// ============================================

const GetEpisodeParamsSchema = z.object({
  id: z.string().uuid(),
});

// ============================================
// Routes
// ============================================

const app = new Hono();

/**
 * GET /api/episodes/:id
 * Get an episode by ID with video URLs and drama info
 */
app.get(
  "/:id",
  zValidator("param", GetEpisodeParamsSchema),
  async (c) => {
    const { id } = c.req.valid("param");

    const episode = await dramaService.getEpisode(id);

    if (!episode) {
      throw new HTTPException(404, {
        message: `Episode with ID "${id}" not found`,
      });
    }

    // Add short caching for episode data (30 seconds - shorter due to video URLs)
    c.header("Cache-Control", "public, max-age=30");

    return c.json({
      success: true,
      data: episode,
    });
  }
);

export const episodeRoutes = app;
export type EpisodeRoutes = typeof app;
