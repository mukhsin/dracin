import { Hono } from "hono";
import { db } from "../db/index.js";
import { dramas, latest_dramas, featured_dramas } from "../db/schema.js";
import { requireAdminAuth } from "../middleware/admin-auth.js";
import {
  fetchAllDramas,
  getLatest,
  getFeatured,
} from "../services/api-proxy.service.js";
import { eq } from "drizzle-orm";

function parsePlayCount(
  playCountStr: string | null | undefined,
): number | null {
  if (!playCountStr) return null;

  const str = playCountStr.toString().trim().toUpperCase();
  const match = str.match(/^(\d+\.?\d*)([MK])$/);

  if (!match) return null;

  const value = parseFloat(match[1]);
  const suffix = match[2];

  if (suffix === "M") return Math.round(value * 1_000_000);
  if (suffix === "K") return Math.round(value * 1_000);

  return null;
}

export const adminDramasRouter = new Hono();

adminDramasRouter.use("*", requireAdminAuth);

interface SyncStats {
  total: number;
  inserted: number;
  updated: number;
  errors: string[];
  duration: number;
}

interface SyncResponse {
  success: boolean;
  data: SyncStats;
}

adminDramasRouter.post("/sync/latest", async (c) => {
  return await syncDramas(c, "latest", () => getLatest(1, 1000));
});

adminDramasRouter.post("/sync/featured", async (c) => {
  return await syncDramas(c, "featured", () => getFeatured(1, 1000));
});

adminDramasRouter.post("/sync", async (c) => {
  return await syncDramas(c, "all", fetchAllDramas);
});

async function syncDramas(
  c: any,
  syncType: string,
  fetchFn: () => Promise<{ success: boolean; data: any[]; message?: string }>,
) {
  const startTime = Date.now();
  const stats: SyncStats = {
    total: 0,
    inserted: 0,
    updated: 0,
    errors: [],
    duration: 0,
  };

  try {
    console.log(
      `[AdminDramas] Starting ${syncType} drama sync from api-proxy...`,
    );

    if (!process.env.ADMIN_AUTH_SECRET) {
      return c.json(
        {
          success: false,
          error: {
            code: "CONFIG_ERROR",
            message: "ADMIN_AUTH_SECRET not configured",
          },
        },
        500,
      );
    }

    const apiResponse = await fetchFn();

    if (!apiResponse.success) {
      throw new Error(`API proxy returned error: ${apiResponse.message}`);
    }

    const dramasFromApi = apiResponse.data;
    stats.total = dramasFromApi.length;

    console.log(`[AdminDramas] Fetched ${stats.total} dramas from api-proxy`);

    if (syncType === "all") {
      // Original behavior: upsert to dramas table
      for (const apiDrama of dramasFromApi) {
        try {
          const transformedDrama = transformApiProxyDrama(apiDrama);

          // Check if drama already exists BEFORE upsert
          const existingDrama = await db
            .select({ id: dramas.id })
            .from(dramas)
            .where(eq(dramas.bookId, transformedDrama.bookId))
            .limit(1);

          const isUpdate = existingDrama.length > 0;

          await db
            .insert(dramas)
            .values({
              id: transformedDrama.id,
              bookId: transformedDrama.bookId,
              title: transformedDrama.title,
              slug: transformedDrama.slug,
              description: transformedDrama.description,
              posterUrl: transformedDrama.posterUrl,
              status: transformedDrama.status,
              language: transformedDrama.language,
              playCount: transformedDrama.playCount,
              sourceEndpoint: transformedDrama.sourceEndpoint,
              metadata: transformedDrama.metadata,
              totalEpisodes: transformedDrama.totalEpisodes,
              releaseYear: transformedDrama.releaseYear,
              country: transformedDrama.country,
              rating: transformedDrama.rating,
              genres: transformedDrama.genres,
              createdAt: transformedDrama.createdAt,
              updatedAt: transformedDrama.updatedAt,
            })
            .onConflictDoUpdate({
              target: [dramas.bookId],
              set: {
                title: transformedDrama.title,
                slug: transformedDrama.slug,
                description: transformedDrama.description,
                posterUrl: transformedDrama.posterUrl,
                status: transformedDrama.status,
                totalEpisodes: transformedDrama.totalEpisodes,
                updatedAt: new Date(),
              },
            });

          // Increment counter based on pre-check
          if (isUpdate) {
            stats.updated++;
          } else {
            stats.inserted++;
          }
        } catch (error) {
          let errorDetails =
            error instanceof Error ? error.message : String(error);
          // Log full error object for debugging
          console.error("[AdminDramas] Full error:", error);
          const errorMsg = `Failed to sync drama "${apiDrama.title}" (${apiDrama.bookId}): ${errorDetails}`;
          console.error(`[AdminDramas] ${errorMsg}`);
          stats.errors.push(errorMsg);
        }
      }
    } else if (syncType === "latest") {
      // Clear and insert to latest_dramas table
      await db.delete(latest_dramas);

      const seenBookIds = new Set<string>();
      const uniqueDramas = dramasFromApi.filter((drama) => {
        if (seenBookIds.has(drama.bookId)) {
          console.log(
            `[AdminDramas] Skipping duplicate bookId in latest: ${drama.bookId} - "${drama.title}"`,
          );
          return false;
        }
        seenBookIds.add(drama.bookId);
        return true;
      });

      const originalCount = stats.total;
      stats.total = uniqueDramas.length;

      if (originalCount > stats.total) {
        console.log(
          `[AdminDramas] Deduplicated ${originalCount - stats.total} duplicate dramas from latest sync`,
        );
      }

      for (let i = 0; i < uniqueDramas.length; i++) {
        const apiDrama = uniqueDramas[i];
        try {
          const position = i + 1;

          await db.insert(latest_dramas).values({
            bookId: apiDrama.bookId,
            position,
          });

          stats.inserted++;
        } catch (error) {
          let errorDetails =
            error instanceof Error ? error.message : String(error);
          const errorMsg = `Failed to sync latest drama "${apiDrama.title}" (${apiDrama.bookId}): ${errorDetails}`;
          console.error(`[AdminDramas] ${errorMsg}`);
          stats.errors.push(errorMsg);
        }
      }
    } else if (syncType === "featured") {
      // Clear and insert to featured_dramas table
      await db.delete(featured_dramas);

      const seenBookIds = new Set<string>();
      const uniqueDramas = dramasFromApi.filter((drama) => {
        if (seenBookIds.has(drama.bookId)) {
          console.log(
            `[AdminDramas] Skipping duplicate bookId in featured: ${drama.bookId} - "${drama.title}"`,
          );
          return false;
        }
        seenBookIds.add(drama.bookId);
        return true;
      });

      const originalCount = stats.total;
      stats.total = uniqueDramas.length;

      if (originalCount > stats.total) {
        console.log(
          `[AdminDramas] Deduplicated ${originalCount - stats.total} duplicate dramas from featured sync`,
        );
      }

      for (let i = 0; i < uniqueDramas.length; i++) {
        const apiDrama = uniqueDramas[i];
        try {
          const position = i + 1;

          await db.insert(featured_dramas).values({
            bookId: apiDrama.bookId,
            position,
          });

          stats.inserted++;
        } catch (error) {
          let errorDetails =
            error instanceof Error ? error.message : String(error);
          const errorMsg = `Failed to sync featured drama "${apiDrama.title}" (${apiDrama.bookId}): ${errorDetails}`;
          console.error(`[AdminDramas] ${errorMsg}`);
          stats.errors.push(errorMsg);
        }
      }
    }

    stats.duration = Date.now() - startTime;

    console.log(
      `[AdminDramas] Sync completed: ${stats.total} total, ${stats.inserted} inserted, ${stats.updated} updated, ${stats.errors.length} errors, ${stats.duration}ms`,
    );

    const response: SyncResponse = {
      success: true,
      data: stats,
    };

    return c.json(response, 200);
  } catch (error) {
    stats.duration = Date.now() - startTime;
    const errorMsg = `Sync failed: ${error instanceof Error ? error.message : String(error)}`;
    stats.errors.push(errorMsg);

    console.error(`[AdminDramas] ${errorMsg}`);

    return c.json(
      {
        success: false,
        error: {
          code: "SYNC_ERROR",
          message: errorMsg,
        },
      },
      500,
    );
  }
}

function transformApiProxyDrama(apiDrama: any) {
  const status: "completed" | "upcoming" =
    apiDrama.chapterCount && apiDrama.chapterCount > 0
      ? "completed"
      : "upcoming";

  return {
    id: crypto.randomUUID(),
    bookId: apiDrama.bookId,
    title: apiDrama.title,
    slug: generateUniqueSlug(apiDrama.title, apiDrama.bookId),
    description: apiDrama.intro,
    posterUrl: apiDrama.cover,
    status,
    language: apiDrama.language || null,
    playCount: apiDrama.playCount ? parsePlayCount(apiDrama.playCount) : null,
    sourceEndpoint: null,
    metadata: null,
    totalEpisodes: apiDrama.chapterCount || null,
    releaseYear: null,
    country: null,
    rating: null,
    genres: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function generateUniqueSlug(title: string, bookId: string): string {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
  // Append last 6 chars of bookId to guarantee uniqueness
  const uniqueSuffix = bookId.slice(-6);
  return `${baseSlug}-${uniqueSuffix}`;
}
