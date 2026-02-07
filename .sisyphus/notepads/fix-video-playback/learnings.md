# Fix Video Playback - Implementation Notes

## Changes Made

### 1. Removed Incorrect Fallback Middleware (videos.ts)

**File:** `apps/api/src/routes/videos.ts`

**Removed:**

- Import of `fallbackProxyMiddleware` from middleware/fallback.js
- The `app.use(fallbackProxyMiddleware(...))` block that was incorrectly trying to proxy to API-Proxy

**Why:** The middleware was trying to proxy HTTP requests to `http://localhost:3002/api/episodes/:id/videos`, but API-Proxy doesn't have this endpoint. It only has `/drama/episodes/:bookId`.

### 2. Added Circuit Breaker Reset Endpoint

**File:** `apps/api/src/routes/videos.ts`

**Added:**

- Import of `resetFallbackService` from middleware
- `createResetRoute()` function that adds `POST /api/admin/fallback/reset`
- Route is registered in `createFallbackAdminRoutes()`

**Why:** Allows resetting the circuit breaker to CLOSED state without restarting the server.

### 3. Exported resetFallbackService (middleware/fallback.ts)

**File:** `apps/api/src/middleware/fallback.ts`

**Added:**

- Import of `resetFallbackService` from lib/fallback.js
- Re-export of `resetFallbackService`

### 4. Added resetCircuitBreaker Helper (lib/fallback.ts)

**File:** `apps/api/src/lib/fallback.ts`

**Added:**

- `resetCircuitBreaker()` function that creates a new FallbackService instance with fresh circuit breaker

## How The Fix Works

The route handler at `videos.ts:68-181` already had proper fallback logic:

1. Query database for episode by UUID
2. Get `bookId` from `episode.drama.bookId`
3. If video URLs are empty/stale:
   - Call `getEpisodes(bookId)` service
   - Service calls API-Proxy at `/drama/episodes/:bookId` ✓
   - Transform response and return video URLs
4. Return response with proper source attribution

The `fallbackProxyMiddleware` was incorrectly trying to proxy the entire HTTP request, bypassing this logic.

## API Constraint Respected

**API-Proxy was NOT modified.** The API adapts to API-Proxy by:

1. Looking up `bookId` from database using `episodeId`
2. Calling API-Proxy's existing `/drama/episodes/:bookId` endpoint

## Testing Commands

```bash
# Reset circuit breaker
curl -X POST http://localhost:3001/api/admin/fallback/reset

# Check circuit breaker status
curl http://localhost:3001/api/admin/fallback/status

# Test video endpoint
curl http://localhost:3001/api/episodes/a2b9d584-671b-4b24-8854-1a94b72c3a8e/videos
```

## Type Check Results

```bash
cd apps/api && bun run typecheck
# Output: $ tsc --noEmit (no errors)
```
