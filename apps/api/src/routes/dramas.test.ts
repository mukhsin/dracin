// Test environment setup - must be imported first
import "./test-setup.js";

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  spyOn,
} from "bun:test";
import { Hono } from "hono";
import { dramaRoutes } from "./dramas.js";
import { dramaService } from "../services/drama.service.js";
import type { Drama, PaginatedResponse } from "@repo/shared/types";
import { db } from "../db/index.js";
import { migrate } from "drizzle-orm/libsql/migrator";
import { dramas } from "../db/schema.js";
import { eq } from "drizzle-orm";

// Mock data that matches the full Drama type (including fields that should be hidden)
const mockFullDrama: Drama = {
  id: "drama-001",
  bookId: "book-123",
  title: "Test Drama Title",
  slug: "test-drama-title",
  description: "A test drama description",
  posterUrl: "https://example.com/poster.jpg",
  status: "ongoing",
  language: "en",
  playCount: 1000,
  sourceEndpoint: "https://api.example.com/drama/123",
  releaseYear: 2024,
  country: "US",
  rating: 8.5,
  totalEpisodes: 24,
  genres: ["Romance", "Drama"],
  metadata: {
    releaseYear: 2024,
    country: "US",
    genre: ["Romance", "Drama"],
    rating: 8.5,
    totalEpisodes: 24,
  },
  createdAt: new Date("2024-01-15T10:00:00Z"),
  updatedAt: new Date("2024-02-15T12:00:00Z"),
};

const mockPaginatedResponse: PaginatedResponse<Drama> & { source?: string } = {
  items: [mockFullDrama],
  total: 1,
  page: 1,
  pageSize: 20,
  hasMore: false,
  source: "db",
};
describe("Drama Routes - Poster Proxy", () => {
  const app = new Hono();
  app.route("/api/dramas", dramaRoutes);

  beforeAll(async () => {
    const __dirname = import.meta.dirname;
    await migrate(db, { migrationsFolder: `${__dirname}/../../drizzle/migrations` });
  });

  describe("GET /api/dramas/:slug/poster.jpg", () => {
    afterEach(async () => {
      await db.delete(dramas).where(eq(dramas.slug, "cache-test-drama"));
      await db.delete(dramas).where(eq(dramas.slug, "no-poster-drama"));
      await db.delete(dramas).where(eq(dramas.slug, "empty-poster-drama"));
      await db
        .delete(dramas)
        .where(eq(dramas.slug, "drama-with-special-chars-123"));
      await db.delete(dramas).where(eq(dramas.slug, "stream-test"));
      await db.delete(dramas).where(eq(dramas.slug, "invalid-poster-type"));
      await db.delete(dramas).where(eq(dramas.slug, "upstream-404"));
      await db.delete(dramas).where(eq(dramas.slug, "charset-test"));
      await db.delete(dramas).where(eq(dramas.slug, "uppercase-ct"));
      // Clean up dynamic test slugs for image type tests
      const allDramas = await db.select({ slug: dramas.slug }).from(dramas);
      for (const drama of allDramas) {
        if (drama.slug.startsWith("valid-image-")) {
          await db.delete(dramas).where(eq(dramas.slug, drama.slug));
        }
      }
    });

    it("should return placeholder image when posterUrl is null", async () => {
      await db.insert(dramas).values({
        title: "No Poster Drama",
        slug: "no-poster-drama",
        posterUrl: null,
      });

      const res = await app.request("/api/dramas/no-poster-drama/poster.jpg");

      expect(res.status).toBe(200);
      const contentType = res.headers.get("Content-Type");
      expect(contentType).toBe("image/png");

      const body = await res.arrayBuffer();
      expect(body.byteLength).toBeGreaterThan(0);
    });

    it("should return placeholder image when posterUrl is empty string", async () => {
      await db.insert(dramas).values({
        title: "Empty Poster Drama",
        slug: "empty-poster-drama",
        posterUrl: "",
      });

      const res = await app.request(
        "/api/dramas/empty-poster-drama/poster.jpg",
      );

      expect(res.status).toBe(200);
      const contentType = res.headers.get("Content-Type");
      expect(contentType).toBe("image/png");

      const body = await res.arrayBuffer();
      expect(body.byteLength).toBeGreaterThan(0);
    });

    it("should return 404 for non-existent drama slug", async () => {
      const res = await app.request("/api/dramas/non-existent-slug/poster.jpg");

      expect(res.status).toBe(404);
    });

    it("should handle special characters in slug correctly", async () => {
      await db.insert(dramas).values({
        title: "Drama with Special Chars 123",
        slug: "drama-with-special-chars-123",
        posterUrl: null,
      });

      const res = await app.request(
        "/api/dramas/drama-with-special-chars-123/poster.jpg",
      );

      expect(res.status).toBe(200);
    });

    it("should return Cache-Control: public, max-age=86400 header", async () => {
      await db.insert(dramas).values({
        title: "Cache Test Drama",
        slug: "cache-test-drama",
        posterUrl: null,
      });

      const res = await app.request("/api/dramas/cache-test-drama/poster.jpg");

      expect(res.status).toBe(200);
      const cacheControl = res.headers.get("Cache-Control");
      expect(cacheControl).toBe("public, max-age=86400");
    });

    it("should stream binary content correctly", async () => {
      await db.insert(dramas).values({
        title: "Stream Test",
        slug: "stream-test",
        posterUrl: null,
      });

      const res = await app.request("/api/dramas/stream-test/poster.jpg");

      if (res.status === 200) {
        const body = await res.arrayBuffer();

        const bytes = new Uint8Array(body);
        const isJpeg =
          bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
        const isPng =
          bytes[0] === 0x89 &&
          bytes[1] === 0x50 &&
          bytes[2] === 0x4e &&
          bytes[3] === 0x47;

        expect(isJpeg || isPng).toBe(true);
      }
    });

    it("should return 502 for upstream non-image content-type", async () => {
      // Mock fetch to return HTML instead of image
      const originalFetch = global.fetch;
      global.fetch = async () =>
        new Response("<html>not an image</html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        });

      await db.insert(dramas).values({
        title: "Invalid Poster Type",
        slug: "invalid-poster-type",
        posterUrl: "https://example.com/not-an-image.html",
      });

      const res = await app.request("/api/dramas/invalid-poster-type/poster.jpg");

      expect(res.status).toBe(502);

      global.fetch = originalFetch;
      await db.delete(dramas).where(eq(dramas.slug, "invalid-poster-type"));
    });

    it("should return 502 for upstream non-ok response", async () => {
      const originalFetch = global.fetch;
      global.fetch = async () =>
        new Response("Not Found", {
          status: 404,
          statusText: "Not Found",
        });

      await db.insert(dramas).values({
        title: "Upstream 404",
        slug: "upstream-404",
        posterUrl: "https://example.com/missing.jpg",
      });

      const res = await app.request("/api/dramas/upstream-404/poster.jpg");

      expect(res.status).toBe(502);

      global.fetch = originalFetch;
      await db.delete(dramas).where(eq(dramas.slug, "upstream-404"));
    });

    it("should accept valid image content-types", async () => {
      const originalFetch = global.fetch;
      const imageTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/avif",
      ];

      for (const imageType of imageTypes) {
        global.fetch = async () =>
          new Response(new Uint8Array([0xff, 0xd8, 0xff]), {
            status: 200,
            headers: { "Content-Type": imageType },
          });

        const testSlug = `valid-image-${imageType.replace("/", "-")}`;
        await db.insert(dramas).values({
          title: `Valid ${imageType}`,
          slug: testSlug,
          posterUrl: `https://example.com/image.${imageType.split("/")[1]}`,
        });

        const res = await app.request(`/api/dramas/${testSlug}/poster.jpg`);

        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toBe(imageType);

        await db.delete(dramas).where(eq(dramas.slug, testSlug));
      }

      global.fetch = originalFetch;
    });

    it("should handle upstream content-type with charset", async () => {
      const originalFetch = global.fetch;
      global.fetch = async () =>
        new Response(new Uint8Array([0xff, 0xd8, 0xff]), {
          status: 200,
          headers: { "Content-Type": "image/jpeg; charset=utf-8" },
        });

      await db.insert(dramas).values({
        title: "Charset Test",
        slug: "charset-test",
        posterUrl: "https://example.com/image.jpg",
      });

      const res = await app.request("/api/dramas/charset-test/poster.jpg");

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/jpeg");

      global.fetch = originalFetch;
      await db.delete(dramas).where(eq(dramas.slug, "charset-test"));
    });

    it("should handle case-insensitive content-type validation", async () => {
      const originalFetch = global.fetch;
      global.fetch = async () =>
        new Response(new Uint8Array([0xff, 0xd8, 0xff]), {
          status: 200,
          headers: { "Content-Type": "IMAGE/JPEG" },
        });

      await db.insert(dramas).values({
        title: "Uppercase Content-Type",
        slug: "uppercase-ct",
        posterUrl: "https://example.com/image.jpg",
      });

      const res = await app.request("/api/dramas/uppercase-ct/poster.jpg");

      expect(res.status).toBe(200);

      global.fetch = originalFetch;
      await db.delete(dramas).where(eq(dramas.slug, "uppercase-ct"));
    });

  });
});

describe("Drama Routes - Single Drama Endpoint", () => {
  const app = new Hono();
  app.route("/api/dramas", dramaRoutes);

  describe("GET /api/dramas/:slug - Single Drama Endpoint Sanitization", () => {
    let getDramaMetadataBySlugSpy: ReturnType<typeof spyOn>;

    const mockDrama = {
      ...mockFullDrama,
    };

    beforeAll(() => {
      getDramaMetadataBySlugSpy = spyOn(
        dramaService,
        "getDramaMetadataBySlug",
      ).mockResolvedValue(mockDrama);
    });

    afterAll(() => {
      getDramaMetadataBySlugSpy.mockRestore();
    });

    it("should return drama without bookId, createdAt, updatedAt", async () => {
      const res = await app.request("/api/dramas/test-drama");

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();

      expect(json.data.bookId).toBeUndefined();
      expect(json.data.createdAt).toBeUndefined();
      expect(json.data.updatedAt).toBeUndefined();
    });

    it("should include posterUrl in the response", async () => {
      const res = await app.request("/api/dramas/test-drama");

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(json.data).toHaveProperty("posterUrl");
      expect(json.data.posterUrl).toBe(
        `/api/dramas/${json.data.slug}/poster.jpg`,
      );
    });

    it("should not include episodes in single drama response", async () => {
      const res = await app.request("/api/dramas/test-drama");

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();

      // Single drama endpoint should not include episodes
      expect(json.data.episodes).toBeUndefined();
    });

    it("should return 404 for non-existent slug", async () => {
      getDramaMetadataBySlugSpy.mockResolvedValueOnce(null);

      const res = await app.request("/api/dramas/non-existent-slug-12345");

      expect(res.status).toBe(404);
    });

    it("should include Cache-Control header", async () => {
      const res = await app.request("/api/dramas/test-drama");

      expect(res.status).toBe(200);
      const cacheControl = res.headers.get("Cache-Control");
      expect(cacheControl).toBe("public, max-age=60");
    });

    it("should have correct response format with success and data", async () => {
      const res = await app.request("/api/dramas/test-drama");

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("success");
      expect(json).toHaveProperty("data");
      expect(json.success).toBe(true);
    });
  });
});




describe("Drama Routes - List Endpoint Sanitization", () => {
  const app = new Hono();
  app.route("/api/dramas", dramaRoutes);

  describe("GET /api/dramas - Response Sanitization", () => {
    let listSpy: ReturnType<typeof spyOn>;

    beforeAll(() => {
      listSpy = spyOn(dramaService, "list").mockResolvedValue(
        mockPaginatedResponse,
      );
    });

    afterAll(() => {
      listSpy.mockRestore();
    });

    it("should exclude bookId from response items", async () => {
      const res = await app.request("/api/dramas");
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.items).toBeDefined();
      expect(json.data.items.length).toBeGreaterThan(0);

      const firstItem = json.data.items[0];
      expect(firstItem).not.toHaveProperty("bookId");
    });

    it("should exclude createdAt from response items", async () => {
      const res = await app.request("/api/dramas");
      expect(res.status).toBe(200);

      const json = await res.json();
      const firstItem = json.data.items[0];
      expect(firstItem).not.toHaveProperty("createdAt");
    });

    it("should exclude updatedAt from response items", async () => {
      const res = await app.request("/api/dramas");
      expect(res.status).toBe(200);

      const json = await res.json();
      const firstItem = json.data.items[0];
      expect(firstItem).not.toHaveProperty("updatedAt");
    });

    it("should include posterUrl in response items", async () => {
      const res = await app.request("/api/dramas");
      expect(res.status).toBe(200);

      const json = await res.json();
      const firstItem = json.data.items[0];
      expect(firstItem).toHaveProperty("posterUrl");
      expect(firstItem.posterUrl).toBe(
        `/api/dramas/${firstItem.slug}/poster.jpg`,
      );
    });

    it("should include all other expected fields", async () => {
      const res = await app.request("/api/dramas");
      expect(res.status).toBe(200);

      const json = await res.json();
      const firstItem = json.data.items[0];

      expect(firstItem).toHaveProperty("id");
      expect(firstItem).toHaveProperty("title");
      expect(firstItem).toHaveProperty("slug");
      expect(firstItem).toHaveProperty("description");
      expect(firstItem).toHaveProperty("status");
      expect(firstItem).toHaveProperty("language");
      expect(firstItem).toHaveProperty("playCount");
      expect(firstItem).toHaveProperty("sourceEndpoint");
      expect(firstItem).toHaveProperty("releaseYear");
      expect(firstItem).toHaveProperty("country");
      expect(firstItem).toHaveProperty("rating");
      expect(firstItem).toHaveProperty("totalEpisodes");
      expect(firstItem).toHaveProperty("genres");
      expect(firstItem).toHaveProperty("metadata");

      expect(firstItem.id).toBe("drama-001");
      expect(firstItem.title).toBe("Test Drama Title");
      expect(firstItem.slug).toBe("test-drama-title");
      expect(firstItem.description).toBe("A test drama description");
      expect(firstItem.status).toBe("ongoing");
      expect(firstItem.language).toBe("en");
      expect(firstItem.playCount).toBe(1000);
      expect(firstItem.sourceEndpoint).toBe(
        "https://api.example.com/drama/123",
      );
      expect(firstItem.releaseYear).toBe(2024);
      expect(firstItem.country).toBe("US");
      expect(firstItem.rating).toBe(8.5);
      expect(firstItem.totalEpisodes).toBe(24);
      expect(firstItem.genres).toEqual(["Romance", "Drama"]);
    });

    it("should return sanitized empty array when no dramas exist", async () => {
      listSpy.mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        hasMore: false,
        source: "db",
      });

      const res = await app.request("/api/dramas");
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.items).toEqual([]);
      expect(json.data.total).toBe(0);
    });

    it("should not break sanitization when using query params (page, pageSize)", async () => {
      const res = await app.request("/api/dramas?page=2&pageSize=10");
      expect(res.status).toBe(200);

      const json = await res.json();
      const firstItem = json.data.items[0];

      expect(firstItem).not.toHaveProperty("bookId");
      expect(firstItem).not.toHaveProperty("createdAt");
      expect(firstItem).not.toHaveProperty("updatedAt");
      expect(firstItem).toHaveProperty("posterUrl");
      expect(firstItem).toHaveProperty("title");
    });

    it("should not break sanitization when using filter params (status, language)", async () => {
      const res = await app.request("/api/dramas?status=ongoing&language=en");
      expect(res.status).toBe(200);

      const json = await res.json();
      const firstItem = json.data.items[0];

      expect(firstItem).not.toHaveProperty("bookId");
      expect(firstItem).not.toHaveProperty("createdAt");
      expect(firstItem).not.toHaveProperty("updatedAt");
      expect(firstItem).toHaveProperty("posterUrl");
      expect(firstItem).toHaveProperty("title");
    });

    it("should not break sanitization when using search param", async () => {
      const res = await app.request("/api/dramas?q=test");
      expect(res.status).toBe(200);

      const json = await res.json();
      const firstItem = json.data.items[0];

      expect(firstItem).not.toHaveProperty("bookId");
      expect(firstItem).not.toHaveProperty("createdAt");
      expect(firstItem).not.toHaveProperty("updatedAt");
      expect(firstItem).toHaveProperty("posterUrl");
      expect(firstItem).toHaveProperty("title");
    });

    it("should not break sanitization when using sort params", async () => {
      const res = await app.request("/api/dramas?sortBy=title&sortOrder=asc");
      expect(res.status).toBe(200);

      const json = await res.json();
      const firstItem = json.data.items[0];

      expect(firstItem).not.toHaveProperty("bookId");
      expect(firstItem).not.toHaveProperty("createdAt");
      expect(firstItem).not.toHaveProperty("updatedAt");
      expect(firstItem).toHaveProperty("posterUrl");
      expect(firstItem).toHaveProperty("title");
    });

    it("should sanitize multiple items in the list", async () => {
      listSpy.mockResolvedValueOnce({
        items: [
          { ...mockFullDrama, id: "drama-001", title: "Drama 1" },
          { ...mockFullDrama, id: "drama-002", title: "Drama 2" },
          { ...mockFullDrama, id: "drama-003", title: "Drama 3" },
        ],
        total: 3,
        page: 1,
        pageSize: 20,
        hasMore: false,
        source: "db",
      });

      const res = await app.request("/api/dramas");
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.items.length).toBe(3);

      for (const item of json.data.items) {
        expect(item).not.toHaveProperty("bookId");
        expect(item).not.toHaveProperty("createdAt");
        expect(item).not.toHaveProperty("updatedAt");
        expect(item).toHaveProperty("posterUrl");
        expect(item.posterUrl).toBe(`/api/dramas/${item.slug}/poster.jpg`);
        expect(item).toHaveProperty("title");
        expect(item).toHaveProperty("id");
      }
    });

    it("should include Cache-Control header", async () => {
      const res = await app.request("/api/dramas");
      const cacheControl = res.headers.get("Cache-Control");
      expect(cacheControl).toBe("public, max-age=300");
    });

    it("should have correct response structure", async () => {
      const res = await app.request("/api/dramas");
      const json = await res.json();

      expect(json).toHaveProperty("success");
      expect(json).toHaveProperty("data");
      expect(json).toHaveProperty("meta");
      expect(json.success).toBe(true);
      expect(json.data).toHaveProperty("items");
      expect(json.data).toHaveProperty("total");
      expect(json.data).toHaveProperty("page");
      expect(json.data).toHaveProperty("pageSize");
      expect(json.data).toHaveProperty("hasMore");
      expect(json.meta).toHaveProperty("source");
    });
  });
});
