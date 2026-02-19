import { eq, and, or, desc, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { watchHistory, episodes, dramas } from "../db/schema.js";
import type { WatchHistory, Episode, Drama } from "@repo/shared/types";

export interface WatchHistoryWithEpisode extends WatchHistory {
  episode: Episode & {
    drama: Pick<Drama, "id" | "title" | "slug" | "posterUrl">;
  };
}

export interface ContinueWatchingItem {
  historyId: string;
  episodeId: string;
  dramaId: string;
  dramaTitle: string;
  dramaSlug: string;
  posterUrl: string | null;
  episodeNumber: number;
  episodeTitle: string | null;
  progress: number;
  duration: number | null;
  progressPercent: number;
  watchedAt: Date;
  completed: boolean;
}

export interface HistoryListResult {
  items: WatchHistoryWithEpisode[];
  total: number;
}

export class HistoryService {
  async getUserHistory(userId: string): Promise<HistoryListResult> {
    const results = await db
      .select({
        history: watchHistory,
        episode: episodes,
        drama: dramas,
      })
      .from(watchHistory)
      .innerJoin(dramas, eq(watchHistory.dramaSlug, dramas.slug))
      .innerJoin(
        episodes,
        and(
          eq(episodes.dramaId, dramas.id),
          eq(watchHistory.episodeNumber, episodes.number),
        ),
      )
      .where(eq(watchHistory.userId, userId))
      .orderBy(desc(watchHistory.watchedAt));

    const items = results.map((row) => ({
      ...row.history,
      episode: {
        ...row.episode,
        drama: {
          id: row.drama.id,
          title: row.drama.title,
          slug: row.drama.slug,
          posterUrl: row.drama.posterUrl,
        },
      },
    }));

    return {
      items,
      total: items.length,
    };
  }

  async getContinueWatching(userId: string): Promise<ContinueWatchingItem[]> {
    const results = await db
      .select({
        history: watchHistory,
        episode: episodes,
        drama: dramas,
      })
      .from(watchHistory)
      .innerJoin(dramas, eq(watchHistory.dramaSlug, dramas.slug))
      .innerJoin(
        episodes,
        and(
          eq(episodes.dramaId, dramas.id),
          eq(watchHistory.episodeNumber, episodes.number),
        ),
      )
      .where(
        and(eq(watchHistory.userId, userId), eq(watchHistory.completed, false)),
      )
      .orderBy(desc(watchHistory.watchedAt))
      .limit(20);

    return results.map((row) => ({
      historyId: row.history.id,
      episodeId: row.episode.id,
      dramaId: row.drama.id,
      dramaTitle: row.drama.title,
      dramaSlug: row.drama.slug,
      posterUrl: row.drama.posterUrl,
      episodeNumber: row.episode.number,
      episodeTitle: row.episode.title,
      progress: row.history.progress,
      duration: row.episode.duration,
      progressPercent: row.episode.duration
        ? Math.round((row.history.progress / row.episode.duration) * 100)
        : 0,
      watchedAt: row.history.watchedAt,
      completed: row.history.completed,
    }));
  }

  async recordProgress(
    userId: string,
    episodeId: string,
    progress: number,
    completed: boolean = false,
  ): Promise<WatchHistoryWithEpisode> {
    const [episodeWithDrama] = await db
      .select({
        episode: episodes,
        drama: dramas,
      })
      .from(episodes)
      .innerJoin(dramas, eq(episodes.dramaId, dramas.id))
      .where(eq(episodes.id, episodeId));

    if (!episodeWithDrama) {
      throw new Error(`Episode ${episodeId} not found`);
    }

    const [existing] = await db
      .select()
      .from(watchHistory)
      .where(
        and(
          eq(watchHistory.userId, userId),
          eq(watchHistory.dramaSlug, episodeWithDrama.drama.slug),
          eq(watchHistory.episodeNumber, episodeWithDrama.episode.number),
        ),
      );

    let historyItem: WatchHistory;

    if (existing) {
      const [updated] = await db
        .update(watchHistory)
        .set({
          progress,
          completed,
          watchedAt: new Date(),
        })
        .where(eq(watchHistory.id, existing.id))
        .returning();
      historyItem = updated;
    } else {
      const [created] = await db
        .insert(watchHistory)
        .values({
          userId,
          dramaSlug: episodeWithDrama.drama.slug,
          episodeNumber: episodeWithDrama.episode.number,
          progress,
          completed,
        })
        .returning();
      historyItem = created;
    }

    const [result] = await db
      .select({
        episode: episodes,
        drama: dramas,
      })
      .from(episodes)
      .innerJoin(dramas, eq(episodes.dramaId, dramas.id))
      .where(eq(episodes.id, episodeId));

    return {
      ...historyItem,
      episode: {
        ...result.episode,
        drama: {
          id: result.drama.id,
          title: result.drama.title,
          slug: result.drama.slug,
          posterUrl: result.drama.posterUrl,
        },
      },
    };
  }

  async getEpisodeProgress(
    userId: string,
    episodeId: string,
  ): Promise<WatchHistory | null> {
    const [episode] = await db
      .select()
      .from(episodes)
      .where(eq(episodes.id, episodeId));

    if (!episode) {
      return null;
    }

    const [drama] = await db
      .select({ slug: dramas.slug })
      .from(dramas)
      .where(eq(dramas.id, episode.dramaId));

    if (!drama) {
      return null;
    }

    const [result] = await db
      .select()
      .from(watchHistory)
      .where(
        and(
          eq(watchHistory.userId, userId),
          eq(watchHistory.dramaSlug, drama.slug),
          eq(watchHistory.episodeNumber, episode.number),
        ),
      );

    return result ?? null;
  }

  async getEpisodesProgress(
    userId: string,
    episodeIds: string[],
  ): Promise<Map<string, WatchHistory>> {
    if (episodeIds.length === 0) {
      return new Map();
    }

    const episodesWithDrama = await db
      .select({
        episode: episodes,
        drama: dramas,
      })
      .from(episodes)
      .innerJoin(dramas, eq(episodes.dramaId, dramas.id))
      .where(
        sql`${episodes.id} IN (${sql.join(
          episodeIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
      );

    const episodeMapping = new Map<
      string,
      { dramaSlug: string; episodeNumber: number }
    >();
    for (const item of episodesWithDrama) {
      episodeMapping.set(item.episode.id, {
        dramaSlug: item.drama.slug,
        episodeNumber: item.episode.number,
      });
    }

    const conditions = Array.from(episodeMapping.entries()).map(
      ([episodeId, mapping]) =>
        and(
          eq(watchHistory.userId, userId),
          eq(watchHistory.dramaSlug, mapping.dramaSlug),
          eq(watchHistory.episodeNumber, mapping.episodeNumber),
        ),
    );

    const historyResults = await db
      .select()
      .from(watchHistory)
      .where(conditions.length > 0 ? or(...conditions) : sql`1=0`);

    const episodeProgressMap = new Map<string, WatchHistory>();
    for (const item of historyResults) {
      for (const [episodeId, mapping] of episodeMapping.entries()) {
        if (
          mapping.dramaSlug === item.dramaSlug &&
          mapping.episodeNumber === item.episodeNumber
        ) {
          episodeProgressMap.set(episodeId, item);
          break;
        }
      }
    }

    return episodeProgressMap;
  }

  async markCompleted(
    userId: string,
    episodeId: string,
  ): Promise<WatchHistoryWithEpisode | null> {
    const [episode] = await db
      .select({ duration: episodes.duration })
      .from(episodes)
      .where(eq(episodes.id, episodeId));

    if (!episode) {
      return null;
    }

    return this.recordProgress(userId, episodeId, episode.duration ?? 0, true);
  }

  async deleteHistoryEntry(
    userId: string,
    historyId: string,
  ): Promise<boolean> {
    const [deleted] = await db
      .delete(watchHistory)
      .where(
        and(eq(watchHistory.id, historyId), eq(watchHistory.userId, userId)),
      )
      .returning();

    return !!deleted;
  }

  async clearHistory(userId: string): Promise<number> {
    const result = await db
      .delete(watchHistory)
      .where(eq(watchHistory.userId, userId))
      .returning();

    return result.length;
  }
}

export const historyService = new HistoryService();
