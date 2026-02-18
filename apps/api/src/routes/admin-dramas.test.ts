process.env.DATABASE_URL = "file::memory:";
process.env.NODE_ENV = "test";
process.env.ADMIN_AUTH_SECRET = "test-admin-secret";

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  spyOn,
} from "bun:test";
import { Hono } from "hono";
import { adminDramasRouter } from "./admin-dramas.js";
import { db } from "../db/index.js";
import { migrate } from "drizzle-orm/libsql/migrator";
import { dramas } from "../db/schema.js";
import { fetchAllDramas } from "../services/api-proxy.service.js";
import { eq } from "drizzle-orm";

const mockApiProxyResponse = {
  status: true,
  message: "Success",
  total: 2,
  data: [
    {
      bookId: "42000005442",
      title: "Test Drama 1",
      cover: "https://example.com/cover1.jpg",
      intro: "Test intro 1",
      chapterCount: 88,
      playCount: "4.1M",
      language: "in",
    },
    {
      bookId: "42000005443",
      title: "Test Drama 2",
      cover: "https://example.com/cover2.jpg",
      intro: "Test intro 2",
      chapterCount: 50,
      playCount: "2.5M",
      language: "en",
    },
  ],
};

describe("Admin Drama Routes - Authentication", () => {
  const app = new Hono();
  app.route("/api/admin/dramas", adminDramasRouter);

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "./drizzle/migrations" });
  });

  it("should require authentication token", async () => {
    const res = await app.request("/api/admin/dramas/sync", {
      method: "POST",
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("should reject invalid authentication tokens", async () => {
    const res = await app.request("/api/admin/dramas/sync", {
      method: "POST",
      headers: {
        Authorization: "Bearer invalid-token",
      },
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("should accept valid authentication tokens", async () => {
    const res = await app.request("/api/admin/dramas/sync", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.ADMIN_AUTH_SECRET}`,
      },
    });

    expect(res.status).not.toBe(401);
  });
});

describe("Admin Drama Routes - POST /api/admin/dramas/sync", () => {
  const app = new Hono();
  app.route("/api/admin/dramas", adminDramasRouter);

  let apiProxySpy: ReturnType<typeof spyOn>;

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "./drizzle/migrations" });
  });

  beforeEach(() => {
    apiProxySpy = spyOn(
      require("../services/api-proxy.service.js"),
      "fetchAllDramas",
    ).mockResolvedValue({
      success: true,
      data: mockApiProxyResponse.data,
    });
  });

  afterEach(async () => {
    apiProxySpy?.mockRestore();
    await db.delete(dramas);
  });

  it("should sync dramas from api-proxy successfully", async () => {
    const res = await app.request("/api/admin/dramas/sync", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.ADMIN_AUTH_SECRET}`,
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.total).toBe(2);
    expect(json.data.inserted).toBe(0);
    expect(json.data.updated).toBe(2);
    expect(json.data.errors).toHaveLength(0);
    expect(json.data.duration).toBeGreaterThan(0);

    const testDramas = await db
      .select()
      .from(dramas)
      .where(eq(dramas.bookId, "42000005442"));
    expect(testDramas).toHaveLength(1);
    expect(testDramas[0].bookId).toBe("42000005442");
    expect(testDramas[0].title).toBe("Test Drama 1");
  });

  it("should handle api-proxy failures gracefully", async () => {
    apiProxySpy.mockResolvedValue({
      success: false,
      message: "API proxy error",
    });

    const res = await app.request("/api/admin/dramas/sync", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.ADMIN_AUTH_SECRET}`,
      },
    });

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("SYNC_ERROR");
    expect(json.error.message).toContain("API proxy returned error");
  });

  it("should upsert dramas in database", async () => {
    await db.insert(dramas).values({
      id: crypto.randomUUID(),
      bookId: "42000005442",
      title: "Old Title",
      slug: "old-title",
      description: "Old description",
      posterUrl: "https://example.com/old-cover.jpg",
      status: "ongoing",
      language: null,
      playCount: null,
      sourceEndpoint: null,
      metadata: null,
      totalEpisodes: null,
      releaseYear: null,
      country: null,
      rating: null,
      genres: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    apiProxySpy.mockResolvedValue({
      success: true,
      data: [
        {
          bookId: "42000005442",
          title: "New Updated Title",
          cover: "https://example.com/new-cover.jpg",
          intro: "New intro",
          chapterCount: 100,
          playCount: "5.0M",
          language: "in",
        },
      ],
    });

    const res = await app.request("/api/admin/dramas/sync", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.ADMIN_AUTH_SECRET}`,
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.total).toBe(1);
    expect(json.data.inserted).toBe(0);
    expect(json.data.updated).toBe(1);

    const updatedDrama = await db
      .select()
      .from(dramas)
      .where(eq(dramas.bookId, "42000005442"))
      .limit(1);
    expect(updatedDrama).toHaveLength(1);
    expect(updatedDrama[0].title).toBe("New Updated Title");
  });

  it("should generate slugs from titles", async () => {
    const res = await app.request("/api/admin/dramas/sync", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.ADMIN_AUTH_SECRET}`,
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    const dbDramas = await db.select().from(dramas);
    expect(dbDramas[0].slug).toBe("test-drama-1");
    expect(dbDramas[1].slug).toBe("test-drama-2");
  });

  it("should handle duplicate bookIds correctly", async () => {
    await app.request("/api/admin/dramas/sync", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.ADMIN_AUTH_SECRET}`,
      },
    });

    const res = await app.request("/api/admin/dramas/sync", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.ADMIN_AUTH_SECRET}`,
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.total).toBe(2);
    expect(json.data.inserted).toBe(0);
    expect(json.data.updated).toBe(2);

    const dbDramas = await db.select().from(dramas);
    expect(dbDramas).toHaveLength(2);
  });
});

describe("Admin Drama Routes - Error Handling", () => {
  const app = new Hono();
  app.route("/api/admin/dramas", adminDramasRouter);

  let apiProxySpy: ReturnType<typeof spyOn>;

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "./drizzle/migrations" });
  });

  beforeEach(() => {
    apiProxySpy = spyOn(
      require("../services/api-proxy.service.js"),
      "fetchAllDramas",
    );
  });

  afterEach(async () => {
    apiProxySpy?.mockRestore();
    await db.delete(dramas);
  });

  it("should handle network errors from api-proxy", async () => {
    apiProxySpy.mockRejectedValue(new Error("Network failure"));

    const res = await app.request("/api/admin/dramas/sync", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.ADMIN_AUTH_SECRET}`,
      },
    });

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("SYNC_ERROR");
    expect(json.error.message).toContain("Network failure");
  });

  it("should handle malformed api-proxy responses", async () => {
    apiProxySpy.mockResolvedValue({
      success: true,
      data: null,
    });

    const res = await app.request("/api/admin/dramas/sync", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.ADMIN_AUTH_SECRET}`,
      },
    });

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it("should handle database errors during sync", async () => {
    await db.insert(dramas).values({
      id: crypto.randomUUID(),
      bookId: "42000005442",
      title: "Existing Drama",
      slug: "existing-drama",
      description: "Existing description",
      posterUrl: "https://example.com/cover.jpg",
      status: "ongoing",
      language: null,
      playCount: null,
      sourceEndpoint: null,
      metadata: null,
      totalEpisodes: null,
      releaseYear: null,
      country: null,
      rating: null,
      genres: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    apiProxySpy.mockResolvedValue({
      success: true,
      data: [
        {
          bookId: "42000005442",
          title: "New Drama",
          cover: "https://example.com/new-cover.jpg",
          intro: "New intro",
          chapterCount: 100,
          playCount: "5.0M",
          language: "in",
        },
      ],
    });

    const res = await app.request("/api/admin/dramas/sync", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.ADMIN_AUTH_SECRET}`,
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("should provide meaningful error messages", async () => {
    apiProxySpy.mockRejectedValue(new Error("Specific error message"));

    const res = await app.request("/api/admin/dramas/sync", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.ADMIN_AUTH_SECRET}`,
      },
    });

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("SYNC_ERROR");
    expect(json.error.message).toContain("Specific error message");
  });
});
