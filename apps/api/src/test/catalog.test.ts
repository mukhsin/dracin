import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { createApp } from "../app.js";
import type { Drama, RankItem, ChannelDrama } from "../services/api-proxy.service.js";

const mockDramas: Drama[] = [
  {
    id: "1",
    title: "Test Drama 1",
    cover: "https://example.com/cover1.jpg",
    intro: "Test description 1",
    book_id: "1001",
    source: "source1",
  },
  {
    id: "2",
    title: "Test Drama 2",
    cover: "https://example.com/cover2.jpg",
    intro: "Test description 2",
    book_id: "1002",
    source: "source2",
  },
];

const mockRankItems: RankItem[] = [
  { rank: 1, drama: mockDramas[0] },
  { rank: 2, drama: mockDramas[1] },
];

const mockChannelDramas: ChannelDrama[] = [
  {
    ...mockDramas[0],
    channelId: 205,
    channelName: "Test Channel",
  },
  {
    ...mockDramas[1],
    channelId: 205,
    channelName: "Test Channel",
  },
];

describe("Catalog Routes", () => {
  const app = createApp();
  let apiProxyServer: ReturnType<typeof Bun.serve> | null = null;

  beforeAll(() => {
    process.env.API_PROXY_URL = "http://localhost:3002";
    
    // Create a single comprehensive mock server
    apiProxyServer = Bun.serve({
      port: 3002,
      fetch(req) {
        const url = new URL(req.url);
        const path = url.pathname;
        
        // Handle featured endpoint
        if (path === "/drama/featured") {
          const page = url.searchParams.get("page");
          const size = url.searchParams.get("size");
          
          // Simulate error for specific test case
          if (page === "99") {
            return new Response("Internal Server Error", { status: 500 });
          }
          
          return Response.json({
            status: true,
            message: "Success",
            data: mockDramas,
          });
        }
        
        // Handle latest endpoint
        if (path === "/drama/latest") {
          return Response.json({
            status: true,
            message: "Success",
            data: mockDramas,
          });
        }
        
        // Handle rank endpoint
        if (path === "/drama/rank") {
          return Response.json({
            status: true,
            message: "Success",
            data: mockRankItems,
          });
        }
        
        // Handle channel endpoint
        if (path === "/drama/channel/205") {
          return Response.json({
            status: true,
            message: "Success",
            data: mockChannelDramas,
          });
        }
        
        // Handle indo endpoint
        if (path === "/drama/indo") {
          return Response.json({
            status: true,
            message: "Success",
            data: mockDramas,
          });
        }
        
        return new Response("Not Found", { status: 404 });
      },
    });
  });

  afterAll(() => {
    if (apiProxyServer) {
      apiProxyServer.stop();
      apiProxyServer = null;
    }
    delete process.env.API_PROXY_URL;
  });

  describe("GET /api/catalog/featured", () => {
    it("should return featured dramas with default pagination", async () => {
      const res = await app.request("/api/catalog/featured");

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockDramas);
      expect(res.headers.get("Cache-Control")).toBe("public, max-age=300");
    });

    it("should handle custom page and size parameters", async () => {
      const res = await app.request("/api/catalog/featured?page=2&size=10");

      expect(res.status).toBe(200);
    });

    it("should reject invalid page parameter", async () => {
      const res = await app.request("/api/catalog/featured?page=0");

      expect(res.status).toBe(400);
    });

    it("should reject invalid size parameter", async () => {
      const res = await app.request("/api/catalog/featured?page=1&size=101");

      expect(res.status).toBe(400);
    });

    it("should return 500 when API proxy fails", async () => {
      const res = await app.request("/api/catalog/featured?page=99");

      expect(res.status).toBe(500);
    });
  });

  describe("GET /api/catalog/latest", () => {
    it("should return latest dramas with default pagination", async () => {
      const res = await app.request("/api/catalog/latest");

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockDramas);
    });

    it("should handle custom pagination", async () => {
      const res = await app.request("/api/catalog/latest?page=1&size=1");

      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/catalog/rank", () => {
    it("should return ranked dramas with default type", async () => {
      const res = await app.request("/api/catalog/rank");

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockRankItems);
    });

    it("should handle custom type parameter", async () => {
      const res = await app.request("/api/catalog/rank?type=5");

      expect(res.status).toBe(200);
    });

    it("should reject invalid type parameter", async () => {
      const res = await app.request("/api/catalog/rank?type=0");

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/catalog/channel/:id", () => {
    it("should return channel dramas", async () => {
      const res = await app.request("/api/catalog/channel/205");

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockChannelDramas);
    });

    it("should reject invalid channel ID", async () => {
      const res = await app.request("/api/catalog/channel/abc");

      expect(res.status).toBe(400);
    });

    it("should reject negative channel ID", async () => {
      const res = await app.request("/api/catalog/channel/-1");

      expect(res.status).toBe(400);
    });

    it("should handle pagination for channel dramas", async () => {
      const res = await app.request("/api/catalog/channel/205?page=2&size=15");

      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/catalog/indo", () => {
    it("should return Indonesian dubbed dramas", async () => {
      const res = await app.request("/api/catalog/indo");

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockDramas);
    });

    it("should handle pagination", async () => {
      const res = await app.request("/api/catalog/indo?page=3&size=25");

      expect(res.status).toBe(200);
    });
  });

  describe("Response Format", () => {
    it("should return consistent response format across all endpoints", async () => {
      const endpoints = [
        "/api/catalog/featured",
        "/api/catalog/latest",
        "/api/catalog/rank",
        "/api/catalog/channel/205",
        "/api/catalog/indo",
      ];

      for (const endpoint of endpoints) {
        const res = await app.request(endpoint);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data).toHaveProperty("success");
        expect(data).toHaveProperty("data");
        expect(data.success).toBe(true);
      }
    });
  });
});
