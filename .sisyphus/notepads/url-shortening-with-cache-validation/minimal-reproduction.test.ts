/**
 * Minimal Reproduction Test for Hono Route Matching
 * 
 * This is the smallest possible test to demonstrate route precedence behavior.
 * Can be run with `bun run minimal-reproduction.test.ts`
 */

import { Hono } from "hono";

// Create minimal test app
const app = new Hono();

// Route definitions - ORDER IS CRITICAL for precedence
app.get("/episodes/:id/videos", (c) => {
  const id = c.req.param("id");
  return c.json({
    route: "episode-specific",
    episodeId: id,
    matched: true
  });
});

app.get("/video/*", (c) => {
  const wildcard = c.req.param("*");
  return c.json({
    route: "video-proxy",
    wildcardPath: wildcard,
    matched: true
  });
});

// Test runner
async function runTests() {
  console.log("=== Hono Route Matching Minimal Reproduction ===\n");
  
  const testCases = [
    {
      path: "/episodes/123/videos",
      expected: "episode-specific",
      description: "Should match parameterized route"
    },
    {
      path: "/video/some/path",
      expected: "video-proxy", 
      description: "Should match wildcard route"
    },
    {
      path: "/episodes/123/videos/extra",
      expected: "video-proxy",
      description: "Should match wildcard (extra segments)"
    }
  ];

  for (const testCase of testCases) {
    try {
      const response = await app.request(testCase.path);
      const data = await response.json();
      
      console.log(`Test: ${testCase.path}`);
      console.log(`  Expected: ${testCase.expected}`);
      console.log(`  Actual: ${data.route}`);
      console.log(`  Status: ${response.status}`);
      console.log(`  ✓ ${data.route === testCase.expected ? 'PASS' : 'FAIL'}`);
      console.log(`  Description: ${testCase.description}\n`);
    } catch (error) {
      console.error(`Error testing ${testCase.path}:`, error);
    }
  }
}

// Export for use in other test suites
export { app, runTests };

// Run tests if this file is executed directly
if (import.meta.main) {
  runTests();
}
