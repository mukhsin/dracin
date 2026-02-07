import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { watchlist, dramas } from "../db/schema.js";
import type { WatchlistItem, Drama } from "@repo/shared/types";

// ============================================
// Types for Service Responses
// ============================================

export interface WatchlistItemWithDrama extends WatchlistItem {
  drama: Drama;
}

export interface WatchlistListResult {
  items: WatchlistItemWithDrama[];
  total: number;
}

// ============================================
// Watchlist Service
// ============================================

export class WatchlistService {
  /**
   * Get user's watchlist with drama details
   */
  async getUserWatchlist(userId: string): Promise<WatchlistListResult> {
    const results = await db
      .select({
        watchlist: watchlist,
        drama: dramas,
      })
      .from(watchlist)
      .innerJoin(dramas, eq(watchlist.dramaId, dramas.id))
      .where(eq(watchlist.userId, userId))
      .orderBy(desc(watchlist.addedAt));

    const items = results.map((row) => ({
      ...row.watchlist,
      drama: row.drama,
    }));

    return {
      items,
      total: items.length,
    };
  }

  /**
   * Check if a drama is in user's watchlist
   */
  async isInWatchlist(userId: string, dramaId: string): Promise<boolean> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(watchlist)
      .where(
        and(
          eq(watchlist.userId, userId),
          eq(watchlist.dramaId, dramaId)
        )
      );

    return (result?.count ?? 0) > 0;
  }

  /**
   * Add a drama to user's watchlist
   * Returns the created watchlist item or null if already exists
   */
  async addToWatchlist(
    userId: string,
    dramaId: string
  ): Promise<WatchlistItemWithDrama | null> {
    // Check if already in watchlist
    const exists = await this.isInWatchlist(userId, dramaId);
    if (exists) {
      return null;
    }

    // Insert new watchlist item
    const [newItem] = await db
      .insert(watchlist)
      .values({
        userId,
        dramaId,
      })
      .returning();

    // Get drama details
    const [drama] = await db
      .select()
      .from(dramas)
      .where(eq(dramas.id, dramaId));

    if (!drama) {
      return null;
    }

    return {
      ...newItem,
      drama,
    };
  }

  /**
   * Remove a drama from user's watchlist
   * Returns true if removed, false if not found
   */
  async removeFromWatchlist(
    userId: string,
    dramaId: string
  ): Promise<boolean> {
    const [deleted] = await db
      .delete(watchlist)
      .where(
        and(
          eq(watchlist.userId, userId),
          eq(watchlist.dramaId, dramaId)
        )
      )
      .returning();

    return !!deleted;
  }

  /**
   * Get watchlist item by ID (for verification)
   */
  async getById(
    id: string,
    userId: string
  ): Promise<WatchlistItemWithDrama | null> {
    const [result] = await db
      .select({
        watchlist: watchlist,
        drama: dramas,
      })
      .from(watchlist)
      .innerJoin(dramas, eq(watchlist.dramaId, dramas.id))
      .where(and(eq(watchlist.id, id), eq(watchlist.userId, userId)));

    if (!result) {
      return null;
    }

    return {
      ...result.watchlist,
      drama: result.drama,
    };
  }
}

// Export singleton instance
export const watchlistService = new WatchlistService();
