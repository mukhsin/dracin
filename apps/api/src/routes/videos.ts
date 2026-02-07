import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { episodes, dramas } from "../db/schema.js";
import { getEpisodes } from "../services/api-proxy.service.js";
import {
  getCircuitBreakerStatus,
  clearFallbackCache,
  resetFallbackService,
} from "../middleware/fallback.js";

function createResetRoute(app: Hono) {
  app.post("/admin/fallback/reset", (c) => {
    resetFallbackService();
    return c.json({
      success: true,
      message: "Circuit breaker reset successfully",
    });
  });
}

/**
 * Schema for episode ID parameter validation
 */
const episodeIdSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Schema for video quality options
 */
type VideoQuality = "240p" | "360p" | "480p" | "720p" | "1080p" | "4k";

/**
 * Video URLs response type
 */
interface VideoUrlsResponse {
  success: boolean;
  data: {
    episodeId: string;
    videoUrls: Partial<Record<VideoQuality, string>>;
    qualities: VideoQuality[];
    source: "primary" | "fallback" | "circuit-breaker";
  };
}

/**
 * Error response type
 */
interface ErrorResponse {
  success: false;
  error: string;
  message: string;
}

/**
 * Create video routes with fallback support
 */
export function createVideoRoutes(): Hono {
  const app = new Hono();

  /**
   * GET /api/episodes/:id/videos
   * Get video URLs for an episode with fallback support
   */
  app.get(
    "/episodes/:id/videos",
    zValidator("param", episodeIdSchema),
    async (c) => {
      const { id } = c.req.valid("param");

      try {
        // Try to get from local database first (primary source)
        // Include drama info to get bookId for potential fallback
        const episode = await db.query.episodes.findFirst({
          where: eq(episodes.id, id),
          columns: {
            id: true,
            number: true,
            videoUrls: true,
          },
          with: {
            drama: {
              columns: {
                bookId: true,
              },
            },
          },
        });

        if (!episode) {
          return c.json(
            {
              success: false,
              error: "Not Found",
              message: `Episode with ID ${id} not found`,
            } as ErrorResponse,
            404,
          );
        }

        let videoUrls = episode.videoUrls || {};
        let source: "primary" | "fallback" | "circuit-breaker" = "primary";

        // Check if videoUrls is stale/empty (empty object or no URLs)
        const isStale = Object.keys(videoUrls).length === 0;

        if (isStale && episode.drama?.bookId) {
          console.log(
            `[VideoRoutes] DB URLs stale for episode ${id}, fetching from API-Proxy (bookId: ${episode.drama.bookId})`,
          );

          try {
            // Fetch fresh episodes from API-Proxy
            const apiProxyResult = await getEpisodes(
              episode.drama.bookId.toString(),
            );

            if (
              apiProxyResult.success &&
              apiProxyResult.data.episodes.length > 0
            ) {
              // Find the matching episode by number
              const matchingEpisode = apiProxyResult.data.episodes.find(
                (ep) => ep.index === episode.number,
              );

              if (matchingEpisode?.url) {
                // Transform API-Proxy URL to videoUrls format
                // API-Proxy returns a single URL, we map it to 1080p quality
                // The URL may contain quality indicators we can parse
                videoUrls = transformApiProxyUrlToVideoUrls(
                  matchingEpisode.url,
                );
                source = "fallback";

                console.log(
                  `[VideoRoutes] Fallback successful for episode ${id}, found ${Object.keys(videoUrls).length} quality variants`,
                );
              }
            }
          } catch (fallbackError) {
            console.error(
              `[VideoRoutes] Fallback fetch failed for episode ${id}:`,
              fallbackError,
            );
            // Keep empty videoUrls, let circuit-breaker middleware handle it
          }
        }

        const qualities = Object.keys(videoUrls) as VideoQuality[];

        const response: VideoUrlsResponse = {
          success: true,
          data: {
            episodeId: id,
            videoUrls,
            qualities,
            source,
          },
        };

        return c.json(response);
      } catch (error) {
        console.error(`[VideoRoutes] Error fetching episode ${id}:`, error);

        // Return error - fallback middleware should have caught this
        // but we handle it here as a last resort
        return c.json(
          {
            success: false,
            error: "Internal Server Error",
            message: "Failed to retrieve video URLs",
          } as ErrorResponse,
          500,
        );
      }
    },
  );

  return app;
}

/**
 * Transform API-Proxy URL to videoUrls format
 * API-Proxy returns a single URL, we map it to appropriate quality based on URL patterns
 */
function transformApiProxyUrlToVideoUrls(
  url: string,
): Partial<Record<VideoQuality, string>> {
  const videoUrls: Partial<Record<VideoQuality, string>> = {};

  // Try to detect quality from URL pattern
  // Common patterns: .1080p., .720p., .480p., etc.
  const qualityMatch = url.match(/\.(\d+p|4k)\./i);

  if (qualityMatch) {
    const detectedQuality = qualityMatch[1].toLowerCase() as VideoQuality;
    if (
      ["240p", "360p", "480p", "720p", "1080p", "4k"].includes(detectedQuality)
    ) {
      videoUrls[detectedQuality] = url;
    } else {
      // Unknown quality pattern, default to 1080p
      videoUrls["1080p"] = url;
    }
  } else {
    // No quality detected in URL, default to 1080p
    videoUrls["1080p"] = url;
  }

  return videoUrls;
}

/**
 * Create admin routes for fallback management
 */
export function createFallbackAdminRoutes(): Hono {
  const app = new Hono();

  /**
   * GET /api/admin/fallback/status
   * Get circuit breaker status for monitoring
   */
  app.get("/admin/fallback/status", (c) => {
    const status = getCircuitBreakerStatus();

    return c.json({
      success: true,
      data: {
        circuitBreaker: status,
        timestamp: new Date().toISOString(),
      },
    });
  });

  /**
   * POST /api/admin/fallback/clear-cache
   * Clear the fallback cache
   */
  app.post("/admin/fallback/clear-cache", (c) => {
    clearFallbackCache();

    return c.json({
      success: true,
      message: "Fallback cache cleared successfully",
    });
  });

  createResetRoute(app);

  return app;
}

/**
 * Combined video routes (public + admin)
 */
export const videoRoutes = createVideoRoutes();
export const fallbackAdminRoutes = createFallbackAdminRoutes();

export default videoRoutes;
