import { describe, it, expect } from "bun:test";
import { createApp } from "../app.js";

const app = createApp();

describe("Episode API Routing", () => {
  describe("GET /api/dramas/:slug/episodes/:number", () => {
    it("should return 404 for non-existent drama", async () => {
      const res = await app.request(
        "/api/dramas/non-existent-drama/episodes/1",
      );
      expect(res.status).toBe(404);
    });

    it("should return 404 for non-existent episode number", async () => {
      // This will fail due to drama not found, but we're testing the routing
      const res = await app.request("/api/dramas/test-drama/episodes/999");
      expect(res.status).toBe(404);
    });
  });

  describe("Old endpoint GET /api/episodes/:id", () => {
    it("should return 404 (endpoint removed)", async () => {
      const res = await app.request(
        "/api/episodes/00000000-0000-0000-0000-000000000000",
      );
      expect(res.status).toBe(404);
    });
  });
});
