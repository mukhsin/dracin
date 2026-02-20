import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { episodes, dramas } from "../db/schema.js";
import { getEpisodes } from "../services/api-proxy.service.js";
import { decodeHtmlEntities } from "../lib/url-validator.js";
import {
  getCircuitBreakerStatus,
  clearFallbackCache,
  resetFallbackService,
} from "../middleware/fallback.js";
import { requireAdminAuth } from "../middleware/admin-auth.js";

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

const VIDEO_QUALITIES: VideoQuality[] = [
  "240p",
  "360p",
  "480p",
  "720p",
  "1080p",
  "4k",
];

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
 * Transform API-Proxy URL to videoUrls format
 * API-Proxy returns a single URL, we map it to appropriate quality based on URL patterns
 */
function transformApiProxyUrlToVideoUrls(
  url: string,
): Partial<Record<VideoQuality, string>> {
  const videoUrls: Partial<Record<VideoQuality, string>> = {};

  const decodedUrl = decodeHtmlEntities(url);

  // Try to detect quality from URL pattern
  // Common patterns: .1080p., .720p., .480p., etc.
  const qualityMatch = decodedUrl.match(/\.(\d+p|4k)\./i);

  if (qualityMatch) {
    const detectedQuality = qualityMatch[1].toLowerCase() as VideoQuality;
    if (
      ["240p", "360p", "480p", "720p", "1080p", "4k"].includes(detectedQuality)
    ) {
      videoUrls[detectedQuality] = decodedUrl;
    } else {
      // Unknown quality pattern, default to 1080p
      videoUrls["1080p"] = decodedUrl;
    }
  } else {
    // No quality detected in URL, default to 1080p
    videoUrls["1080p"] = decodedUrl;
  }

  return videoUrls;
}

function buildShortVideoUrls(
  origin: string,
  dramaId: string,
  episodeNumber: number,
  qualities: VideoQuality[],
): Partial<Record<VideoQuality, string>> {
  const shortUrls: Partial<Record<VideoQuality, string>> = {};

  const cleanOrigin = origin.replace(/\/+$/, "");

  for (const quality of qualities) {
    const episodeKey = `${episodeNumber}.${quality}.mp4`;
    shortUrls[quality] = `${cleanOrigin}/api/video/${dramaId}.${episodeKey}`;
  }

  return shortUrls;
}

/**
 * Create admin routes for fallback management
 */
export function createFallbackAdminRoutes(): Hono {
  const app = new Hono();

  // Apply admin authentication middleware to all routes in this router
  app.use(requireAdminAuth);

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
export const fallbackAdminRoutes = createFallbackAdminRoutes();
