import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "bun:test";
import { createApp } from "../app.js";
import { db } from "../db/index.js";
import { dramas, episodes, watchHistory, users } from "../db/schema.js";
import { eq } from "drizzle-orm";

const app = createApp();

const TEST_USER = {
  email: `history-test-${Date.now()}@example.com`,
  password: "TestPassword123!",
  name: "History Test User",
};

const TEST_USER_2 = {
  email: `history-test-2-${Date.now()}@example.com`,
  password: "TestPassword123!",
  name: "History Test User 2",
};

let testDramaId: string;
let testEpisodeId: string;
let testEpisodeId2: string;
let sessionCookie: string;
let sessionCookie2: string;
let testUserId: string;
let testUserId2: string;

async function registerAndLoginUser(
  user: typeof TEST_USER,
): Promise<{ cookie: string; userId: string }> {
  const registerRes = await app.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });

  expect(registerRes.status).toBe(200);
  const registerData = await registerRes.json();
  const userId = registerData.user.id;

  const loginRes = await app.request("/api/auth/sign-in/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
    }),
  });

  expect(loginRes.status).toBe(200);
  const cookie = loginRes.headers.get("set-cookie");
  expect(cookie).toBeDefined();

  return { cookie: cookie!, userId };
}

async function createTestDrama(title: string, slug: string) {
  const [drama] = await db
    .insert(dramas)
    .values({
      title,
      slug,
      description: `Test description for ${title}`,
      posterUrl: "https://example.com/poster.jpg",
      status: "ongoing",
      metadata: {
        releaseYear: 2024,
        country: "Test",
        genre: ["Drama"],
        totalEpisodes: 16,
      },
    })
    .returning();
  return drama;
}

async function createTestEpisode(
  dramaId: string,
  number: number,
  duration = 3600,
) {
  const [episode] = await db
    .insert(episodes)
    .values({
      dramaId,
      number,
      title: `Episode ${number}`,
      description: `Test episode ${number}`,
      duration,
      videoUrls: { "720p": "https://example.com/video.mp4" },
    })
    .returning();
  return episode;
}

describe("History API Integration Tests", () => {
  beforeAll(async () => {
    const user1 = await registerAndLoginUser(TEST_USER);
    sessionCookie = user1.cookie;
    testUserId = user1.userId;

    const user2 = await registerAndLoginUser(TEST_USER_2);
    sessionCookie2 = user2.cookie;
    testUserId2 = user2.userId;

    const drama = await createTestDrama(
      `History Test Drama ${Date.now()}`,
      `history-test-${Date.now()}`,
    );
    testDramaId = drama.id;

    const episode1 = await createTestEpisode(testDramaId, 1, 3600);
    testEpisodeId = episode1.id;

    const episode2 = await createTestEpisode(testDramaId, 2, 3600);
    testEpisodeId2 = episode2.id;
  });

  afterAll(async () => {
    await db.delete(watchHistory).where(eq(watchHistory.userId, testUserId));
    await db.delete(watchHistory).where(eq(watchHistory.userId, testUserId2));
    await db.delete(episodes).where(eq(episodes.dramaId, testDramaId));
    await db.delete(dramas).where(eq(dramas.id, testDramaId));
    await db.delete(users).where(eq(users.id, testUserId));
    await db.delete(users).where(eq(users.id, testUserId2));
  });

  beforeEach(async () => {
    await db.delete(watchHistory).where(eq(watchHistory.userId, testUserId));
    await db.delete(watchHistory).where(eq(watchHistory.userId, testUserId2));
  });

  describe("GET /api/history - Get Watch History", () => {
    it("should return empty history for new user", async () => {
      const res = await app.request("/api/history", {
        headers: { Cookie: sessionCookie },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.items).toEqual([]);
      expect(data.data.total).toBe(0);
    });

    it("should return history items with episode and drama details", async () => {
      await app.request("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie },
        body: JSON.stringify({ episodeId: testEpisodeId, progress: 120 }),
      });

      const res = await app.request("/api/history", {
        headers: { Cookie: sessionCookie },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.items).toHaveLength(1);
      expect(data.data.items[0].episodeId).toBe(testEpisodeId);
      expect(data.data.items[0].progress).toBe(120);
      expect(data.data.items[0].episode).toBeDefined();
      expect(data.data.items[0].episode.drama).toBeDefined();
    });

    it("should return 401 for unauthenticated requests", async () => {
      const res = await app.request("/api/history");

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("should only return current user's history", async () => {
      await app.request("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie },
        body: JSON.stringify({ episodeId: testEpisodeId, progress: 100 }),
      });

      await app.request("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie2 },
        body: JSON.stringify({ episodeId: testEpisodeId2, progress: 200 }),
      });

      const res1 = await app.request("/api/history", {
        headers: { Cookie: sessionCookie },
      });
      const data1 = await res1.json();
      expect(data1.data.items).toHaveLength(1);
      expect(data1.data.items[0].episodeId).toBe(testEpisodeId);

      const res2 = await app.request("/api/history", {
        headers: { Cookie: sessionCookie2 },
      });
      const data2 = await res2.json();
      expect(data2.data.items).toHaveLength(1);
      expect(data2.data.items[0].episodeId).toBe(testEpisodeId2);
    });

    it("should return items sorted by watchedAt in descending order", async () => {
      await app.request("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie },
        body: JSON.stringify({ episodeId: testEpisodeId, progress: 100 }),
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      await app.request("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie },
        body: JSON.stringify({ episodeId: testEpisodeId2, progress: 200 }),
      });

      const res = await app.request("/api/history", {
        headers: { Cookie: sessionCookie },
      });

      const data = await res.json();
      expect(data.data.items[0].episodeId).toBe(testEpisodeId2);
      expect(data.data.items[1].episodeId).toBe(testEpisodeId);
    });
  });

  describe("GET /api/history/continue - Get Continue Watching List", () => {
    it("should return empty list when no episodes in progress", async () => {
      const res = await app.request("/api/history/continue", {
        headers: { Cookie: sessionCookie },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });

    it("should return episodes with progress but not completed", async () => {
      await app.request("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie },
        body: JSON.stringify({
          episodeId: testEpisodeId,
          progress: 1800,
          completed: false,
        }),
      });

      const res = await app.request("/api/history/continue", {
        headers: { Cookie: sessionCookie },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data).toHaveLength(1);
      expect(data.data[0].episodeId).toBe(testEpisodeId);
      expect(data.data[0].progress).toBe(1800);
      expect(data.data[0].completed).toBe(false);
      expect(data.data[0].progressPercent).toBe(50);
    });

    it("should not include completed episodes", async () => {
      await app.request("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie },
        body: JSON.stringify({
          episodeId: testEpisodeId,
          progress: 3600,
          completed: true,
        }),
      });

      const res = await app.request("/api/history/continue", {
        headers: { Cookie: sessionCookie },
      });

      const data = await res.json();
      expect(data.data).toHaveLength(0);
    });

    it("should return 401 for unauthenticated requests", async () => {
      const res = await app.request("/api/history/continue");

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("should calculate progress percentage correctly", async () => {
      await app.request("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie },
        body: JSON.stringify({
          episodeId: testEpisodeId,
          progress: 900,
          completed: false,
        }),
      });

      const res = await app.request("/api/history/continue", {
        headers: { Cookie: sessionCookie },
      });

      const data = await res.json();
      expect(data.data[0].progressPercent).toBe(25);
    });
  });

  describe("POST /api/history - Record Watch Progress", () => {
    it("should create new history entry", async () => {
      const res = await app.request("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie },
        body: JSON.stringify({ episodeId: testEpisodeId, progress: 300 }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.episodeId).toBe(testEpisodeId);
      expect(data.data.progress).toBe(300);
      expect(data.data.completed).toBe(false);
    });

    it("should update existing history entry", async () => {
      await app.request("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie },
        body: JSON.stringify({ episodeId: testEpisodeId, progress: 100 }),
      });

      const res = await app.request("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie },
        body: JSON.stringify({ episodeId: testEpisodeId, progress: 500 }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.progress).toBe(500);
    });

    it("should mark episode as completed at 90%+ progress", async () => {
      const res = await app.request("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie },
        body: JSON.stringify({
          episodeId: testEpisodeId,
          progress: 3300,
          completed: true,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.completed).toBe(true);
    });

    it("should return 401 for unauthenticated requests", async () => {
      const res = await app.request("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeId: testEpisodeId, progress: 100 }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("should return 400 for invalid episodeId", async () => {
      const res = await app.request("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie },
        body: JSON.stringify({ episodeId: "invalid-uuid", progress: 100 }),
      });

      expect(res.status).toBe(400);
    });

    it("should track progress from 0 to 100%", async () => {
      const progressPoints = [0, 900, 1800, 2700, 3600];

      for (const progress of progressPoints) {
        const res = await app.request("/api/history", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: sessionCookie,
          },
          body: JSON.stringify({ episodeId: testEpisodeId, progress }),
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.data.progress).toBe(progress);
      }
    });

    it("should handle completed flag explicitly", async () => {
      const res = await app.request("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie },
        body: JSON.stringify({
          episodeId: testEpisodeId,
          progress: 100,
          completed: true,
        }),
      });

      const data = await res.json();
      expect(data.data.completed).toBe(true);
    });
  });

  describe("GET /api/history/episodes/:episodeId - Get Episode Progress", () => {
    it("should return progress for watched episode", async () => {
      await app.request("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie },
        body: JSON.stringify({ episodeId: testEpisodeId, progress: 600 }),
      });

      const res = await app.request(`/api/history/episodes/${testEpisodeId}`, {
        headers: { Cookie: sessionCookie },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).not.toBeNull();
      expect(data.data.episodeId).toBe(testEpisodeId);
      expect(data.data.progress).toBe(600);
    });

    it("should return null for unwatched episode", async () => {
      const res = await app.request(`/api/history/episodes/${testEpisodeId}`, {
        headers: { Cookie: sessionCookie },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeNull();
    });

    it("should return 401 for unauthenticated requests", async () => {
      const res = await app.request(`/api/history/episodes/${testEpisodeId}`);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("should only return current user's progress", async () => {
      await app.request("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie },
        body: JSON.stringify({ episodeId: testEpisodeId, progress: 100 }),
      });

      const res = await app.request(`/api/history/episodes/${testEpisodeId}`, {
        headers: { Cookie: sessionCookie2 },
      });

      const data = await res.json();
      expect(data.data).toBeNull();
    });
  });

  describe("DELETE /api/history/:historyId - Delete History Entry", () => {
    it("should delete history entry successfully", async () => {
      const createRes = await app.request("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie },
        body: JSON.stringify({ episodeId: testEpisodeId, progress: 100 }),
      });
      const createData = await createRes.json();
      const historyId = createData.data.id;

      const res = await app.request(`/api/history/${historyId}`, {
        method: "DELETE",
        headers: { Cookie: sessionCookie },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe("History entry deleted");

      const checkRes = await app.request("/api/history", {
        headers: { Cookie: sessionCookie },
      });
      const checkData = await checkRes.json();
      expect(checkData.data.items).toHaveLength(0);
    });

    it("should return 404 for non-existent history entry", async () => {
      const res = await app.request(
        "/api/history/00000000-0000-0000-0000-000000000000",
        {
          method: "DELETE",
          headers: { Cookie: sessionCookie },
        },
      );

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.message).toBe("History entry not found");
    });

    it("should return 401 for unauthenticated requests", async () => {
      const res = await app.request("/api/history/some-id", {
        method: "DELETE",
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("should not delete other user's history entry", async () => {
      const createRes = await app.request("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie },
        body: JSON.stringify({ episodeId: testEpisodeId, progress: 100 }),
      });
      const createData = await createRes.json();
      const historyId = createData.data.id;

      const res = await app.request(`/api/history/${historyId}`, {
        method: "DELETE",
        headers: { Cookie: sessionCookie2 },
      });

      expect(res.status).toBe(404);

      const checkRes = await app.request("/api/history", {
        headers: { Cookie: sessionCookie },
      });
      const checkData = await checkRes.json();
      expect(checkData.data.items).toHaveLength(1);
    });
  });

  describe("DELETE /api/history - Clear All History", () => {
    it("should clear all history entries", async () => {
      await app.request("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie },
        body: JSON.stringify({ episodeId: testEpisodeId, progress: 100 }),
      });

      await app.request("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie },
        body: JSON.stringify({ episodeId: testEpisodeId2, progress: 200 }),
      });

      const res = await app.request("/api/history", {
        method: "DELETE",
        headers: { Cookie: sessionCookie },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.deletedCount).toBe(2);
      expect(data.message).toBe("History cleared");

      const checkRes = await app.request("/api/history", {
        headers: { Cookie: sessionCookie },
      });
      const checkData = await checkRes.json();
      expect(checkData.data.items).toHaveLength(0);
    });

    it("should return 0 deleted count when no history exists", async () => {
      const res = await app.request("/api/history", {
        method: "DELETE",
        headers: { Cookie: sessionCookie },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.deletedCount).toBe(0);
    });

    it("should return 401 for unauthenticated requests", async () => {
      const res = await app.request("/api/history", {
        method: "DELETE",
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("should only clear current user's history", async () => {
      await app.request("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie },
        body: JSON.stringify({ episodeId: testEpisodeId, progress: 100 }),
      });

      await app.request("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie2 },
        body: JSON.stringify({ episodeId: testEpisodeId2, progress: 200 }),
      });

      await app.request("/api/history", {
        method: "DELETE",
        headers: { Cookie: sessionCookie },
      });

      const res1 = await app.request("/api/history", {
        headers: { Cookie: sessionCookie },
      });
      const data1 = await res1.json();
      expect(data1.data.items).toHaveLength(0);

      const res2 = await app.request("/api/history", {
        headers: { Cookie: sessionCookie2 },
      });
      const data2 = await res2.json();
      expect(data2.data.items).toHaveLength(1);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle rapid progress updates", async () => {
      for (let i = 0; i < 5; i++) {
        await app.request("/api/history", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: sessionCookie,
          },
          body: JSON.stringify({ episodeId: testEpisodeId, progress: i * 100 }),
        });
      }

      const res = await app.request("/api/history", {
        headers: { Cookie: sessionCookie },
      });

      const data = await res.json();
      expect(data.data.items).toHaveLength(1);
      expect(data.data.items[0].progress).toBe(400);
    });

    it("should handle progress at episode boundaries", async () => {
      const res = await app.request("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie },
        body: JSON.stringify({ episodeId: testEpisodeId, progress: 0 }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.progress).toBe(0);
    });

    it("should handle progress exceeding episode duration", async () => {
      const res = await app.request("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie },
        body: JSON.stringify({ episodeId: testEpisodeId, progress: 5000 }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.progress).toBe(5000);
    });
  });
});
