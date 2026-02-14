import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { createApp } from "../app.js";
import { db } from "../db/index.js";
import { dramas, episodes } from "../db/schema.js";
import { eq } from "drizzle-orm";

const app = createApp();

describe("Episodes Consolidated Endpoint", () => {
  // Track test data for cleanup
  const testDramas: string[] = [];
  const testEpisodes: string[] = [];

  // Helper to create test drama with episodes
  async function seedTestDrama(episodeCount = 3) {
    // Insert test drama
    const [drama] = await db
      .insert(dramas)
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
        genres: ["romance", "drama"],
      })
      .returning();

    testDramas.push(drama.id);

    // Insert test episodes
    const eps = [];
    for (let i = 1; i <= episodeCount; i++) {
      const [episode] = await db
        .insert(episodes)
        .values({
          dramaId: drama.id,
          bookId: drama.bookId,
          number: i,
          title: `Episode ${i}`,
          description: `Test episode ${i}`,
          duration: 3600,
          videoUrls: {
            "240p": "https://example.com/video-240p.mp4",
            "480p": "https://example.com/video-480p.mp4",
            "720p": "https://example.com/video-720p.mp4",
            "1080p": "https://example.com/video-1080p.mp4",
          },
          sourceUrl: "https://example.com/source.mp4",
        })
        .returning();
      eps.push(episode);
      testEpisodes.push(episode.id);
    }

    return { drama, episodes: eps };
  }

  afterAll(async () => {
    // Clean up test episodes
    for (const episodeId of testEpisodes) {
      await db.delete(episodes).where(eq(episodes.id, episodeId));
    }
    // Clean up test dramas
    for (const dramaId of testDramas) {
      await db.delete(dramas).where(eq(dramas.id, dramaId));
    }
  });

  describe("GET /api/episodes/:id", () => {
    it("should return episode with drama info", async () => {
      const { drama, episodes: eps } = await seedTestDrama(3);
      const episode = eps[1]; // Episode 2

      const res = await app.request(`/api/episodes/${episode.id}`);
      expect(res.status).toBe(200);

      const result = await res.json();
      expect(result.success).toBe(true);
      expect(result.data.id).toBe(episode.id);
      expect(result.data.title).toBe(episode.title);
      expect(result.data.drama).toBeDefined();
      expect(result.data.drama.id).toBe(drama.id);
      expect(result.data.drama.title).toBe(drama.title);
      expect(result.data.drama.slug).toBe(drama.slug);
    });

    it("should return navigation with prevEpisode and nextEpisode", async () => {
      const { episodes: eps } = await seedTestDrama(3);
      const episode = eps[1]; // Episode 2 (has both prev and next)

      const res = await app.request(`/api/episodes/${episode.id}`);
      expect(res.status).toBe(200);

      const result = await res.json();
      expect(result.success).toBe(true);
      expect(result.data.navigation).toBeDefined();
      expect(result.data.navigation.prevEpisode).toBeDefined();
      expect(result.data.navigation.nextEpisode).toBeDefined();
      expect(result.data.navigation.prevEpisode.id).toBe(eps[0].id);
      expect(result.data.navigation.nextEpisode.id).toBe(eps[2].id);
    });

    it("should return null prevEpisode for first episode", async () => {
      const { episodes: eps } = await seedTestDrama(3);
      const firstEpisode = eps[0]; // Episode 1

      const res = await app.request(`/api/episodes/${firstEpisode.id}`);
      expect(res.status).toBe(200);

      const result = await res.json();
      expect(result.success).toBe(true);
      expect(result.data.navigation.prevEpisode).toBeNull();
      expect(result.data.navigation.nextEpisode).toBeDefined();
      expect(result.data.navigation.nextEpisode.id).toBe(eps[1].id);
    });

    it("should return null nextEpisode for last episode", async () => {
      const { episodes: eps } = await seedTestDrama(3);
      const lastEpisode = eps[2]; // Episode 3

      const res = await app.request(`/api/episodes/${lastEpisode.id}`);
      expect(res.status).toBe(200);

      const result = await res.json();
      expect(result.success).toBe(true);
      expect(result.data.navigation.nextEpisode).toBeNull();
      expect(result.data.navigation.prevEpisode).toBeDefined();
      expect(result.data.navigation.prevEpisode.id).toBe(eps[1].id);
    });

    it("should return pre-built video urls", async () => {
      const { episodes: eps } = await seedTestDrama(1);
      const episode = eps[0];

      const res = await app.request(`/api/episodes/${episode.id}`);
      expect(res.status).toBe(200);

      const result = await res.json();
      expect(result.success).toBe(true);
      expect(result.data.video).toBeDefined();
      expect(result.data.video.urls).toBeDefined();
      expect(Object.keys(result.data.video.urls).length).toBeGreaterThan(0);
      // Check that URLs are pre-built and contain the expected pattern
      const firstQuality = Object.keys(result.data.video.urls)[0];
      expect(result.data.video.urls[firstQuality]).toContain("/api/video/");
      expect(result.data.video.urls[firstQuality]).toContain(".mp4");
    });

    it("should return 404 for non-existent episode", async () => {
      const res = await app.request(
        "/api/episodes/00000000-0000-0000-0000-000000000000",
      );
      expect(res.status).toBe(404);

      const result = await res.json();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should include posterUrl in drama object", async () => {
      const { drama, episodes: eps } = await seedTestDrama(1);
      const episode = eps[0];

      const res = await app.request(`/api/episodes/${episode.id}`);
      expect(res.status).toBe(200);

      const result = await res.json();
      expect(result.data.drama.posterUrl).toBeDefined();
    });

    it("should return consistent response format", async () => {
      const { episodes: eps } = await seedTestDrama(1);
      const episode = eps[0];

      const res = await app.request(`/api/episodes/${episode.id}`);
      expect(res.status).toBe(200);

      const result = await res.json();
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("data");
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("id");
      expect(result.data).toHaveProperty("dramaId");
      expect(result.data).toHaveProperty("number");
      expect(result.data).toHaveProperty("title");
      expect(result.data).toHaveProperty("drama");
      expect(result.data).toHaveProperty("navigation");
      expect(result.data).toHaveProperty("video");
    });
  });
});
