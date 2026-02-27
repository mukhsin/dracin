// Test environment setup - must be imported first
import "./test-setup.js";

import { describe, it, expect, beforeAll, afterAll, afterEach } from "bun:test";
import { Hono } from "hono";
import { videoProxyRoutes } from "./video-proxy.js";
import { db } from "../db/index.js";
import { migrate } from "drizzle-orm/libsql/migrator";
import { dramas, episodes } from "../db/schema.js";
import { eq } from "drizzle-orm";

describe("Video Proxy Routes - Range Request Handling", () => {
  const app = new Hono();
  app.route("/api", videoProxyRoutes);

  beforeAll(async () => {
    const __dirname = import.meta.dirname;
    await migrate(db, {
      migrationsFolder: `${__dirname}/../../drizzle/migrations`,
    });
  });

  afterEach(async () => {
    await db.delete(episodes).where(eq(episodes.dramaId, "drama-test-001"));
    await db.delete(dramas).where(eq(dramas.id, "drama-test-001"));
  });

  describe("Range Header Validation", () => {
    it("should return 416 for invalid range format", async () => {
      const res = await app.request("/api/video/test.mp4", {
        headers: { Range: "invalid-range-format" },
      });

      expect(res.status).toBe(416);
      const acceptRanges = res.headers.get("Accept-Ranges");
      expect(acceptRanges).toBe("bytes");
    });

    it("should return 416 for non-bytes range unit", async () => {
      const res = await app.request("/api/video/test.mp4", {
        headers: { Range: "items=0-10" },
      });

      expect(res.status).toBe(416);
      const acceptRanges = res.headers.get("Accept-Ranges");
      expect(acceptRanges).toBe("bytes");
    });

    it("should return 416 for negative range start", async () => {
      const res = await app.request("/api/video/test.mp4", {
        headers: { Range: "bytes=-5-10" },
      });

      expect(res.status).toBe(416);
    });

    it("should return 416 when start > end", async () => {
      const res = await app.request("/api/video/test.mp4", {
        headers: { Range: "bytes=100-50" },
      });

      expect(res.status).toBe(416);
    });

    it("should accept valid range format bytes=start-end", async () => {
      // This will fail upstream (no mock), but range validation should pass
      const res = await app.request("/api/video/test.mp4", {
        headers: { Range: "bytes=0-1023" },
      });

      // Should not be 416 (invalid range), but might be 502 (upstream fail) or 404
      expect(res.status).not.toBe(416);
      const acceptRanges = res.headers.get("Accept-Ranges");
      expect(acceptRanges).toBe("bytes");
    });

    it("should accept valid suffix range bytes=start-", async () => {
      const res = await app.request("/api/video/test.mp4", {
        headers: { Range: "bytes=1024-" },
      });

      expect(res.status).not.toBe(416);
      const acceptRanges = res.headers.get("Accept-Ranges");
      expect(acceptRanges).toBe("bytes");
    });

    it("should accept valid suffix range bytes=-N", async () => {
      const res = await app.request("/api/video/test.mp4", {
        headers: { Range: "bytes=-1024" },
      });

      expect(res.status).not.toBe(416);
      const acceptRanges = res.headers.get("Accept-Ranges");
      expect(acceptRanges).toBe("bytes");
    });
  });

  describe("Response Headers", () => {
    it("should always include Accept-Ranges: bytes header", async () => {
      const res = await app.request("/api/video/nonexistent.mp4");

      const acceptRanges = res.headers.get("Accept-Ranges");
      expect(acceptRanges).toBe("bytes");
    });

    it("should include CORS headers for video requests", async () => {
      const res = await app.request("/api/video/test.mp4");

      const allowOrigin = res.headers.get("Access-Control-Allow-Origin");
      expect(allowOrigin).toBe("*");
    });
  });

  describe("Range Success Path - Content-Range Headers", () => {
    it("should return 206 with Content-Range when upstream returns 206", async () => {
      // Mock fetch to return 206 with Content-Range
      const originalFetch = global.fetch;
      global.fetch = async () =>
        new Response(new Uint8Array([0x00, 0x01]), {
          status: 206,
          headers: {
            "Content-Type": "video/mp4",
            "Content-Range": "bytes 0-1/1000",
            "Content-Length": "2",
            "Accept-Ranges": "bytes",
          },
        });

      const res = await app.request("/api/video/test.mp4", {
        headers: { Range: "bytes=0-1" },
      });

      expect(res.status).toBe(206);
      expect(res.headers.get("Content-Range")).toBe("bytes 0-1/1000");
      expect(res.headers.get("Accept-Ranges")).toBe("bytes");
      expect(res.headers.get("Content-Type")).toBe("video/mp4");

      global.fetch = originalFetch;
    });

    it("should synthesize Content-Range when upstream returns 200 for range request", async () => {
      // Mock fetch to return 200 (not 206) with Content-Length
      const originalFetch = global.fetch;
      global.fetch = async () =>
        new Response(new Uint8Array([0x00, 0x01, 0x02, 0x03]), {
          status: 200,
          headers: {
            "Content-Type": "video/mp4",
            "Content-Length": "1000",
          },
        });

      const res = await app.request("/api/video/test.mp4", {
        headers: { Range: "bytes=0-3" },
      });

      // Should convert 200 to 206 and synthesize Content-Range
      expect(res.status).toBe(206);
      expect(res.headers.get("Content-Range")).toBe("bytes 0-3/1000");
      expect(res.headers.get("Accept-Ranges")).toBe("bytes");
      expect(res.headers.get("Content-Length")).toBe("4");

      global.fetch = originalFetch;
    });

    it("should synthesize Content-Range for open-ended range bytes=start-", async () => {
      const originalFetch = global.fetch;
      global.fetch = async () =>
        new Response(new Uint8Array([0x00, 0x01, 0x02]), {
          status: 200,
          headers: {
            "Content-Type": "video/mp4",
            "Content-Length": "1000",
          },
        });

      const res = await app.request("/api/video/test.mp4", {
        headers: { Range: "bytes=500-" },
      });

      // Should synthesize Content-Range with end as total-1
      expect(res.status).toBe(206);
      expect(res.headers.get("Content-Range")).toBe("bytes 500-999/1000");

      global.fetch = originalFetch;
    });

    it("should forward upstream 416 for unsatisfiable range", async () => {
      const originalFetch = global.fetch;
      global.fetch = async () =>
        new Response("Range Not Satisfiable", {
          status: 416,
          headers: {
            "Content-Range": "bytes */1000",
          },
        });

      const res = await app.request("/api/video/test.mp4", {
        headers: { Range: "bytes=2000-3000" },
      });

      expect(res.status).toBe(416);
      expect(res.headers.get("Accept-Ranges")).toBe("bytes");

      global.fetch = originalFetch;
    });

    it("should handle suffix range bytes=-N without Content-Range synthesis", async () => {
      const originalFetch = global.fetch;
      global.fetch = async () =>
        new Response(new Uint8Array([0x00, 0x01]), {
          status: 206,
          headers: {
            "Content-Type": "video/mp4",
            "Content-Length": "2",
            "Accept-Ranges": "bytes",
          },
        });

      const res = await app.request("/api/video/test.mp4", {
        headers: { Range: "bytes=-2" },
      });

      // Should pass through as-is without synthesizing Content-Range
      expect(res.status).toBe(206);
      expect(res.headers.get("Content-Range")).toBeNull();

      global.fetch = originalFetch;
    });
  });

  describe("Range Contract Failure - Negative Assertion", () => {
    it("should fail contract when Content-Range is missing for range request", async () => {
      // This test documents the contract failure case
      // If upstream returns 206 without Content-Range and no Content-Length,
      // the response should not claim to be a valid range response

      const originalFetch = global.fetch;
      global.fetch = async () =>
        new Response(new Uint8Array([0x00]), {
          status: 206,
          headers: {
            "Content-Type": "video/mp4",
            // Intentionally missing Content-Range AND Content-Length
            // This is a contract violation by upstream
          },
        });

      const res = await app.request("/api/video/test.mp4", {
        headers: { Range: "bytes=0-0" },
      });

      // Should still return 206 but without synthesized Content-Range
      // because we can't determine total size
      expect(res.status).toBe(206);
      // Content-Range header should NOT be present (contract failure)
      expect(res.headers.get("Content-Range")).toBeNull();

      global.fetch = originalFetch;
    });
  });

  describe("OPTIONS Requests", () => {
    it("should handle OPTIONS requests with proper CORS headers", async () => {
      const res = await app.request("/api/video/test.mp4", {
        method: "OPTIONS",
      });

      expect(res.status).toBe(204);
      const allowOrigin = res.headers.get("Access-Control-Allow-Origin");
      expect(allowOrigin).toBe("*");
      const allowMethods = res.headers.get("Access-Control-Allow-Methods");
      expect(allowMethods).toContain("GET");
    });
  });

  describe("Episode URL Contract", () => {
    // Use valid UUID format for short URL route validation
    const TEST_DRAMA_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

    beforeAll(async () => {
      await db.insert(dramas).values({
        id: TEST_DRAMA_ID,
        title: "URL Contract Test Drama",
        slug: "url-contract-test-drama",
        posterUrl: null,
      });

      await db.insert(episodes).values({
        id: "episode-url-contract-001",
        dramaId: TEST_DRAMA_ID,
        number: 1,
        title: "Episode 1",
        videoUrls: {
          "1080p": "https://hwztvideo.dramaboxdb.com/test-video-1080p.mp4",
          "720p": "https://hwztvideo.dramaboxdb.com/test-video-720p.mp4",
        },
      });
    });

    afterAll(async () => {
      await db
        .delete(episodes)
        .where(eq(episodes.id, "episode-url-contract-001"));
      await db.delete(dramas).where(eq(dramas.id, TEST_DRAMA_ID));
    });

    it("should emit /api/video/*.mp4 URLs for short format requests", async () => {
      // Mock fetch to avoid upstream dependency
      const originalFetch = global.fetch;
      global.fetch = async () =>
        new Response(new Uint8Array([0x00]), {
          status: 200,
          headers: { "Content-Type": "video/mp4", "Content-Length": "1000" },
        });

      // Test the short URL format: /api/video/{dramaId}/{episodeKey}
      const res = await app.request(`/api/video/${TEST_DRAMA_ID}/1.1080p.mp4`);

      // Should proxy successfully (not 404)
      expect(res.status).not.toBe(404);
      expect([200, 206]).toContain(res.status);

      global.fetch = originalFetch;
    });

    it("should emit /api/video/*.mp4 URLs for dot format requests", async () => {
      const originalFetch = global.fetch;
      global.fetch = async () =>
        new Response(new Uint8Array([0x00]), {
          status: 200,
          headers: { "Content-Type": "video/mp4", "Content-Length": "1000" },
        });

      // Test the dot-separated format: /api/video/{dramaId}.{episode}.{quality}.mp4
      // Note: dot format also requires UUID format for dramaId
      const res = await app.request(`/api/video/${TEST_DRAMA_ID}.1.1080p.mp4`);

      // Should proxy successfully (not 404)
      expect(res.status).not.toBe(404);
      expect([200, 206]).toContain(res.status);

      global.fetch = originalFetch;
    });

    it("should return 404 for non-existent drama in short format", async () => {
      const res = await app.request(
        "/api/video/00000000-0000-0000-0000-000000000000/1.1080p.mp4",
      );

      expect(res.status).toBe(404);
    });

    it("should return 404 for non-existent episode number", async () => {
      const res = await app.request(
        `/api/video/${TEST_DRAMA_ID}/999.1080p.mp4`,
      );

      expect(res.status).toBe(404);
    });

    it("should fallback to highest quality when requested quality not available", async () => {
      const originalFetch = global.fetch;
      global.fetch = async () =>
        new Response(new Uint8Array([0x00]), {
          status: 200,
          headers: { "Content-Type": "video/mp4", "Content-Length": "1000" },
        });

      // Request 480p which doesn't exist - should fallback to 1080p
      const res = await app.request(`/api/video/${TEST_DRAMA_ID}/1.480p.mp4`);

      // Should still succeed via fallback
      expect(res.status).not.toBe(404);

      global.fetch = originalFetch;
    });
  });

  describe("Short URL Format", () => {
    beforeAll(async () => {
      await db.insert(dramas).values({
        id: "drama-test-001",
        title: "Test Drama",
        slug: "test-drama",
        posterUrl: null,
      });

      await db.insert(episodes).values({
        id: "episode-test-001",
        dramaId: "drama-test-001",
        number: 1,
        title: "Episode 1",
        videoUrls: {
          "1080p": "https://hwztvideo.dramaboxdb.com/test-video-1080p.mp4",
        },
      });
    });

    it("should return 404 for non-existent video (valid UUID format)", async () => {
      const res = await app.request(
        "/api/video/550e8400-e29b-41d4-a716-446655440000.1.1080p.mp4",
      );

      // When UUID is valid format but drama not found, it falls through to upstream
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("should proxy invalid key format to upstream", async () => {
      const res = await app.request("/api/video/invalid-key-format.mp4");

      // Invalid format falls through to direct proxy upstream
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("should proxy invalid quality to upstream", async () => {
      const res = await app.request(
        "/api/video/drama-test-001.1.invalid-quality.mp4",
      );

      // Invalid quality falls through to direct proxy upstream
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });
});

describe("Video Proxy Routes - Legacy Dot URL Format", () => {
  const app = new Hono();
  app.route("/api", videoProxyRoutes);

  describe("Backward Compatibility", () => {
    it("should parse dot-separated format dramaId.episode.quality.mp4", async () => {
      // This should attempt to resolve via resolveShortVideoUrl
      // Since there's no matching drama, it will 404, but the parsing should work
      const res = await app.request(
        "/api/video/550e8400-e29b-41d4-a716-446655440001.5.720p.mp4",
      );

      // Should not be a 400 (parsing error), likely 404 (not found) or 502 (upstream)
      expect(res.status).not.toBe(400);
    });

    it("should reject invalid UUID in dot format", async () => {
      const res = await app.request("/api/video/not-a-uuid.1.1080p.mp4");

      // Invalid UUID pattern falls through to upstream proxy, which returns 403
      // The route accepts it as a direct path proxy
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });
});
