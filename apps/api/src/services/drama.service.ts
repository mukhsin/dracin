import { eq, sql, like, desc, asc, and, or, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { dramas, episodes } from "../db/schema.js";
import type { Drama, Episode, PaginatedResponse } from "@repo/shared/types";
import {
  getEpisodes,
  getLatest,
  search,
  type Episode as ApiProxyEpisode,
  type Drama as ApiProxyDrama,
} from "./api-proxy.service.js";
import {
  validateVideoUrl,
  getHighestQualityUrl,
  hasAnyVideoUrl,
  decodeHtmlEntities,
} from "../lib/url-validator.js";

// ============================================
// Types for Service Responses
// ============================================

export interface DramaWithEpisodes extends Drama {
  episodes: Episode[];
}

export interface DramaWithValidation extends DramaWithEpisodes {
  source: "cache" | "fresh";
}

export interface EpisodeWithDrama extends Episode {
  drama: Pick<Drama, "id" | "title" | "slug">;
}

export interface EpisodeSummary {
  id: string;
  number: number;
  title: string | null;
}

export interface EpisodeWithDramaAndNavigation extends Episode {
  drama: Pick<Drama, "id" | "title" | "slug" | "posterUrl" | "totalEpisodes">;
  navigation: {
    prevEpisode: EpisodeSummary | null;
    nextEpisode: EpisodeSummary | null;
  };
}

export interface DramaListFilters {
  search?: string;
  status?: "ongoing" | "completed" | "upcoming";
  language?: string;
  sortBy?: "title" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

type VideoQuality = "240p" | "360p" | "480p" | "720p" | "1080p" | "4k";

type DramaRow = typeof dramas.$inferSelect;
type EpisodeRow = typeof episodes.$inferSelect;

const mapDramaRowToShared = (row: DramaRow): Drama => row;

const mapEpisodeRowToShared = (row: EpisodeRow): Episode => row;

// ============================================
// Drama Service
// ============================================

export class DramaService {
  /**
   * List dramas with pagination, search, and filtering
   */
  async list(
    page: number = 1,
    pageSize: number = 20,
    filters: DramaListFilters = {},
  ): Promise<PaginatedResponse<Drama> & { source?: string }> {
    const offset = (page - 1) * pageSize;

    // Build where conditions
    const whereConditions = [];

    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      whereConditions.push(
        or(
          like(dramas.title, searchTerm),
          like(dramas.description, searchTerm),
        ),
      );
    }

    if (filters.status) {
      whereConditions.push(eq(dramas.status, filters.status));
    }

    if (filters.language) {
      whereConditions.push(eq(dramas.language, filters.language));
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Get total count
    const [countResult] = await db
      .select({ count: count() })
      .from(dramas)
      .where(whereClause || sql`true`);

    const total = countResult?.count ?? 0;

    // FALLBACK: If no results and search query provided, call api-proxy
    if (total === 0 && filters.search) {
      console.log(
        `[DramaService] No DB results for search "${filters.search}", falling back to api-proxy`,
      );
      try {
        const apiResult = await search(filters.search, page, pageSize);
        if (apiResult.success && apiResult.data.length > 0) {
          const transformedDramas = apiResult.data.map((d) =>
            this.transformApiProxyDrama(d),
          );

          // Fire-and-forget: Cache dramas to DB
          this.cacheDramasToDb(transformedDramas);

          return {
            items: transformedDramas,
            total: apiResult.data.length,
            page,
            pageSize,
            hasMore: false,
            source: "api-proxy",
          };
        }
      } catch (error) {
        console.error(`[DramaService] Api-proxy search failed:`, error);
      }
    }

    // FALLBACK: If no results at all, call api-proxy latest
    if (total === 0) {
      console.log(
        `[DramaService] No dramas in DB, falling back to api-proxy latest`,
      );
      try {
        const apiResult = await getLatest(page, pageSize);
        if (apiResult.success && apiResult.data.length > 0) {
          const transformedDramas = apiResult.data.map((d) =>
            this.transformApiProxyDrama(d),
          );

          // Fire-and-forget: Cache dramas to DB
          this.cacheDramasToDb(transformedDramas);

          return {
            items: transformedDramas,
            total: apiResult.data.length,
            page,
            pageSize,
            hasMore: apiResult.data.length === pageSize,
            source: "api-proxy",
          };
        }
      } catch (error) {
        console.error(`[DramaService] Api-proxy getLatest failed:`, error);
      }
    }

    // Determine sort order
    const sortColumn =
      filters.sortBy === "title"
        ? dramas.title
        : filters.sortBy === "updatedAt"
          ? dramas.updatedAt
          : dramas.createdAt;

    const sortFn = filters.sortOrder === "asc" ? asc : desc;

    // Get dramas
    const results = await db
      .select()
      .from(dramas)
      .where(whereClause || sql`true`)
      .orderBy(sortFn(sortColumn))
      .limit(pageSize)
      .offset(offset);

    return {
      items: results.map(mapDramaRowToShared),
      total,
      page,
      pageSize,
      hasMore: offset + results.length < total,
      source: "db",
    };
  }

  /**
   * Get a single drama by slug with its episodes
   */
  async getBySlug(slug: string): Promise<DramaWithEpisodes | null> {
    // Get drama
    const [dramaRow] = await db
      .select()
      .from(dramas)
      .where(eq(dramas.slug, slug));

    if (!dramaRow) {
      return null;
    }

    const drama = mapDramaRowToShared(dramaRow);

    // Get episodes directly (no seasons)
    const episodesList = await db
      .select()
      .from(episodes)
      .where(eq(episodes.dramaId, drama.id))
      .orderBy(asc(episodes.number));

    return {
      ...drama,
      episodes: episodesList.map(mapEpisodeRowToShared),
    };
  }

  /**
   * Get episodes by drama slug
   */
  async getEpisodesByDramaSlug(dramaSlug: string): Promise<{
    drama: Pick<Drama, "id" | "title" | "slug"> | null;
    episodes: Episode[];
  }> {
    // Get drama
    const [dramaRow] = await db
      .select()
      .from(dramas)
      .where(eq(dramas.slug, dramaSlug));

    if (!dramaRow) {
      return { drama: null, episodes: [] };
    }

    const drama: Pick<Drama, "id" | "title" | "slug"> = {
      id: dramaRow.id,
      title: dramaRow.title,
      slug: dramaRow.slug,
    };

    // Get episodes directly
    const episodesList = await db
      .select()
      .from(episodes)
      .where(eq(episodes.dramaId, drama.id))
      .orderBy(asc(episodes.number));

    return {
      drama,
      episodes: episodesList.map(mapEpisodeRowToShared),
    };
  }

  /**
   * Get an episode by ID with drama info and navigation
   */
  async getEpisode(
    episodeId: string,
  ): Promise<EpisodeWithDramaAndNavigation | null> {
    // Get episode with drama info using join
    const [result] = await db
      .select({
        episode: episodes,
        dramaId: dramas.id,
        dramaTitle: dramas.title,
        dramaSlug: dramas.slug,
        dramaPosterUrl: dramas.posterUrl,
        totalEpisodes: dramas.totalEpisodes,
      })
      .from(episodes)
      .innerJoin(dramas, eq(episodes.dramaId, dramas.id))
      .where(eq(episodes.id, episodeId));

    if (!result) {
      return null;
    }

    const episode = mapEpisodeRowToShared(result.episode);

    // Query for previous episode (same drama, number - 1)
    const [prevEpisode] = await db
      .select({
        id: episodes.id,
        number: episodes.number,
        title: episodes.title,
      })
      .from(episodes)
      .where(
        and(
          eq(episodes.dramaId, result.episode.dramaId),
          eq(episodes.number, result.episode.number - 1),
        ),
      )
      .limit(1);

    // Query for next episode (same drama, number + 1)
    const [nextEpisode] = await db
      .select({
        id: episodes.id,
        number: episodes.number,
        title: episodes.title,
      })
      .from(episodes)
      .where(
        and(
          eq(episodes.dramaId, result.episode.dramaId),
          eq(episodes.number, result.episode.number + 1),
        ),
      )
      .limit(1);

    return {
      ...episode,
      drama: {
        id: result.dramaId,
        title: result.dramaTitle,
        slug: result.dramaSlug,
        posterUrl: result.dramaPosterUrl,
        totalEpisodes: result.totalEpisodes,
      },
      navigation: {
        prevEpisode: prevEpisode || null,
        nextEpisode: nextEpisode || null,
      },
    };
  }

  /**
   * Get an episode by drama slug and episode number
   */
  async getEpisodeByNumber(
    dramaSlug: string,
    episodeNumber: number,
  ): Promise<EpisodeWithDrama | null> {
    // Get drama first
    const [dramaRow] = await db
      .select()
      .from(dramas)
      .where(eq(dramas.slug, dramaSlug));

    if (!dramaRow) {
      return null;
    }

    // Get episode
    const [episodeRow] = await db
      .select()
      .from(episodes)
      .where(
        and(
          eq(episodes.dramaId, dramaRow.id),
          eq(episodes.number, episodeNumber),
        ),
      );

    if (!episodeRow) {
      return null;
    }

    return {
      ...mapEpisodeRowToShared(episodeRow),
      drama: {
        id: dramaRow.id,
        title: dramaRow.title,
        slug: dramaRow.slug,
      },
    };
  }

  /**
   * Get episodes by drama ID (for internal use)
   */
  async getEpisodesByDramaId(dramaId: string): Promise<Episode[]> {
    const rows = await db
      .select()
      .from(episodes)
      .where(eq(episodes.dramaId, dramaId))
      .orderBy(asc(episodes.number));

    return rows.map(mapEpisodeRowToShared);
  }

  /**
   * Search dramas by title (for autocomplete)
   */
  async search(query: string, limit: number = 10): Promise<Drama[]> {
    const searchTerm = `%${query}%`;
    const rows = await db
      .select()
      .from(dramas)
      .where(
        or(
          like(dramas.title, searchTerm),
          like(dramas.description, searchTerm),
        ),
      )
      .orderBy(asc(dramas.title))
      .limit(limit);

    return rows.map(mapDramaRowToShared);
  }

  async getBySlugWithValidation(
    slug: string,
  ): Promise<DramaWithValidation | null> {
    const drama = await this.getBySlug(slug);
    if (!drama) {
      return null;
    }

    const episodesWithUrls = drama.episodes.filter((ep) =>
      hasAnyVideoUrl(ep.videoUrls),
    );

    const bookIdString = drama.bookId?.toString() ?? null;

    if (episodesWithUrls.length === 0 || !bookIdString) {
      console.log(
        `[DramaService] No cached URLs for drama ${slug}, fetching fresh synchronously`,
      );
      if (bookIdString) {
        const freshEpisodes = await this.fetchEpisodesSynchronously(
          bookIdString,
          drama.id,
        );
        if (freshEpisodes && freshEpisodes.length > 0) {
          return {
            ...drama,
            episodes: freshEpisodes,
            source: "fresh",
          };
        }
      }
      return { ...drama, source: "fresh" };
    }

    const firstEpisode = episodesWithUrls[0];
    const urlToValidate = getHighestQualityUrl(firstEpisode.videoUrls);

    if (!urlToValidate) {
      console.log(
        `[DramaService] No valid URL found for drama ${slug}, fetching fresh synchronously`,
      );
      if (bookIdString) {
        const freshEpisodes = await this.fetchEpisodesSynchronously(
          bookIdString,
          drama.id,
        );
        if (freshEpisodes && freshEpisodes.length > 0) {
          return {
            ...drama,
            episodes: freshEpisodes,
            source: "fresh",
          };
        }
      }
      return { ...drama, source: "fresh" };
    }

    console.log(
      `[DramaService] Validating URL for drama ${slug}: ${urlToValidate.substring(0, 50)}...`,
    );
    const isValid = await validateVideoUrl(urlToValidate);

    if (isValid) {
      console.log(`[DramaService] Cache valid for drama ${slug}`);
      return { ...drama, source: "cache" };
    }

    console.log(
      `[DramaService] Cache stale for drama ${slug}, fetching fresh synchronously`,
    );

    if (bookIdString) {
      const freshEpisodes = await this.fetchEpisodesSynchronously(
        bookIdString,
        drama.id,
      );
      if (freshEpisodes && freshEpisodes.length > 0) {
        return {
          ...drama,
          episodes: freshEpisodes,
          source: "fresh",
        };
      }
    }

    try {
      const freshResult = await getEpisodes(bookIdString ?? "");
      if (freshResult.success && freshResult.data.episodes.length > 0) {
        const freshEpisodes = freshResult.data.episodes.map(
          (apiEpisode: ApiProxyEpisode) => ({
            id: crypto.randomUUID(),
            dramaId: drama.id,
            bookId: drama.bookId ?? null,
            number: apiEpisode.index + 1,
            title: apiEpisode.title,
            description: null,
            duration: null,
            videoUrls: apiEpisode.url
              ? this.transformApiProxyUrlToVideoUrls(apiEpisode.url)
              : {},
            sourceUrl: apiEpisode.url ?? null,
            createdAt: new Date(),
          }),
        );

        return {
          ...drama,
          episodes: freshEpisodes as Episode[],
          source: "fresh",
        };
      }
    } catch (error) {
      console.error(
        `[DramaService] Failed to fetch fresh episodes for ${slug}:`,
        error,
      );
    }

    return { ...drama, source: "fresh" };
  }

  async updateStatusIfCompleted(dramaId: string): Promise<void> {
    const [drama] = await db
      .select({
        id: dramas.id,
        bookId: dramas.bookId,
        totalEpisodes: dramas.totalEpisodes,
        status: dramas.status,
      })
      .from(dramas)
      .where(eq(dramas.id, dramaId));

    if (!drama || !drama.totalEpisodes || drama.status === "completed") {
      return;
    }

    const [episodeCountResult] = await db
      .select({ count: count() })
      .from(episodes)
      .where(eq(episodes.dramaId, dramaId));

    const episodeCount = episodeCountResult?.count ?? 0;

    if (episodeCount >= drama.totalEpisodes && episodeCount > 0) {
      console.log(
        `[DramaService] Updating drama ${dramaId} status to "completed" (${episodeCount}/${drama.totalEpisodes} episodes)`,
      );

      await db
        .update(dramas)
        .set({
          status: "completed",
          updatedAt: new Date(),
        })
        .where(eq(dramas.id, dramaId));
    }
  }

  private async fetchAndCacheEpisodes(bookId: string): Promise<void> {
    console.log(
      `[DramaService] Fire-and-forget: Fetching episodes for bookId ${bookId}`,
    );

    try {
      const result = await getEpisodes(bookId);

      if (!result.success || result.data.episodes.length === 0) {
        console.log(
          `[DramaService] Fire-and-forget: No episodes found for bookId ${bookId}`,
        );
        return;
      }

      const [drama] = await db
        .select({ id: dramas.id })
        .from(dramas)
        .where(eq(dramas.bookId, bookId));

      if (!drama) {
        console.log(
          `[DramaService] Fire-and-forget: Drama not found for bookId ${bookId}`,
        );
        return;
      }

      const updatePromises = result.data.episodes.map(
        async (apiEpisode: ApiProxyEpisode) => {
          try {
            const videoUrls = apiEpisode.url
              ? this.transformApiProxyUrlToVideoUrls(apiEpisode.url)
              : {};

            await db
              .insert(episodes)
              .values({
                dramaId: drama.id,
                bookId: bookId,
                number: apiEpisode.index + 1,
                title: apiEpisode.title ?? `Episode ${apiEpisode.index + 1}`,
                description: null,
                duration: null,
                videoUrls,
                sourceUrl: apiEpisode.url ?? null,
                createdAt: new Date(),
              })
              .onConflictDoUpdate({
                target: [episodes.dramaId, episodes.number],
                set: {
                  videoUrls,
                  sourceUrl: apiEpisode.url ?? null,
                },
              });

            console.log(
              `[DramaService] Fire-and-forget: Upserted episode ${apiEpisode.index} for drama ${drama.id}`,
            );
          } catch (error) {
            console.error(
              `[DramaService] Fire-and-forget: Failed to upsert episode ${apiEpisode.index}:`,
              error,
            );
          }
        },
      );

      await Promise.all(updatePromises);
      console.log(
        `[DramaService] Fire-and-forget: Cached ${result.data.episodes.length} episodes for bookId ${bookId}`,
      );
    } catch (error) {
      console.error(
        `[DramaService] Fire-and-forget: Failed to fetch/cache episodes for bookId ${bookId}:`,
        error,
      );
    }
  }

  private transformApiProxyUrlToVideoUrls(
    url: string,
  ): Partial<Record<VideoQuality, string>> {
    const videoUrls: Partial<Record<VideoQuality, string>> = {};

    const decodedUrl = decodeHtmlEntities(url);

    const qualityMatch = decodedUrl.match(/\.(\d+p|4k)\./i);

    if (qualityMatch) {
      const detectedQuality = qualityMatch[1].toLowerCase() as VideoQuality;
      if (
        ["240p", "360p", "480p", "720p", "1080p", "4k"].includes(
          detectedQuality,
        )
      ) {
        videoUrls[detectedQuality] = decodedUrl;
      } else {
        videoUrls["1080p"] = decodedUrl;
      }
    } else {
      videoUrls["1080p"] = decodedUrl;
    }

    return videoUrls;
  }

  private transformApiProxyDrama(apiDrama: ApiProxyDrama): Drama {
    const status =
      apiDrama.chapterCount && apiDrama.chapterCount > 0
        ? "ongoing"
        : "upcoming";

    return {
      id: crypto.randomUUID(),
      bookId: apiDrama.bookId,
      title: apiDrama.title,
      slug: this.generateSlug(apiDrama.title),
      description: apiDrama.intro,
      posterUrl: apiDrama.cover,
      status,
      language: null,
      playCount: apiDrama.playCount || null,
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

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }

  private async cacheDramasToDb(dramasToCache: Drama[]): Promise<void> {
    console.log(
      `[DramaService] Fire-and-forget: Caching ${dramasToCache.length} dramas to DB`,
    );

    try {
      for (const drama of dramasToCache) {
        await db
          .insert(dramas)
          .values({
            id: drama.id,
            bookId: drama.bookId,
            title: drama.title,
            slug: drama.slug,
            description: drama.description,
            posterUrl: drama.posterUrl,
            status: drama.status,
            language: drama.language,
            playCount: drama.playCount,
            sourceEndpoint: drama.sourceEndpoint,
            metadata: drama.metadata,
            totalEpisodes: drama.totalEpisodes,
            releaseYear: drama.releaseYear,
            country: drama.country,
            rating: drama.rating,
            genres: drama.genres,
            createdAt: drama.createdAt,
            updatedAt: drama.updatedAt,
          })
          .onConflictDoUpdate({
            target: [dramas.bookId],
            set: {
              title: drama.title,
              slug: drama.slug,
              description: drama.description,
              posterUrl: drama.posterUrl,
              status: drama.status,
              totalEpisodes: drama.totalEpisodes,
              updatedAt: new Date(),
            },
          });

        console.log(
          `[DramaService] Fire-and-forget: Cached drama ${drama.title} (${drama.bookId})`,
        );
      }

      console.log(
        `[DramaService] Fire-and-forget: Successfully cached ${dramasToCache.length} dramas`,
      );
    } catch (error) {
      console.error(
        `[DramaService] Fire-and-forget: Failed to cache dramas:`,
        error,
      );
    }
  }

  private async fetchEpisodesSynchronously(
    bookId: string,
    dramaId: string,
  ): Promise<Episode[] | null> {
    console.log(
      `[DramaService] Synchronously fetching episodes for bookId ${bookId}`,
    );

    try {
      const result = await getEpisodes(bookId);

      if (!result.success || result.data.episodes.length === 0) {
        console.log(
          `[DramaService] No episodes found from api-proxy for bookId ${bookId}`,
        );
        return null;
      }

      const freshEpisodes = result.data.episodes.map(
        (apiEpisode: ApiProxyEpisode) => ({
          id: crypto.randomUUID(),
          dramaId: dramaId,
          bookId: bookId,
          number: apiEpisode.index + 1,
          title: apiEpisode.title,
          description: null,
          duration: null,
          videoUrls: apiEpisode.url
            ? this.transformApiProxyUrlToVideoUrls(apiEpisode.url)
            : {},
          sourceUrl: apiEpisode.url ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      console.log(
        `[DramaService] Fetched ${freshEpisodes.length} episodes synchronously for bookId ${bookId}`,
      );

      this.cacheEpisodesToDb(bookId, dramaId, result.data.episodes);

      return freshEpisodes;
    } catch (error) {
      console.error(
        `[DramaService] Failed to fetch episodes synchronously for bookId ${bookId}:`,
        error,
      );
      return null;
    }
  }

  private async cacheEpisodesToDb(
    bookId: string,
    dramaId: string,
    apiEpisodes: ApiProxyEpisode[],
  ): Promise<void> {
    try {
      for (const apiEpisode of apiEpisodes) {
        const videoUrls = apiEpisode.url
          ? this.transformApiProxyUrlToVideoUrls(apiEpisode.url)
          : {};

        await db
          .insert(episodes)
          .values({
            dramaId: dramaId,
            bookId: bookId,
            number: apiEpisode.index + 1,
            title: apiEpisode.title ?? `Episode ${apiEpisode.index + 1}`,
            description: null,
            duration: null,
            videoUrls: videoUrls,
            sourceUrl: apiEpisode.url ?? null,
          })
          .onConflictDoUpdate({
            target: [episodes.dramaId, episodes.number],
            set: {
              videoUrls: videoUrls,
              sourceUrl: apiEpisode.url ?? null,
            },
          });
      }
    } catch (error) {
      console.error(`[DramaService] Failed to cache episodes:`, error);
    }
  }
}

// Export singleton instance
export const dramaService = new DramaService();
