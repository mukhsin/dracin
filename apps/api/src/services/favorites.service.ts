import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { favorites, dramas } from "../db/schema.js";
import type { Favorite, Drama } from "@repo/shared/types";

// ============================================
// Types for Service Responses
// ============================================

export interface FavoriteWithDrama extends Favorite {
  drama: Drama;
}

export interface FavoriteListResult {
  items: FavoriteWithDrama[];
  total: number;
}

// ============================================
// Favorites Service
// ============================================

export class FavoritesService {
  /**
   * Get user's favorites with drama details
   */
  async getUserFavorites(userId: string): Promise<FavoriteListResult> {
    const results = await db
      .select({
        favorite: favorites,
        drama: dramas,
      })
      .from(favorites)
      .innerJoin(dramas, eq(favorites.dramaId, dramas.id))
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.addedAt));

    const items = results.map((row) => ({
      ...row.favorite,
      drama: row.drama,
    }));

    return {
      items,
      total: items.length,
    };
  }

  /**
   * Check if a drama is in user's favorites
   */
  async isInFavorites(userId: string, dramaId: string): Promise<boolean> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.dramaId, dramaId)));

    return (result?.count ?? 0) > 0;
  }

  /**
   * Add a drama to user's favorites
   * Returns created favorite item or null if already exists
   */
  async addToFavorites(
    userId: string,
    dramaId: string,
  ): Promise<FavoriteWithDrama | null> {
    // Check if already in favorites
    const exists = await this.isInFavorites(userId, dramaId);
    if (exists) {
      return null;
    }

    // Insert new favorite item
    const [newItem] = await db
      .insert(favorites)
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
   * Remove a drama from user's favorites
   * Returns true if removed, false if not found
   */
  async removeFromFavorites(userId: string, dramaId: string): Promise<boolean> {
    const [deleted] = await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.dramaId, dramaId)))
      .returning();

    return !!deleted;
  }

  /**
   * Get favorite item by ID (for verification)
   */
  async getById(id: string, userId: string): Promise<FavoriteWithDrama | null> {
    const [result] = await db
      .select({
        favorite: favorites,
        drama: dramas,
      })
      .from(favorites)
      .innerJoin(dramas, eq(favorites.dramaId, dramas.id))
      .where(and(eq(favorites.id, id), eq(favorites.userId, userId)));

    if (!result) {
      return null;
    }

    return {
      ...result.favorite,
      drama: result.drama,
    };
  }
}

// Export singleton instance
export const favoritesService = new FavoritesService();
