import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, desc, sql } from "drizzle-orm";
import { dramaService } from "../services/drama.service.js";
import { HTTPException } from "hono/http-exception";
import { db } from "../db/index.js";
import { dramas, watchHistory } from "../db/schema.js";
import { authMiddleware, type AuthContext } from "../middleware/auth.js";
import { watchlistService } from "../services/watchlist.service.js";
import { favoritesService } from "../services/favorites.service.js";
import type { DramaUserState } from "@repo/shared/types";

const ListDramasQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  q: z.string().optional(),
  status: z.enum(["ongoing", "completed", "upcoming"]).optional(),
  language: z.string().optional(),
  sortBy: z
    .enum(["title", "createdAt", "updatedAt", "playCount"])
    .default("playCount"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  t: z.enum(["popular", "featured", "latest"]).optional(),
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

const app = new Hono<{ Variables: AuthContext }>();

// Add auth middleware to all routes (sets user on context, allows anonymous)
app.use("*", authMiddleware);

app.get("/", zValidator("query", ListDramasQuerySchema), async (c) => {
  const { page, pageSize, q, status, language, sortBy, sortOrder, t } =
    c.req.valid("query");

  const result = await dramaService.list(page, pageSize, {
    search: q,
    status,
    language,
    sortBy,
    sortOrder,
    sectionType: t,
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
  const user = c.get("user");

  const drama = await dramaService.getDramaMetadataBySlug(slug);

  if (!drama) {
    throw new HTTPException(404, {
      message: `Drama with slug "${slug}" not found`,
    });
  }

  const {
    bookId: _bookId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...sanitizedDrama
  } = drama;
  let userState: DramaUserState = {
    isInWatchlist: false,
    isFavorite: false,
    watchedEpisodes: [],
    lastWatchedEpisode: null,
  };
  if (user) {
    const isInWatchlist = await watchlistService.isInWatchlist(
      user.id,
      drama.id,
    );

    const isFavorite = await favoritesService.isInFavorites(user.id, drama.id);
    const watchedEpisodesResult = await db
      .selectDistinct({ episodeNumber: watchHistory.episodeNumber })
      .from(watchHistory)
      .where(
        sql`${watchHistory.userId} = ${user.id} AND ${watchHistory.dramaSlug} = ${slug}`,
      )
      .orderBy(desc(watchHistory.watchedAt));
    const watchedEpisodes = watchedEpisodesResult.map((r) => r.episodeNumber);
    const lastWatchedEpisode = watchedEpisodes.length > 0 ? watchedEpisodes[0] : null;
    userState = {
      isInWatchlist,
      isFavorite,
      watchedEpisodes,
      lastWatchedEpisode,
    };
  }

  const dramaResponse = {
    ...sanitizedDrama,
    posterUrl: `/api/dramas/${drama.slug}/poster.jpg`,
    userState,
  };

  // Reduce cache time for authenticated users (personalized data)
  if (user) {
    c.header("Cache-Control", "private, max-age=30");
  } else {
    c.header("Cache-Control", "public, max-age=60");
  }

  return c.json({
    success: true,
    data: dramaResponse,
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

    // Use the new validation method that checks video URLs and fetches fresh if needed
    const fullEpisode = await dramaService.getEpisodeByNumberWithValidation(
      slug,
      number,
    );

    if (!fullEpisode) {
      throw new HTTPException(404, {
        message: `Episode ${number} for drama "${slug}" not found`,
      });
    }

    // Exclude videoUrls, sourceUrl, and bookId from response, return pre-built video URLs instead
    const {
      videoUrls: _v,
      sourceUrl: _s,
      bookId: _b,
      source: _source,
      ...episodeWithoutUrls
    } = fullEpisode;
    (void _v, _s, _b, _source);

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
      meta: {
        source: fullEpisode.source,
      },
    });
  },
);

export const dramaRoutes = app;
export type DramaRoutes = typeof app;

// GET /api/dramas/:slug/suggestions - Get drama suggestions based on title
app.get(
  "/:slug/suggestions",
  zValidator("param", GetDramaParamsSchema),
  async (c) => {
    const { slug } = c.req.valid("param");

    // Get the drama to fetch suggestions based on its title
    const drama = await dramaService.getDramaMetadataBySlug(slug);

    if (!drama) {
      throw new HTTPException(404, {
        message: `Drama with slug "${slug}" not found`,
      });
    }

    // Fetch suggestions based on the drama title, excluding current drama, max 10
    const suggestions = await dramaService.getSuggestionsByTitle(
      drama.title,
      drama.slug,
      10,
    );

    // Sanitize suggestions (map posterUrl)
    const sanitizedSuggestions = suggestions.map((suggestion) => ({
      id: suggestion.id,
      title: suggestion.title,
      slug: suggestion.slug,
      description: suggestion.description,
      posterUrl: `/api/dramas/${suggestion.slug}/poster.jpg`,
      status: suggestion.status,
      language: suggestion.language,
      playCount: suggestion.playCount,
      totalEpisodes: suggestion.totalEpisodes,
    }));

    // Add caching headers (5 minutes - suggestions don't change often)
    c.header("Cache-Control", "public, max-age=300");

    return c.json({
      success: true,
      data: sanitizedSuggestions,
    });
  },
);
