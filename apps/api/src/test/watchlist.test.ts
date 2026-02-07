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
import { dramas, episodes, watchlist, users } from "../db/schema.js";
import { eq } from "drizzle-orm";

const app = createApp();

// ============================================
// Test Fixtures
// ============================================

const TEST_USER = {
  email: `watchlist-test-${Date.now()}@example.com`,
  password: "TestPassword123!",
  name: "Watchlist Test User",
};

const TEST_USER_2 = {
  email: `watchlist-test-2-${Date.now()}@example.com`,
  password: "TestPassword123!",
  name: "Watchlist Test User 2",
};

let testDramaId: string;
let testDramaId2: string;
let testEpisodeId: string;
let sessionCookie: string;
let sessionCookie2: string;
let testUserId: string;
let testUserId2: string;

// ============================================
// Helper Functions
// ============================================

async function registerAndLoginUser(
  user: typeof TEST_USER,
): Promise<{ cookie: string; userId: string }> {
  // Register user
  const registerRes = await app.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });

  expect(registerRes.status).toBe(200);
  const registerData = await registerRes.json();
  const userId = registerData.user.id;

  // Login to get session cookie
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
        country: "Test Country",
        genre: ["Drama", "Romance"],
        rating: 8.5,
        totalEpisodes: 16,
      },
    })
    .returning();

  return drama;
}

async function createTestEpisode(dramaId: string, number: number) {
  const [episode] = await db
    .insert(episodes)
    .values({
      dramaId,
      number,
      title: `Episode ${number}`,
      description: `Test episode ${number}`,
      duration: 3600, // 1 hour
      videoUrls: {
        "720p": "https://example.com/video-720p.mp4",
        "1080p": "https://example.com/video-1080p.mp4",
      },
    })
    .returning();

  return episode;
}

// ============================================
// Test Suite
// ============================================

describe("Watchlist API Integration Tests", () => {
  beforeAll(async () => {
    // Register and login test users
    const user1 = await registerAndLoginUser(TEST_USER);
    sessionCookie = user1.cookie;
    testUserId = user1.userId;

    const user2 = await registerAndLoginUser(TEST_USER_2);
    sessionCookie2 = user2.cookie;
    testUserId2 = user2.userId;

    // Create test dramas
    const drama1 = await createTestDrama(
      `Test Drama ${Date.now()}`,
      `test-drama-${Date.now()}`,
    );
    testDramaId = drama1.id;

    const drama2 = await createTestDrama(
      `Test Drama 2 ${Date.now()}`,
      `test-drama-2-${Date.now()}`,
    );
    testDramaId2 = drama2.id;

    const episode = await createTestEpisode(testDramaId, 1);
    testEpisodeId = episode.id;
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(watchlist).where(eq(watchlist.userId, testUserId));
    await db.delete(watchlist).where(eq(watchlist.userId, testUserId2));
    await db.delete(episodes).where(eq(episodes.id, testEpisodeId));
    await db.delete(dramas).where(eq(dramas.id, testDramaId));
    await db.delete(dramas).where(eq(dramas.id, testDramaId2));
    await db.delete(users).where(eq(users.id, testUserId));
    await db.delete(users).where(eq(users.id, testUserId2));
  });

  beforeEach(async () => {
    // Clear watchlist before each test
    await db.delete(watchlist).where(eq(watchlist.userId, testUserId));
    await db.delete(watchlist).where(eq(watchlist.userId, testUserId2));
  });

  // ============================================
  // GET /api/watchlist - List User's Watchlist
  // ============================================
  describe("GET /api/watchlist - List User's Watchlist", () => {
    it("should return empty watchlist for new user", async () => {
      const res = await app.request("/api/watchlist", {
        headers: { Cookie: sessionCookie },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.items).toEqual([]);
      expect(data.data.total).toBe(0);
    });

    it("should return watchlist items with drama details", async () => {
      // Add drama to watchlist first
      await app.request("/api/watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({ dramaId: testDramaId }),
      });

      const res = await app.request("/api/watchlist", {
        headers: { Cookie: sessionCookie },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.items).toHaveLength(1);
      expect(data.data.total).toBe(1);
      expect(data.data.items[0].dramaId).toBe(testDramaId);
      expect(data.data.items[0].drama).toBeDefined();
      expect(data.data.items[0].drama.title).toBeDefined();
      expect(data.data.items[0].drama.slug).toBeDefined();
    });

    it("should return 401 for unauthenticated requests", async () => {
      const res = await app.request("/api/watchlist");

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("should only return current user's watchlist items", async () => {
      // Add drama to user 1's watchlist
      await app.request("/api/watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({ dramaId: testDramaId }),
      });

      // Add drama 2 to user 2's watchlist
      await app.request("/api/watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie2,
        },
        body: JSON.stringify({ dramaId: testDramaId2 }),
      });

      // User 1 should only see their item
      const res1 = await app.request("/api/watchlist", {
        headers: { Cookie: sessionCookie },
      });

      const data1 = await res1.json();
      expect(data1.data.items).toHaveLength(1);
      expect(data1.data.items[0].dramaId).toBe(testDramaId);

      // User 2 should only see their item
      const res2 = await app.request("/api/watchlist", {
        headers: { Cookie: sessionCookie2 },
      });

      const data2 = await res2.json();
      expect(data2.data.items).toHaveLength(1);
      expect(data2.data.items[0].dramaId).toBe(testDramaId2);
    });

    it("should return items sorted by addedAt in descending order", async () => {
      // Add first drama
      await app.request("/api/watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({ dramaId: testDramaId }),
      });

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Add second drama
      await app.request("/api/watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({ dramaId: testDramaId2 }),
      });

      const res = await app.request("/api/watchlist", {
        headers: { Cookie: sessionCookie },
      });

      const data = await res.json();
      expect(data.data.items).toHaveLength(2);
      // Most recently added should be first
      expect(data.data.items[0].dramaId).toBe(testDramaId2);
      expect(data.data.items[1].dramaId).toBe(testDramaId);
    });
  });

  // ============================================
  // POST /api/watchlist - Add Drama to Watchlist
  // ============================================
  describe("POST /api/watchlist - Add Drama to Watchlist", () => {
    it("should add drama to watchlist successfully", async () => {
      const res = await app.request("/api/watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({ dramaId: testDramaId }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.dramaId).toBe(testDramaId);
      expect(data.data.userId).toBe(testUserId);
      expect(data.message).toBe("Added to watchlist");
    });

    it("should return 409 when adding duplicate drama", async () => {
      // Add first time
      await app.request("/api/watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({ dramaId: testDramaId }),
      });

      // Try to add again
      const res = await app.request("/api/watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({ dramaId: testDramaId }),
      });

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.message).toBe("Drama is already in watchlist");
    });

    it("should return 401 for unauthenticated requests", async () => {
      const res = await app.request("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dramaId: testDramaId }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("should return 400 for invalid dramaId format", async () => {
      const res = await app.request("/api/watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({ dramaId: "invalid-uuid" }),
      });

      expect(res.status).toBe(400);
    });

    it("should allow different users to add same drama", async () => {
      // User 1 adds drama
      const res1 = await app.request("/api/watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({ dramaId: testDramaId }),
      });

      expect(res1.status).toBe(201);

      // User 2 adds same drama
      const res2 = await app.request("/api/watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie2,
        },
        body: JSON.stringify({ dramaId: testDramaId }),
      });

      expect(res2.status).toBe(201);
    });

    it("should return 400 when dramaId is missing", async () => {
      const res = await app.request("/api/watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });
  });

  // ============================================
  // DELETE /api/watchlist/:dramaId - Remove from Watchlist
  // ============================================
  describe("DELETE /api/watchlist/:dramaId - Remove from Watchlist", () => {
    it("should remove drama from watchlist successfully", async () => {
      // Add to watchlist first
      await app.request("/api/watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({ dramaId: testDramaId }),
      });

      // Remove from watchlist
      const res = await app.request(`/api/watchlist/${testDramaId}`, {
        method: "DELETE",
        headers: { Cookie: sessionCookie },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe("Removed from watchlist");

      // Verify it's removed
      const checkRes = await app.request("/api/watchlist", {
        headers: { Cookie: sessionCookie },
      });
      const checkData = await checkRes.json();
      expect(checkData.data.items).toHaveLength(0);
    });

    it("should return 404 when removing non-existent item", async () => {
      const res = await app.request(`/api/watchlist/${testDramaId}`, {
        method: "DELETE",
        headers: { Cookie: sessionCookie },
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.message).toBe("Drama not found in watchlist");
    });

    it("should return 401 for unauthenticated requests", async () => {
      const res = await app.request(`/api/watchlist/${testDramaId}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("should return 400 for invalid dramaId format", async () => {
      const res = await app.request("/api/watchlist/invalid-uuid", {
        method: "DELETE",
        headers: { Cookie: sessionCookie },
      });

      expect(res.status).toBe(400);
    });

    it("should not remove other user's watchlist item", async () => {
      // User 1 adds drama
      await app.request("/api/watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({ dramaId: testDramaId }),
      });

      // User 2 tries to remove it (should get 404)
      const res = await app.request(`/api/watchlist/${testDramaId}`, {
        method: "DELETE",
        headers: { Cookie: sessionCookie2 },
      });

      expect(res.status).toBe(404);

      // Verify user 1 still has the item
      const checkRes = await app.request("/api/watchlist", {
        headers: { Cookie: sessionCookie },
      });
      const checkData = await checkRes.json();
      expect(checkData.data.items).toHaveLength(1);
    });
  });

  // ============================================
  // GET /api/watchlist/check/:dramaId - Check Watchlist Status
  // ============================================
  describe("GET /api/watchlist/check/:dramaId - Check Watchlist Status", () => {
    it("should return true when drama is in watchlist", async () => {
      // Add to watchlist
      await app.request("/api/watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({ dramaId: testDramaId }),
      });

      const res = await app.request(`/api/watchlist/check/${testDramaId}`, {
        headers: { Cookie: sessionCookie },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.isInWatchlist).toBe(true);
    });

    it("should return false when drama is not in watchlist", async () => {
      const res = await app.request(`/api/watchlist/check/${testDramaId}`, {
        headers: { Cookie: sessionCookie },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.isInWatchlist).toBe(false);
    });

    it("should return 401 for unauthenticated requests", async () => {
      const res = await app.request(`/api/watchlist/check/${testDramaId}`);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("should only check current user's watchlist", async () => {
      // User 1 adds drama
      await app.request("/api/watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({ dramaId: testDramaId }),
      });

      // User 2 checks - should be false
      const res = await app.request(`/api/watchlist/check/${testDramaId}`, {
        headers: { Cookie: sessionCookie2 },
      });

      const data = await res.json();
      expect(data.data.isInWatchlist).toBe(false);
    });
  });

  // ============================================
  // Edge Cases and Error Handling
  // ============================================
  describe("Edge Cases and Error Handling", () => {
    it("should handle rapid add/remove operations", async () => {
      // Add
      await app.request("/api/watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({ dramaId: testDramaId }),
      });

      // Remove
      await app.request(`/api/watchlist/${testDramaId}`, {
        method: "DELETE",
        headers: { Cookie: sessionCookie },
      });

      // Add again
      const res = await app.request("/api/watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({ dramaId: testDramaId }),
      });

      expect(res.status).toBe(201);
    });

    it("should return 500 for non-existent drama ID (FK constraint)", async () => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";

      const res = await app.request("/api/watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({ dramaId: nonExistentId }),
      });

      // Foreign key constraint prevents adding non-existent dramas
      expect(res.status).toBe(500);
    });
  });
});
