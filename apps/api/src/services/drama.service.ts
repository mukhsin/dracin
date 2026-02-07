import { eq, sql, like, desc, asc, and, or, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { dramas, episodes } from "../db/schema.js";
import type { Drama, Episode, PaginatedResponse } from "@repo/shared/types";
import {
  getEpisodes,
  type Episode as ApiProxyEpisode,
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

export interface DramaListFilters {
  search?: string;
  status?: "ongoing" | "completed" | "upcoming";
  language?: string;
  sortBy?: "title" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

type VideoQuality = "240p" | "360p" | "480p" | "720p" | "1080p" | "4k";

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
  ): Promise<PaginatedResponse<Drama>> {
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
      items: results,
      total,
      page,
      pageSize,
      hasMore: offset + results.length < total,
    };
  }

  /**
   * Get a single drama by slug with its episodes
   */
  async getBySlug(slug: string): Promise<DramaWithEpisodes | null> {
    // Get drama
    const [drama] = await db.select().from(dramas).where(eq(dramas.slug, slug));

    if (!drama) {
      return null;
    }

    // Get episodes directly (no seasons)
    const episodesList = await db
      .select()
      .from(episodes)
      .where(eq(episodes.dramaId, drama.id))
      .orderBy(asc(episodes.number));

    return {
      ...drama,
      episodes: episodesList,
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
    const [drama] = await db
      .select({ id: dramas.id, title: dramas.title, slug: dramas.slug })
      .from(dramas)
      .where(eq(dramas.slug, dramaSlug));

    if (!drama) {
      return { drama: null, episodes: [] };
    }

    // Get episodes directly
    const episodesList = await db
      .select()
      .from(episodes)
      .where(eq(episodes.dramaId, drama.id))
      .orderBy(asc(episodes.number));

    return {
      drama,
      episodes: episodesList,
    };
  }

  /**
   * Get an episode by ID with drama info
   */
  async getEpisode(episodeId: string): Promise<EpisodeWithDrama | null> {
    // Get episode with drama info using join
    const [result] = await db
      .select({
        episode: episodes,
        dramaId: dramas.id,
        dramaTitle: dramas.title,
        dramaSlug: dramas.slug,
      })
      .from(episodes)
      .innerJoin(dramas, eq(episodes.dramaId, dramas.id))
      .where(eq(episodes.id, episodeId));

    if (!result) {
      return null;
    }

    return {
      ...result.episode,
      drama: {
        id: result.dramaId,
        title: result.dramaTitle,
        slug: result.dramaSlug,
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
    const [drama] = await db
      .select({ id: dramas.id, title: dramas.title, slug: dramas.slug })
      .from(dramas)
      .where(eq(dramas.slug, dramaSlug));

    if (!drama) {
      return null;
    }

    // Get episode
    const [episode] = await db
      .select()
      .from(episodes)
      .where(
        and(eq(episodes.dramaId, drama.id), eq(episodes.number, episodeNumber)),
      );

    if (!episode) {
      return null;
    }

    return {
      ...episode,
      drama,
    };
  }

  /**
   * Get episodes by drama ID (for internal use)
   */
  async getEpisodesByDramaId(dramaId: string): Promise<Episode[]> {
    return db
      .select()
      .from(episodes)
      .where(eq(episodes.dramaId, dramaId))
      .orderBy(asc(episodes.number));
  }

  /**
   * Search dramas by title (for autocomplete)
   */
  async search(query: string, limit: number = 10): Promise<Drama[]> {
    const searchTerm = `%${query}%`;
    return db
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

    if (episodesWithUrls.length === 0 || !drama.bookId) {
      console.log(
        `[DramaService] No cached URLs for drama ${slug}, fetching fresh`,
      );
      if (drama.bookId) {
        this.fetchAndCacheEpisodes(drama.bookId.toString());
      }
      return { ...drama, source: "fresh" };
    }

    const firstEpisode = episodesWithUrls[0];
    const urlToValidate = getHighestQualityUrl(firstEpisode.videoUrls);

    if (!urlToValidate) {
      console.log(
        `[DramaService] No valid URL found for drama ${slug}, fetching fresh`,
      );
      if (drama.bookId) {
        this.fetchAndCacheEpisodes(drama.bookId.toString());
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

    console.log(`[DramaService] Cache stale for drama ${slug}, fetching fresh`);

    if (drama.bookId) {
      this.fetchAndCacheEpisodes(drama.bookId.toString());
    }

    try {
      const freshResult = await getEpisodes(drama.bookId.toString());
      if (freshResult.success && freshResult.data.episodes.length > 0) {
        const freshEpisodes = freshResult.data.episodes.map(
          (apiEpisode: ApiProxyEpisode) => ({
            id: crypto.randomUUID(),
            dramaId: drama.id,
            bookId: drama.bookId ?? null,
            number: apiEpisode.index,
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
        .where(eq(dramas.bookId, Number(bookId)));

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
              .update(episodes)
              .set({
                videoUrls,
                sourceUrl: apiEpisode.url ?? null,
              })
              .where(
                and(
                  eq(episodes.dramaId, drama.id),
                  eq(episodes.number, apiEpisode.index),
                ),
              );

            console.log(
              `[DramaService] Fire-and-forget: Updated episode ${apiEpisode.index} for drama ${drama.id}`,
            );
          } catch (error) {
            console.error(
              `[DramaService] Fire-and-forget: Failed to update episode ${apiEpisode.index}:`,
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
}

// Export singleton instance
export const dramaService = new DramaService();
