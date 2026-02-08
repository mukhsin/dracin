# Hono Route Matching Precedence Research

## Research Objective
Determine how Hono matches routes when both `/:path*` (wildcard) and `/:dramaId/:episodeKey` (specific parameter) patterns exist under the same mount point.

## Current Project Analysis

### Existing Route Patterns Found

1. **Wildcard Route** (video-proxy.ts):
   ```typescript
   app.get("/video/*", async (c) => {
     // Handles any path starting with /video/
   });
   ```
   - Route: `/video/*`
   - Location: `/apps/api/src/routes/video-proxy.ts:42`
   - Function: Video proxy that forwards requests to external video service

2. **Specific Parameter Route** (videos.ts):
   ```typescript
   app.get(
     "/episodes/:id/videos",
     zValidator("param", episodeIdSchema),
     async (c) => {
       // Handles specific episode video requests
     }
   );
   ```
   - Route: `/episodes/:id/videos`
   - Location: `/apps/api/src/routes/videos.ts:69`
   - Function: Get video URLs for specific episodes with fallback support

3. **Route Mounting** (app.ts):
   ```typescript
   app.route("/api", videoRoutes);           // Mounts at /api/episodes/:id/videos
   app.route("/api", videoProxyRoutes);      // Mounts at /api/video/*
   ```

## Key Findings

### Route Matching Precedence
Based on Hono's routing behavior and standard web framework patterns:

1. **More specific routes take precedence over wildcard routes**
2. **Exact matches beat parameterized matches**
3. **Parameterized matches beat wildcard matches**

### Expected Behavior
When both routes exist under `/api` mount:
- `/api/episodes/123/videos` → Matches `/episodes/:id/videos` (specific)
- `/api/video/some/long/path` → Matches `/video/*` (wildcard)

## Recommended Safest Patterns

### Option 1: Route Ordering (Recommended)
Define more specific routes BEFORE wildcard routes:

```typescript
// app.ts - Ensure specific routes come first
app.route("/api", videoRoutes);           // More specific
app.route("/api", videoProxyRoutes);      // Wildcard (comes after)
```

### Option 2: Separate Route Files (Best Practice)
```typescript
// routes/video-specific.ts (for /episodes/:id/videos)
// routes/video-proxy.ts    (for /video/*)
// routes/video.ts         (main video router that imports both)
```

### Option 3: Path Prefix Separation
```typescript
// Use different base paths
app.route("/api/episodes", episodeRoutes);    // /api/episodes/:id/videos
app.route("/api/media", videoProxyRoutes);   // /api/media/*
```

## Verification Strategy

### Minimal Reproduction Test
Create a test file to verify route matching:

```typescript
// test-route-precedence.ts
const testApp = new Hono();

// More specific route (must come first)
testApp.get("/episodes/:id/videos", (c) => {
  return c.text("specific episode route");
});

// Wildcard route (comes after)
testApp.get("/video/*", (c) => {
  return c.text("video proxy route");
});

// Test cases:
// - /episodes/123/videos → should hit specific route
// - /video/some/path → should hit wildcard route
// - /episodes/123/videos/extra → should hit wildcard route (if not caught by 404)
```

## Production Considerations

### Current Project Status
- **No conflicts detected** - Different base paths (`/episodes/` vs `/video/`)
- **Safe separation** - Routes handle different concerns
- **No immediate action required**

### Potential Future Conflicts
If planning new routes like `/video/dramaId/episodeKey`:
1. **Order matters** - Define specific routes first
2. **Path separation** - Use distinct prefixes when possible
3. **Testing required** - Verify route matching with actual requests

## Conclusion

Hono follows standard web framework routing precedence:
1. **Exact matches** (highest priority)
2. **Parameterized matches** (medium priority) 
3. **Wildcard matches** (lowest priority)

**Recommendation**: Keep current structure as-is. If adding new conflicting routes, ensure specific routes are defined before wildcard routes in the route definition order.

---

*Research Date: February 8, 2026*
*Researcher: AI Assistant*
*Context: Drama streaming app with Hono API*
