import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { dramaService } from "../services/drama.service.js";
import { HTTPException } from "hono/http-exception";
import { db } from "../db/index.js";
import { dramas } from "../db/schema.js";

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

const GetEpisodeByNumberParamsSchema = z.object({
  slug: z.string().min(1),
  number: z.coerce.number().int().positive(),
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

  const sanitizedItems = result.items.map((drama) => {
    const { bookId: _b, createdAt: _c, updatedAt: _u, ...rest } = drama;
    return {
      ...rest,
      posterUrl: `/api/dramas/${drama.slug}/poster.jpg`,
    };
  });

  c.header("Cache-Control", "public, max-age=300");

  return c.json({
    success: true,
    data: { ...result, items: sanitizedItems },
    meta: { source: result.source || "db" },
  });
});

app.get("/:slug/poster.jpg", async (c) => {
  const slug = c.req.param("slug");

  if (!slug) {
    throw new HTTPException(404, {
      message: "Drama with slug not found",
    });
  }

  const drama = await db.query.dramas.findFirst({
    where: eq(dramas.slug, slug),
    columns: {
      posterUrl: true,
    },
  });

  if (!drama) {
    throw new HTTPException(404, {
      message: "Drama with slug not found",
    });
  }

  const PLACEHOLDER_PNG_BASE64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PDwYAAAQABJREFUeJz3LiPAAAAAElFTkSuQmCC";

  if (!drama.posterUrl || drama.posterUrl.trim() === "") {
    const placeholderBytes = Buffer.from(PLACEHOLDER_PNG_BASE64, "base64");
    c.header("Content-Type", "image/png");
    c.header("Cache-Control", "public, max-age=86400");
    return c.body(placeholderBytes);
  }

  try {
    const response = await fetch(drama.posterUrl);

    if (!response.ok) {
      throw new Error(`Upstream returned ${response.status}`);
    }

    const contentType =
      response.headers.get("Content-Type") ||
      response.headers.get("content-type") ||
      "image/jpeg";
    const imageBytes = await response.arrayBuffer();

    c.header("Content-Type", contentType);
    c.header("Cache-Control", "public, max-age=86400");
    return c.body(imageBytes);
  } catch (error) {
    console.error(
      `[PosterProxy] Failed to fetch poster for slug "${slug}":`,
      error,
    );
    throw new HTTPException(500, {
      message: "Failed to fetch poster image",
    });
  }
});

app.get("/:slug", zValidator("param", GetDramaParamsSchema), async (c) => {
  const { slug } = c.req.valid("param");

  const drama = await dramaService.getBySlugWithValidation(slug);

  if (!drama) {
    throw new HTTPException(404, {
      message: `Drama with slug "${slug}" not found`,
    });
  }

  dramaService.updateStatusIfCompleted(drama.id).catch((error) => {
    console.error(`[DramasRoute] Failed to update status:`, error);
  });

  // Hide videoUrls, sourceUrl, and bookId from episodes
  const sanitizedEpisodes = drama.episodes.map((ep) => {
    const {
      videoUrls: _v,
      sourceUrl: _s,
      bookId: _b,
      dramaId: _d,
      description: _d1,
      duration: _d2,
      createdAt: _c,
      ...rest
    } = ep;
    return rest;
  });

  // Sanitize drama: hide bookId, createdAt, updatedAt (keep posterUrl)
  const {
    bookId: _bookId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    episodes: _episodes,
    ...sanitizedDrama
  } = drama;

  const dramaResponse = {
    ...sanitizedDrama,
    posterUrl: `/api/dramas/${drama.slug}/poster.jpg`,
    episodes: sanitizedEpisodes,
  };

  c.header("Cache-Control", "public, max-age=60");

  return c.json({
    success: true,
    data: dramaResponse,
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

    // Hide videoUrls, sourceUrl, and bookId from episodes
    const sanitizedEpisodes = result.episodes.map((ep) => {
      const { videoUrls: _v, sourceUrl: _s, bookId: _b, ...rest } = ep;
      return rest;
    });

    c.header("Cache-Control", "public, max-age=60");

    return c.json({
      success: true,
      data: {
        drama: result.drama,
        episodes: sanitizedEpisodes,
      },
    });
  },
);

/**
 * GET /api/dramas/:slug/episodes/:number
 * Get an episode by drama slug and episode number with video URLs and drama info
 */
app.get(
  "/:slug/episodes/:number",
  zValidator("param", GetEpisodeByNumberParamsSchema),
  async (c) => {
    const { slug, number } = c.req.valid("param");

    const episode = await dramaService.getEpisodeByNumber(slug, number);

    if (!episode) {
      throw new HTTPException(404, {
        message: `Episode ${number} for drama "${slug}" not found`,
      });
    }

    // Get full episode with navigation using the existing getEpisode method
    const fullEpisode = await dramaService.getEpisode(episode.id);

    if (!fullEpisode) {
      throw new HTTPException(404, {
        message: `Episode ${number} for drama "${slug}" not found`,
      });
    }

    // Exclude videoUrls and sourceUrl from response, return pre-built video URLs instead
    const { videoUrls: _v, sourceUrl: _s, ...episodeWithoutUrls } = fullEpisode;
    (void _v, _s);

    // Build pre-built video URLs for each quality
    const videoUrls: Record<string, string> = {};
    if (fullEpisode.videoUrls) {
      for (const quality of Object.keys(fullEpisode.videoUrls)) {
        videoUrls[quality] =
          `/api/video/${fullEpisode.dramaId}.${fullEpisode.number}.${quality}.mp4`;
      }
    }

    const episodeWithVideo = {
      ...episodeWithoutUrls,
      video: {
        urls: videoUrls,
      },
    };

    // Add short caching for episode data (30 seconds - shorter due to video URLs)
    c.header("Cache-Control", "public, max-age=30");

    return c.json({
      success: true,
      data: episodeWithVideo,
    });
  },
);

export const dramaRoutes = app;
export type DramaRoutes = typeof app;
