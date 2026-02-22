import { Hono } from "hono";
import { db } from "../db/index.js";
import { dramas, drama_lists } from "../db/schema.js";
import { requireAdminAuth } from "../middleware/admin-auth.js";
import {
  fetchAllDramas,
  getLatest,
  getFeatured,
  getRank,
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
  rankType?: number;
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

adminDramasRouter.post("/sync/rank-1", async (c) => {
  return await syncRankDramas(c, 1);
});

adminDramasRouter.post("/sync/rank-2", async (c) => {
  return await syncRankDramas(c, 2);
});

adminDramasRouter.post("/sync/rank-3", async (c) => {
  return await syncRankDramas(c, 3);
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

    if (apiResponse.data === null || apiResponse.data === undefined) {
      throw new Error("API proxy returned null data");
    }

    const dramasFromApi = apiResponse.data || [];
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
      await db.delete(drama_lists).where(eq(drama_lists.type, 'latest'));

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

          await db.insert(drama_lists).values({
            bookId: apiDrama.bookId,
            type: 'latest',
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
      await db.delete(drama_lists).where(eq(drama_lists.type, 'featured'));

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

          await db.insert(drama_lists).values({
            bookId: apiDrama.bookId,
            type: 'featured',
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

async function syncRankDramas(
  c: any,
  rankType: number,
): Promise<Response> {
  const startTime = Date.now();
  const stats: SyncStats = {
    total: 0,
    inserted: 0,
    updated: 0,
    errors: [],
    duration: 0,
  };

  try {
    // Map rank type to type string
    const typeString = `rank_${rankType}` as "rank_1" | "rank_2" | "rank_3";
    
    console.log(
      `[AdminDramas] Starting rank-${rankType} drama sync from api-proxy...`,
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

    const apiResponse = await getRank(rankType);

    if (!apiResponse.success) {
      throw new Error(`API proxy returned error: ${apiResponse.message}`);
    }

    if (apiResponse.data === null || apiResponse.data === undefined) {
      throw new Error("API proxy returned null data");
    }

    const dramasFromApi = apiResponse.data || [];
    stats.total = dramasFromApi.length;

    console.log(`[AdminDramas] Fetched ${stats.total} dramas from api-proxy for rank-${rankType}`);

    // Deduplicate by bookId
    const seenBookIds = new Set<string>();
    const uniqueDramas = dramasFromApi.filter((drama) => {
      if (seenBookIds.has(drama.bookId)) {
        console.log(
          `[AdminDramas] Skipping duplicate bookId in rank-${rankType}: ${drama.bookId} - "${drama.title}"`,
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
        `[AdminDramas] Deduplicated ${originalCount - stats.total} duplicate dramas from rank-${rankType} sync`,
      );
    }

    // Get existing entries for this rank type
    const existingEntries = await db
      .select({ bookId: drama_lists.bookId })
      .from(drama_lists)
      .where(eq(drama_lists.type, typeString));
    const existingBookIds = new Set(existingEntries.map(e => e.bookId));

    // Clear existing entries for the rank type
    await db.delete(drama_lists).where(eq(drama_lists.type, typeString));

    // Insert with position (index + 1)
    for (let i = 0; i < uniqueDramas.length; i++) {
      const apiDrama = uniqueDramas[i];
      try {
        const position = i + 1;

        await db.insert(drama_lists).values({
          bookId: apiDrama.bookId,
          type: typeString,
          position,
        });

        // Count as update if bookId existed in this rank before, otherwise insert
        if (existingBookIds.has(apiDrama.bookId)) {
          stats.updated++;
        } else {
          stats.inserted++;
        }
      } catch (error) {
        let errorDetails =
          error instanceof Error ? error.message : String(error);
        const errorMsg = `Failed to sync rank-${rankType} drama "${apiDrama.title}" (${apiDrama.bookId}): ${errorDetails}`;
        console.error(`[AdminDramas] ${errorMsg}`);
        stats.errors.push(errorMsg);
      }
    }

    stats.duration = Date.now() - startTime;

    console.log(
      `[AdminDramas] Rank-${rankType} sync completed: ${stats.total} total, ${stats.inserted} inserted, ${stats.updated} updated, ${stats.errors.length} errors, ${stats.duration}ms`,
    );

    stats.rankType = rankType;

    const response: SyncResponse = {
      success: true,
      data: stats,
    };

    return c.json(response, 200);
  } catch (error) {
    stats.duration = Date.now() - startTime;
    stats.rankType = rankType;
    const errorMsg = `Rank-${rankType} sync failed: ${error instanceof Error ? error.message : String(error)}`;
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
    language: apiDrama.language === "in" ? "id" : apiDrama.language || null,
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
