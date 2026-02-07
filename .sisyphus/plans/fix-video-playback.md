# Fix Video Playback - Circuit Breaker & Fallback Issue

## TL;DR

The video playback is failing because:

1. The `fallbackProxyMiddleware` is trying to proxy requests to API-Proxy at the wrong endpoint
2. API-Proxy doesn't have `/api/episodes/:id/videos` - it only has `/drama/episodes/:bookId`
3. The route handler already has proper fallback logic using `getEpisodes()` service

**Fix:** Remove the `fallbackProxyMiddleware` from video routes and let the route handler manage fallback via the API-Proxy service.

**Estimated Effort:** Quick (10-15 minutes)
**Parallel Execution:** NO - single sequential task

---

## Context

### Current Problem

The error logs show:

```
[FallbackService] Circuit OPEN - skipping primary for /api/episodes/a2b9d584-671b-4b24-8854-1a94b72c3a8e/videos
[FallbackService] Attempting fallback: http://localhost:3002/api/episodes/a2b9d584-671b-4b24-8854-1a94b72c3a8e/videos
[FallbackService] Fallback also failed: HTTP 404: Not Found
```

### Root Cause Analysis

1. **`videos.ts` applies `fallbackProxyMiddleware`** to `/episodes/:id/videos` endpoint
2. **When the route handler fails**, the middleware tries to proxy to API-Proxy at the same URL path
3. **API-Proxy doesn't have this endpoint** - it only has `/drama/episodes/:bookId` (see `apps/api-proxy/index.js` line 203)
4. **The route handler already has proper fallback logic** - it calls `getEpisodes()` service method which correctly calls `/drama/episodes/:bookId`

### What Should Happen

1. Request comes to `GET /api/episodes/:id/videos`
2. Route handler queries database for episode by UUID
3. If `videoUrls` is empty/stale AND `bookId` exists:
   - Call `getEpisodes(bookId)` which fetches from API-Proxy at `/drama/episodes/:bookId`
   - Transform and return video URLs
4. If that fails too, return empty/error response

---

## Work Objectives

### Core Objective

Fix video playback by removing the incorrect fallback proxy middleware and ensuring the route handler properly fetches videos from the database or API-Proxy.

### Concrete Deliverables

- Modified `apps/api/src/routes/videos.ts` - remove fallbackProxyMiddleware usage
- Reset circuit breaker to clear failure state
- Test video playback works

### Definition of Done

- [x] Video endpoint returns 200 with video URLs (not 503)
- [x] Circuit breaker shows CLOSED state
- [x] Can play videos in the browser

---

## Execution Strategy

### Task 1: Fix Video Routes - Remove Incorrect Fallback Middleware

**What to do:**

1. Open `apps/api/src/routes/videos.ts`
2. Remove the `fallbackProxyMiddleware` import and its usage
3. Remove the entire `app.use()` block that applies the middleware (lines 54-63)
4. Keep the route handler logic intact - it already handles fallback properly via `getEpisodes()`

**Code to remove:**

```typescript
// Remove this import:
import { fallbackProxyMiddleware, ... } from "../middleware/fallback.js";

// Remove this block:
app.use(
  "/episodes/:id/videos",
  fallbackProxyMiddleware({
    paths: ["/api/episodes/*/videos"],
    enableCache: true,
    cacheTtlMs: 30000,
  }),
);
```

**Recommended Agent Profile:**

- **Category**: `quick`
- **Skills**: []
- **Reason**: Simple file edit - remove middleware usage

**Parallelization:**

- **Can Run In Parallel**: NO
- **Sequential**: This is the only task

**References:**

- `apps/api/src/routes/videos.ts:54-63` - Middleware usage to remove
- `apps/api/src/routes/videos.ts:1-13` - Import statements
- `apps/api-proxy/index.js:203` - API-Proxy endpoint structure (`/drama/episodes/:bookId`)

**Acceptance Criteria:**

- [x] `fallbackProxyMiddleware` import removed
- [x] `app.use(fallbackProxyMiddleware(...))` block removed
- [x] Route handler `app.get("/episodes/:id/videos", ...)` still exists and works

**Agent-Executed QA Scenario:**

```
Scenario: Video route file compiles without middleware
  Tool: Bash
  Steps:
    1. cd /Users/mukhsin/Code/sandbox/bun-dracin/apps/api
    2. bun run typecheck
  Expected Result: No TypeScript errors in videos.ts
  Evidence: TypeScript output shows no errors for videos.ts
```

**Commit**: YES

- Message: `fix(api): remove incorrect fallback proxy middleware from video routes`
- Files: `apps/api/src/routes/videos.ts`

---

### Task 2: Reset Circuit Breaker State

**What to do:**
Since the circuit breaker is currently OPEN due to previous failures, we need to reset it:

1. Stop the dev server (Ctrl+C)
2. Restart to get fresh circuit breaker state
3. OR call the admin endpoint to clear state: `POST /api/admin/fallback/clear-cache`

**Recommended Agent Profile:**

- **Category**: `quick`
- **Skills**: []

**Acceptance Criteria:**

- [x] Dev server restarted OR cache cleared via admin endpoint

---

### Task 3: Test Video Playback

**What to do:**
Test that videos can now play:

1. Make request to video endpoint:

   ```bash
   curl http://localhost:3001/api/episodes/a2b9d584-671b-4b24-8854-1a94b72c3a8e/videos
   ```

2. Verify response:
   - Should return 200 (not 503)
   - Should have `success: true`
   - Should have `data.videoUrls` with actual URLs

3. Check circuit breaker status:

   ```bash
   curl http://localhost:3001/api/admin/fallback/status
   ```

   - Should show `state: "CLOSED"`

4. Test in browser - navigate to a drama and try playing an episode

**Recommended Agent Profile:**

- **Category**: `quick`
- **Skills**: []

**Acceptance Criteria:**

- [x] Video endpoint returns 200 with video URLs
- [x] Circuit breaker status shows CLOSED
- [x] Videos play in browser

**Agent-Executed QA Scenarios:**

```
Scenario: Video endpoint returns video URLs
  Tool: Bash (curl)
  Preconditions: API server running on localhost:3001
  Steps:
    1. curl -s http://localhost:3001/api/episodes/a2b9d584-671b-4b24-8854-1a94b72c3a8e/videos
    2. Assert: HTTP status is 200
    3. Assert: JSON response has success: true
    4. Assert: response.data.videoUrls is not empty
  Expected Result: Returns video URLs successfully
  Evidence: curl output captured

Scenario: Circuit breaker is in CLOSED state
  Tool: Bash (curl)
  Preconditions: API server running
  Steps:
    1. curl -s http://localhost:3001/api/admin/fallback/status
    2. Assert: response.data.circuitBreaker.state equals "CLOSED"
  Expected Result: Circuit breaker is healthy
  Evidence: curl output captured
```

---

## Additional Considerations

### Why This Fix Works

The route handler at `videos.ts:69-182` already has proper logic:

1. Queries database for episode by UUID
2. If `videoUrls` is empty and `bookId` exists:
   - Calls `getEpisodes(bookId)` service method
   - This service correctly calls API-Proxy at `/drama/episodes/:bookId`
   - Transforms response and returns video URLs
3. Returns response with proper source attribution

The `fallbackProxyMiddleware` was incorrectly trying to proxy the entire HTTP request to a non-existent endpoint on API-Proxy.

### Alternative Solutions (NOT Recommended)

1. **Add the endpoint to API-Proxy**: Would require modifying Express server, unnecessary complexity
2. **Fix the middleware path mapping**: Would require complex URL transformation logic, overkill for this use case
3. **Keep middleware but change paths**: Still incorrect - the route handler already handles fallback properly

---

## Success Criteria

### Verification Commands

```bash
# Test video endpoint
curl http://localhost:3001/api/episodes/a2b9d584-671b-4b24-8854-1a94b72c3a8e/videos

# Check circuit breaker
curl http://localhost:3001/api/admin/fallback/status

# Check logs for no 503 errors
```

### Final Checklist

- [x] `fallbackProxyMiddleware` removed from videos.ts
- [x] No TypeScript errors
- [x] Video endpoint returns 200 with video URLs
- [x] Circuit breaker shows CLOSED state
- [x] Videos play successfully in browser
- [x] No more "Circuit OPEN" errors in logs

---

## Notes for Executor

**Critical:** The route handler logic in `videos.ts` is CORRECT. Do not modify it. Only remove the middleware application (the `app.use()` block) and its import.

The handler already calls `getEpisodes()` from the API-Proxy service when video URLs are stale. This is the proper way to fallback - via the service layer, not via HTTP proxy middleware.
