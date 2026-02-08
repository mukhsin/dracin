/**
 * Hono Route Matching Behavior Test
 * 
 * This test reproduces the actual route matching behavior to verify
 * precedence between wildcard (*), parameterized (:id), and specific routes.
 */

import { Hono } from "hono";
import { expect, test, describe } from "bun:test";

// Create test app that replicates current project's route structure
const testApp = new Hono();

// Replicate current project routes with same mounting pattern
const videoRoutes = new Hono();
const videoProxyRoutes = new Hono();

// 1. Specific parameter route (as found in videos.ts)
videoRoutes.get(
  "/episodes/:id/videos",
  (c) => {
    const id = c.req.param("id");
    return c.json({
      route: "episode-specific",
      episodeId: id,
      matched: true
    });
  }
);

// 2. Wildcard route (as found in video-proxy.ts)  
videoProxyRoutes.get("/video/*", (c) => {
  const wildcard = c.req.param("*");
  return c.json({
    route: "video-proxy", 
    wildcardPath: wildcard,
    matched: true
  });
});

// Mount routes same as in app.ts - this is where precedence matters
testApp.route("/api", videoRoutes);
testApp.route("/api", videoProxyRoutes);

describe("Hono Route Matching Precedence", () => {
  test("Exact match should take highest priority", async () => {
    // Test exact match
    const exactApp = new Hono();
    exactApp.get("/exact", (c) => c.text("exact"));
    
    const exactResponse = await exactApp.request("/exact");
    const exactData = await exactResponse.json();
    
    // Verify exact route matches
    expect(exactResponse.status).toBe(200);
    expect(exactData.route).toBe("exact");
  });

  test("Parameterized route should match specific pattern", async () => {
    // Test /episodes/:id/videos pattern
    const response = await testApp.request("/api/episodes/123/videos");
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.route).toBe("episode-specific");
    expect(data.episodeId).toBe("123");
  });

  test("Wildcard route should catch remaining paths", async () => {
    // Test /video/* pattern
    const response = await testApp.request("/api/video/some/nested/path/here");
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.route).toBe("video-proxy");
    expect(data.wildcardPath).toBe("some/nested/path/here");
  });

  test("Parameterized route should not match extra segments", async () => {
    // This should NOT match /episodes/:id/videos because of extra path
    const response = await testApp.request("/api/episodes/123/videos/extra/segments");
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.route).toBe("video-proxy");
    expect(data.wildcardPath).toBe("123/videos/extra/segments");
  });

  test("Non-matching paths should return 404", async () => {
    const response = await testApp.request("/api/unknown/path");
    const data = await response.json();
    
    expect(response.status).toBe(404);
  });

  test("Route order test - verify specific routes are defined first", () => {
    // This test verifies the current project's route definition order
    // In app.ts: videoRoutes comes before videoProxyRoutes
    
    const appRoutes = testApp.routes;
    
    // Find routes and verify their definition order
    const episodeRoute = appRoutes.find(r => r.path.includes("/episodes"));
    const videoRoute = appRoutes.find(r => r.path.includes("/video"));
    
    // Episode route should be defined before video route in the list
    const episodeIndex = appRoutes.indexOf(episodeRoute!);
    const videoIndex = appRoutes.indexOf(videoRoute!);
    
    expect(episodeIndex).toBeLessThan(videoIndex);
  });
});

describe("Edge Cases", () => {
  test("Nested parameterized routes", async () => {
    // Test case: what if we have /video/:id/episodes/* vs /video/*
    const nestedApp = new Hono();
    
    nestedApp.get("/video/:id/episodes/*", (c) => {
      const id = c.req.param("id");
      const wildcard = c.req.param("*");
      return c.json({ route: "nested", id, wildcard });
    });
    
    nestedApp.get("/video/*", (c) => {
      const wildcard = c.req.param("*");
      return c.json({ route: "wildcard", wildcard });
    });
    
    // More specific nested route should take precedence
    const response1 = await nestedApp.request("/video/123/episodes/some/ep");
    expect(response1.status).toBe(200);
    const data1 = await response1.json();
    expect(data1.route).toBe("nested");
    
    // Wildcard should catch everything else
    const response2 = await nestedApp.request("/video/some/other/path");
    expect(response2.status).toBe(200);
    const data2 = await response2.json();
    expect(data2.route).toBe("wildcard");
  });

  test("Method precedence", async () => {
    const methodApp = new Hono();
    
    methodApp.get("/api/test", (c) => c.json({ method: "GET" }));
    methodApp.post("/api/test", (c) => c.json({ method: "POST" }));
    
    const getResponse = await methodApp.request("/api/test", { method: "GET" });
    const postData = await getResponse.json();
    expect(postData.method).toBe("GET");
  });
});

// Helper function to run tests
export async function runRouteTests() {
  console.log("Running Hono route matching tests...");
  
  // Note: In a real test environment, Bun's test runner would execute these
  // This is a demonstration of the test structure
  return {
    testCases: [
      { path: "/api/episodes/123/videos", expectedRoute: "episode-specific" },
      { path: "/api/video/test/path", expectedRoute: "video-proxy" },
      { path: "/api/episodes/123/videos/extra", expectedRoute: "video-proxy" }
    ]
  };
}

// Self-test when run directly
if (import.meta.main) {
  runRouteTests().then((results) => {
    console.log("Test results prepared:", results);
  });
}
