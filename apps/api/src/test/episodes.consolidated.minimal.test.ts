import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { sql, eq } from "drizzle-orm";
import * as schema from "../db/schema.js";

let testDb: ReturnType<typeof drizzle>;

describe("Episodes Consolidated Test Infrastructure", () => {
  beforeAll(async () => {
    const client = createClient({
      url: "file::memory:",
    });
    testDb = drizzle(client, { schema });

    await testDb.run(sql`
      CREATE TABLE IF NOT EXISTS "dramas" (
        "id" text PRIMARY KEY NOT NULL,
        "book_id" text,
        "title" text NOT NULL,
        "slug" text NOT NULL,
        "description" text,
        "poster_url" text,
        "status" text DEFAULT 'upcoming' NOT NULL,
        "language" text,
        "play_count" text,
        "source_endpoint" text,
        "release_year" integer,
        "country" text,
        "rating" real,
        "total_episodes" integer,
        "genres" text,
        "metadata" text,
        "created_at" integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
        "updated_at" integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
      );
    `);

    await testDb.run(sql`
      CREATE TABLE IF NOT EXISTS "episodes" (
        "id" text PRIMARY KEY NOT NULL,
        "drama_id" text NOT NULL,
        "book_id" text,
        "number" integer NOT NULL,
        "title" text,
        "description" text,
        "duration" integer,
        "video_urls" text,
        "source_url" text,
        "created_at" integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
      );
    `);

    await testDb.run(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS "dramas_slug_idx" ON "dramas" ("slug");`,
    );
    await testDb.run(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS "episodes_drama_number_idx" ON "episodes" ("drama_id","number");`,
    );
    await testDb.run(
      sql`CREATE INDEX IF NOT EXISTS "episodes_drama_idx" ON "episodes" ("drama_id");`,
    );
  });

  afterAll(async () => {
    if (testDb) {
      await testDb.run(sql`DROP TABLE IF EXISTS "episodes";`);
      await testDb.run(sql`DROP TABLE IF EXISTS "dramas";`);
    }
  });

  async function seedTestDrama(episodeCount = 3) {
    const [drama] = await testDb
      .insert(schema.dramas)
      .values({
        title: `Test Drama ${Date.now()}`,
        slug: `test-drama-${Date.now()}`,
        description: "A test drama for testing",
        bookId: `test-book-${Date.now()}`,
        status: "ongoing",
        language: "korean",
        totalEpisodes: episodeCount,
        releaseYear: 2024,
        country: "South Korea",
        rating: 8.5,
        genres: JSON.stringify(["romance", "drama"]),
      })
      .returning();

    const episodes = [];
    for (let i = 1; i <= episodeCount; i++) {
      const [episode] = await testDb
        .insert(schema.episodes)
        .values({
          dramaId: drama.id,
          bookId: drama.bookId,
          number: i,
          title: `Episode ${i}`,
          description: `Test episode ${i}`,
          duration: 3600,
          videoUrls: JSON.stringify({
            "240p": "https://example.com/video-240p.mp4",
            "480p": "https://example.com/video-480p.mp4",
            "720p": "https://example.com/video-720p.mp4",
            "1080p": "https://example.com/video-1080p.mp4",
          }),
          sourceUrl: "https://example.com/source.mp4",
        })
        .returning();
      episodes.push(episode);
    }

    return { drama, episodes };
  }

  it("should have test infrastructure set up", async () => {
    expect(testDb).toBeDefined();
  });

  it("should seed test drama with episodes", async () => {
    const { drama, episodes } = await seedTestDrama(3);

    expect(drama).toBeDefined();
    expect(drama.title).toContain("Test Drama");
    expect(drama.slug).toContain("test-drama");
    expect(episodes).toHaveLength(3);
    expect(episodes[0].number).toBe(1);
    expect(episodes[1].number).toBe(2);
    expect(episodes[2].number).toBe(3);
  });

  it("should query episodes by drama", async () => {
    const { drama, episodes } = await seedTestDrama(3);

    const dramaEpisodes = await testDb
      .select()
      .from(schema.episodes)
      .where(eq(schema.episodes.dramaId, drama.id))
      .orderBy(schema.episodes.number);

    expect(dramaEpisodes).toHaveLength(3);
    expect(dramaEpisodes[0].number).toBe(1);
    expect(dramaEpisodes[1].number).toBe(2);
    expect(dramaEpisodes[2].number).toBe(3);
  });

  it("should query drama with episodes using join", async () => {
    const { drama, episodes } = await seedTestDrama(2);

    const result = await testDb
      .select({
        episode: schema.episodes,
        dramaId: schema.dramas.id,
        dramaTitle: schema.dramas.title,
        dramaSlug: schema.dramas.slug,
      })
      .from(schema.episodes)
      .innerJoin(schema.dramas, eq(schema.episodes.dramaId, schema.dramas.id))
      .where(eq(schema.episodes.id, episodes[0].id));

    expect(result).toHaveLength(1);
    expect(result[0].episode.id).toBe(episodes[0].id);
    expect(result[0].dramaId).toBe(drama.id);
    expect(result[0].dramaTitle).toBe(drama.title);
    expect(result[0].dramaSlug).toBe(drama.slug);
  });

  it("should find previous and next episodes", async () => {
    const { drama, episodes } = await seedTestDrama(3);
    const middleEpisode = episodes[1];

    const [prevEpisode] = await testDb
      .select({
        id: schema.episodes.id,
        number: schema.episodes.number,
        title: schema.episodes.title,
      })
      .from(schema.episodes)
      .where(eq(schema.episodes.number, middleEpisode.number - 1))
      .limit(1);

    const [nextEpisode] = await testDb
      .select({
        id: schema.episodes.id,
        number: schema.episodes.number,
        title: schema.episodes.title,
      })
      .from(schema.episodes)
      .where(eq(schema.episodes.number, middleEpisode.number + 1))
      .limit(1);

    expect(prevEpisode).toBeDefined();
    expect(prevEpisode.id).toBe(episodes[0].id);
    expect(prevEpisode.number).toBe(1);

    expect(nextEpisode).toBeDefined();
    expect(nextEpisode.id).toBe(episodes[2].id);
    expect(nextEpisode.number).toBe(3);
  });
});
