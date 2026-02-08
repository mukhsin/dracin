# Video Proxy Route Analysis - 2026-02-08

## Current Behavior Mapping

### video-proxy.ts Structure

- **Route Pattern**: `GET /video/*` (wildcard match)
- **Mount Location**: `/api/video/*` in app.ts (line 52)
- **Prefix Handling**: Supports both `/api/video/*` and `/video/*`
- **Target**: `https://hwztvideo.dramaboxdb.com`
- **Features**: CORS, range requests, header forwarding, error handling

### Frontend Integration

- **Usage**: `watch.$episodeId.tsx` transforms hwztvideo URLs to `/api/video/*` paths
- **Pattern**: Frontend generates proxy URLs via `proxyVideoUrl()` function
- **Compatibility**: Maintains existing full path transformation

## Route Conflict Analysis

### Hono Precedence Rules

1. **Exact matches** (highest priority)
2. **Parameter matches** (`:param`)
3. **Wildcard matches** (`*`) (lowest priority)

### Proposed Route: `/api/video/:dramaId/:episodeKey`

- **Type**: Parameter match (`:dramaId`, `:episodeKey`)
- **Precedence**: HIGHER than existing wildcard route
- **Conflict Risk**: **NONE** - parameter routes always match first

## Recommendation: EXTEND EXISTING ROUTE FILE

### Implementation Strategy

```typescript
// Add NEW parameter route BEFORE existing wildcard route
app.get("/video/:dramaId/:episodeKey", async (c) => {
  // Handle structured drama/episode paths
  // Parameter validation, DB lookup, proxy to target URL
});

// Keep existing wildcard route UNCHANGED
app.get("/video/*", async (c) => {
  // Continues to handle all other paths
  // No modifications needed
});
```

### Benefits

- ✅ **No Route Conflicts**: Parameter precedence handles automatically
- ✅ **Backward Compatibility**: Existing routes continue working
- ✅ **Clean Separation**: Structured vs wildcard paths handled separately
- ✅ **Minimal Changes**: Only need to add new route, don't modify existing
- ✅ **Follows Hono Patterns**: Consistent with route mounting order

### Verification Commands

```bash
# Test new structured route
curl -I "http://localhost:3001/api/video/drama-id-123/episode-key-456"

# Test existing wildcard route still works
curl -I "http://localhost:3001/api/video/long/path/to/video.mp4"

# Test both simultaneously (should both return 200/206)
curl -I "http://localhost:3001/api/video/drama-id-123/episode-key-456" && \
curl -I "http://localhost:3001/api/video/long/path/to/video.mp4"
```

## Key Technical Notes

### Route Order Matters

- Parameter routes MUST come before wildcard routes
- Hono stops at first match, so order defines precedence
- Existing route at end acts as catch-all for non-matching paths

### CORS Headers

- Both routes share same CORS configuration
- Headers applied consistently via `applyCors()` helper
- Range headers supported for both route types

### Error Handling

- Maintain existing error patterns (404, 502 responses)
- Add route-specific validation for parameter routes
- Keep console logging consistent with existing patterns

## Type Safety Fix (2026-02-08)

- `proxyUpstream` now accepts a typed `Context` to avoid tuple indexing issues from inferring the Hono handler signature.
- The helper response logic keeps CORS/range behavior intact while eliminating `c` undefined warnings.
- Typecheck run at the repo level failed in `@repo/shared` because Bun test globals and Node typings are missing; the API package itself compiled.

- Added `/api/video/:dramaId/:episodeKey` handler in `video-proxy.ts` to leverage structured lookups, reuse `decodeHtmlEntities`/`getHighestQualityUrl`, and fall back on API-Proxy when the DB record lacks the requested quality.
- Mounted `videoProxyRoutes` before the existing `videoRoutes` to maintain precedence and keep the wildcard fallback untouched.

## Video URL Shortening (2026-02-08)

- `GET /api/episodes/:id/videos` now emits proxy URLs that re-target `/api/video/:dramaId/:episodeNumber.<quality>.mp4` using `new URL(c.req.url).origin` so the response never leaks upstream `hwztvideo` hosts.
- Maintained fallback data shape (videoUrls map, qualities array, source flag) while filtering qualities to those with non-empty values before constructing the short paths.
- Shared static quality list ensures consistent ordering and simplifies URL construction when the DB returns sparse variants.
- Run `bun run --filter @repo/api typecheck` to verify the API still compiles with these new helpers.
