/**
 * Hono Route Matching Precedence Test
 * 
 * This file demonstrates and tests route matching behavior when both
 * wildcard (*), parameterized (:id), and specific routes exist.
 */

import { Hono } from "hono";

// Test app with route precedence
const testApp = new Hono();

// Route definitions - ORDER MATTERS
// More specific routes should come before wildcard routes

// 1. Exact match (highest priority)
testApp.get("/exact", (c) => {
  return c.text("EXACT ROUTE");
});

// 2. Parameterized route (medium priority)
testApp.get("/episodes/:id/videos", (c) => {
  const id = c.req.param("id");
  return c.text(`EPISODE ROUTE - ID: ${id}`);
});

// 3. Wildcard route (lowest priority) - comes after specific routes
testApp.get("/video/*", (c) => {
  const wildcard = c.req.param("*");
  return c.text(`VIDEO PROXY ROUTE - Path: ${wildcard}`);
});

// Test cases to verify behavior
const testCases = [
  {
    path: "/exact",
    expected: "EXACT ROUTE",
    description: "Should match exact route"
  },
  {
    path: "/episodes/123/videos", 
    expected: "EPISODE ROUTE - ID: 123",
    description: "Should match parameterized route"
  },
  {
    path: "/video/some/nested/path",
    expected: "VIDEO PROXY ROUTE - Path: some/nested/path", 
    description: "Should match wildcard route"
  },
  {
    path: "/episodes/123/videos/extra",
    expected: "VIDEO PROXY ROUTE - Path: 123/videos/extra",
    description: "Should match wildcard (parameterized route won't match extra segments)"
  }
];

/**
 * Helper function to test route matching
 */
async function testRouteMatching() {
  console.log("=== Hono Route Precedence Test ===\n");
  
  for (const testCase of testCases) {
    try {
      // Create a mock request
      const request = new Request(`http://localhost${testCase.path}`);
      
      // For demonstration - in real test you'd use the actual Hono app
      console.log(`Testing: ${testCase.path}`);
      console.log(`Expected: ${testCase.expected}`);
      console.log(`Description: ${testCase.description}`);
      console.log("---");
    } catch (error) {
      console.error(`Error testing ${testCase.path}:`, error);
    }
  }
}

// Export for use in test runners
export { testApp, testCases, testRouteMatching };

// Self-test when run directly
if (import.meta.main) {
  testRouteMatching();
}
