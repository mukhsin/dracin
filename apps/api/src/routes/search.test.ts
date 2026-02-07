import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { searchRoutes } from "./search.js";

describe("Search Routes", () => {
  const app = new Hono();
  app.route("/api/search", searchRoutes);

  describe("GET /api/search", () => {
    it("should return 400 when q parameter is missing", async () => {
      const res = await app.request("/api/search?page=1&size=20");
      expect(res.status).toBe(400);
    });

    it("should return 400 when q parameter is empty", async () => {
      const res = await app.request("/api/search?q=");
      expect(res.status).toBe(400);
    });

    it("should include Cache-Control header", async () => {
      const res = await app.request("/api/search?q=test");
      const cacheControl = res.headers.get("Cache-Control");
      expect(cacheControl).toBe("public, max-age=60");
    });

    it("should have correct response format", async () => {
      const res = await app.request("/api/search?q=love");
      if (res.status === 200) {
        const json = await res.json();
        expect(json).toHaveProperty("success");
        expect(json).toHaveProperty("data");
        expect(json.success).toBe(true);
        expect(Array.isArray(json.data)).toBe(true);
      }
    });

    it("should use default page and size values", async () => {
      const res = await app.request("/api/search?q=romance");
      expect(res.status).toBe(200);
    });

    it("should accept custom page and size", async () => {
      const res = await app.request("/api/search?q=drama&page=2&size=50");
      expect(res.status).toBe(200);
    });

    it("should reject invalid page values", async () => {
      const res = await app.request("/api/search?q=test&page=0");
      expect(res.status).toBe(400);
    });

    it("should reject invalid size values", async () => {
      const res = await app.request("/api/search?q=test&size=0");
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/search/suggest", () => {
    it("should return 400 when q parameter is missing", async () => {
      const res = await app.request("/api/search/suggest");
      expect(res.status).toBe(400);
    });

    it("should return 400 when q parameter is empty", async () => {
      const res = await app.request("/api/search/suggest?q=");
      expect(res.status).toBe(400);
    });

    it("should include Cache-Control header", async () => {
      const res = await app.request("/api/search/suggest?q=lov");
      const cacheControl = res.headers.get("Cache-Control");
      expect(cacheControl).toBe("public, max-age=60");
    });

    it("should have correct response format", async () => {
      const res = await app.request("/api/search/suggest?q=lo");
      if (res.status === 200) {
        const json = await res.json();
        expect(json).toHaveProperty("success");
        expect(json).toHaveProperty("data");
        expect(json.success).toBe(true);
        expect(Array.isArray(json.data)).toBe(true);
      }
    });
  });
});
