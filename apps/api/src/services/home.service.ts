import { db } from "../db/index.js";
import { drama_lists, dramas } from "../db/schema.js";
import { eq, asc, desc } from "drizzle-orm";
import type { Drama } from "@repo/shared/types";

export interface HomeResponse {
  items: Omit<Drama, "bookId">[];
}

function sanitizeDrama(drama: Drama) {
  const { bookId: _b, ...rest } = drama;
  return rest;
}

// Helper function to build proxied poster URL
export function buildPosterUrl(slug: string): string {
  return `/api/dramas/${slug}/poster.jpg`;
}


export async function getFeatured(): Promise<HomeResponse> {
  const results = await db
    .select({
      id: dramas.id,
      bookId: dramas.bookId,
      title: dramas.title,
      slug: dramas.slug,
      description: dramas.description,
      posterUrl: dramas.posterUrl,
      status: dramas.status,
      language: dramas.language,
      playCount: dramas.playCount,
      sourceEndpoint: dramas.sourceEndpoint,
      releaseYear: dramas.releaseYear,
      country: dramas.country,
      rating: dramas.rating,
      totalEpisodes: dramas.totalEpisodes,
      genres: dramas.genres,
      metadata: dramas.metadata,
      createdAt: dramas.createdAt,
      updatedAt: dramas.updatedAt,
    })
    .from(drama_lists)
    .where(eq(drama_lists.type, 'featured'))
    .innerJoin(dramas, eq(drama_lists.bookId, dramas.bookId))
    .orderBy(asc(drama_lists.position))
    .limit(12);

  return {
    items: results.map(sanitizeDrama),
  };
}

export async function getLatest(): Promise<HomeResponse> {
  const results = await db
    .select({
      id: dramas.id,
      bookId: dramas.bookId,
      title: dramas.title,
      slug: dramas.slug,
      description: dramas.description,
      posterUrl: dramas.posterUrl,
      status: dramas.status,
      language: dramas.language,
      playCount: dramas.playCount,
      sourceEndpoint: dramas.sourceEndpoint,
      releaseYear: dramas.releaseYear,
      country: dramas.country,
      rating: dramas.rating,
      totalEpisodes: dramas.totalEpisodes,
      genres: dramas.genres,
      metadata: dramas.metadata,
      createdAt: dramas.createdAt,
      updatedAt: dramas.updatedAt,
    })
    .from(drama_lists)
    .where(eq(drama_lists.type, 'latest'))
    .innerJoin(dramas, eq(drama_lists.bookId, dramas.bookId))
    .orderBy(asc(drama_lists.position))
    .limit(12);

  return {
    items: results.map(sanitizeDrama),
  };
}

export async function getPopular(): Promise<HomeResponse> {
  const results = await db
    .select()
    .from(dramas)
    .orderBy(desc(dramas.playCount))
    .limit(12);

  return {
    items: results.map(sanitizeDrama),
  };
}

export async function getRank1(): Promise<HomeResponse> {
  const results = await db
    .select({
      id: dramas.id,
      bookId: dramas.bookId,
      title: dramas.title,
      slug: dramas.slug,
      description: dramas.description,
      posterUrl: dramas.posterUrl,
      status: dramas.status,
      language: dramas.language,
      playCount: dramas.playCount,
      sourceEndpoint: dramas.sourceEndpoint,
      releaseYear: dramas.releaseYear,
      country: dramas.country,
      rating: dramas.rating,
      totalEpisodes: dramas.totalEpisodes,
      genres: dramas.genres,
      metadata: dramas.metadata,
      createdAt: dramas.createdAt,
      updatedAt: dramas.updatedAt,
    })
    .from(drama_lists)
    .where(eq(drama_lists.type, 'rank_1'))
    .innerJoin(dramas, eq(drama_lists.bookId, dramas.bookId))
    .orderBy(asc(drama_lists.position))
    .limit(12);

  return {
    items: results.map(sanitizeDrama),
  };
}
