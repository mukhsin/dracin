# Cache Video URLs with Validation & Fire-and-Forget Strategy

## TL;DR

When a user visits `/dramas/:slug`, validate stored video URLs in real-time. If URLs are stale, fetch fresh ones from API-Proxy and return immediately while saving to DB in parallel (fire-and-forget).

**Key Changes:**

1. **Trigger:** `/dramas/:slug` endpoint (not individual episode videos)
2. **Validation:** HEAD request to check if URLs are accessible (not just empty check)
3. **Response:** Return immediately to user (fire)
4. **Update:** Save to DB asynchronously (forget) - API-Proxy returns ALL episodes, update by `bookId` + `index`

**Estimated Effort:** Medium (30-45 minutes)
**Parallel Execution:** NO - single sequential task

---

## Context

### Current Behavior

1. User visits `/dramas/:slug`
2. API fetches drama + episodes from DB
3. Episodes have `videoUrls` (may be stale/invalid)
4. API returns drama with potentially broken video URLs
5. User clicks episode → discovers video is broken ❌

### Desired Behavior

1. User visits `/dramas/:slug`
2. API fetches drama with `bookId` from DB
3. **Validation Phase:**
   - Get first episode's URL from DB
   - Send HEAD request to validate URL is accessible
   - If valid → return cached data immediately ✅
   - If invalid/stale → proceed to fetch
4. **Fetch Phase** (if needed):
   - Call API-Proxy with `bookId` to get ALL episodes
   - Return fresh data to user immediately (fire) ✅
   - Save ALL episodes to DB asynchronously (forget) ✅

### Data Flow

```
User → GET /dramas/:slug
           ↓
    Get drama (with bookId) from DB
           ↓
    Get first episode's URL from DB
           ↓
    HEAD request to validate URL
           ↓
    ┌─────────────────┬─────────────────┐
    ↓                 ↓                 ↓
 Valid (200)      Invalid (4xx)     Empty/Null
    ↓                 ↓                 ↓
 Return from     Fetch from API-   Fetch from API-
 DB cache        Proxy             Proxy
                   ↓                 ↓
              Return to user    Return to user
                   ↓                 ↓
              ┌────┴────┐       ┌────┴────┐
              ↓         ↓       ↓         ↓
         Fire-and-forget   Fire-and-forget
         (async DB update) (async DB update)
```

---

## Work Objectives

### Core Objective

Implement proactive video URL validation at the drama detail level with fire-and-forget caching strategy to ensure users never see broken video URLs.

### Concrete Deliverables

1. **Modified** `apps/api/src/routes/dramas.ts` - Add URL validation logic
2. **New function** `validateVideoUrl(url: string): Promise<boolean>` - HEAD request validator
3. **New function** `fetchAndCacheEpisodes(bookId: string)` - Fire-and-forget updater
4. **Modified** drama service - Batch update episodes by `bookId` + `index`

### Definition of Done

- [x] Visiting `/dramas/:slug` validates at least one video URL via HEAD request
- [x] Valid URLs (HTTP 200) return cached data immediately
- [x] Invalid URLs trigger API-Proxy fetch and return fresh data
- [x] Response returns BEFORE DB update completes (fire-and-forget)
- [x] DB update saves ALL episodes from API-Proxy response
- [x] Episodes updated by matching `bookId` + `index` (episode number)
- [x] Logs show validation results and cache operations

---

## Execution Strategy

### Task 1: Add Video URL Validation & Fire-and-Forget Caching

**What to do:**

1. **Create URL validator function** (new file or in drama service):

```typescript
// apps/api/src/lib/url-validator.ts
export async function validateVideoUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      // Don't follow redirects for validation - just check if URL is reachable
      redirect: "manual",
    });

    clearTimeout(timeoutId);

    // Consider 2xx and 3xx (redirects) as valid
    return response.ok || (response.status >= 300 && response.status < 400);
  } catch (error) {
    console.log(`[URLValidator] URL validation failed for ${url}:`, error);
    return false;
  }
}
```

2. **Modify drama service** to add batch update method:

```typescript
// In apps/api/src/services/drama.service.ts

import { validateVideoUrl } from "../lib/url-validator.js";
import { getEpisodes } from "./api-proxy.service.js";

export interface DramaWithValidation extends DramaWithEpisodes {
  source: "cache" | "fresh";
}

/**
 * Get drama by slug with validated episode URLs
 * Fire-and-forget pattern: returns immediately, updates DB async
 */
async getBySlugWithValidation(slug: string): Promise<DramaWithValidation | null> {
  // Get drama with episodes from DB
  const drama = await this.getBySlug(slug);

  if (!drama) {
    return null;
  }

  // Check if we have episodes with URLs to validate
  const episodesWithUrls = drama.episodes.filter(
    ep => ep.videoUrls && Object.keys(ep.videoUrls).length > 0
  );

  // If no URLs cached or no bookId, need to fetch
  if (episodesWithUrls.length === 0 || !drama.bookId) {
    if (drama.bookId) {
      // Fire-and-forget: fetch and cache async
      this.fetchAndCacheEpisodes(drama.bookId.toString());
    }
    return { ...drama, source: "fresh" };
  }

  // Validate first episode's URL (pick highest quality available)
  const firstEpisode = episodesWithUrls[0];
  const qualities = ["1080p", "720p", "480p", "360p", "240p"] as const;
  const urlToValidate = qualities
    .map(q => firstEpisode.videoUrls?.[q])
    .find(url => url !== undefined);

  if (!urlToValidate) {
    // No valid URL found, need to fetch
    if (drama.bookId) {
      this.fetchAndCacheEpisodes(drama.bookId.toString());
    }
    return { ...drama, source: "fresh" };
  }

  // Validate the URL
  const isValid = await validateVideoUrl(urlToValidate);

  if (isValid) {
    console.log(`[DramaService] Cache valid for drama ${drama.slug}, episode ${firstEpisode.number}`);
    return { ...drama, source: "cache" };
  }

  // URL is stale, fetch fresh data
  console.log(`[DramaService] Cache stale for drama ${drama.slug}, fetching fresh`);

  if (drama.bookId) {
    // Fire-and-forget: Don't await this!
    this.fetchAndCacheEpisodes(drama.bookId.toString());
  }

  // Return fresh data immediately
  const freshEpisodes = await getEpisodes(drama.bookId.toString());

  if (freshEpisodes.success) {
    // Transform API-Proxy episodes to match DB structure
    const transformedEpisodes: Episode[] = freshEpisodes.data.episodes.map(ep => ({
      ...this.findEpisodeByNumber(drama.episodes, ep.index),
      videoUrls: ep.url ? this.transformApiProxyUrlToVideoUrls(ep.url) : {},
      number: ep.index,
      title: ep.title,
    }));

    return {
      ...drama,
      episodes: transformedEpisodes,
      source: "fresh",
    };
  }

  // Fallback to cached data even if stale
  return { ...drama, source: "cache" };
}

/**
 * Fire-and-forget: Fetch from API-Proxy and cache to DB
 * This runs asynchronously - DO NOT await in main flow
 */
private async fetchAndCacheEpisodes(bookId: string): Promise<void> {
  try {
    console.log(`[DramaService] Fire-and-forget: Fetching episodes for bookId ${bookId}`);

    const result = await getEpisodes(bookId);

    if (!result.success) {
      console.error(`[DramaService] Failed to fetch episodes for bookId ${bookId}`);
      return;
    }

    // Get drama ID from DB using bookId
    const [drama] = await db
      .select({ id: dramas.id })
      .from(dramas)
      .where(eq(dramas.bookId, BigInt(bookId)));

    if (!drama) {
      console.error(`[DramaService] Drama not found for bookId ${bookId}`);
      return;
    }

    // Batch update ALL episodes
    const updatePromises = result.data.episodes.map(async (apiEpisode) => {
      const videoUrls = apiEpisode.url
        ? this.transformApiProxyUrlToVideoUrls(apiEpisode.url)
        : {};

      // Update by dramaId + number (index from API-Proxy)
      await db
        .update(episodes)
        .set({
          videoUrls,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(episodes.dramaId, drama.id),
            eq(episodes.number, apiEpisode.index)
          )
        );
    });

    await Promise.all(updatePromises);

    console.log(`[DramaService] Fire-and-forget: Cached ${result.data.episodes.length} episodes for bookId ${bookId}`);
  } catch (error) {
    console.error(`[DramaService] Fire-and-forget error for bookId ${bookId}:`, error);
    // Silent fail - don't throw, this is background work
  }
}

/**
 * Transform single API-Proxy URL to quality-mapped object
 */
private transformApiProxyUrlToVideoUrls(url: string): Partial<Record<string, string>> {
  const videoUrls: Partial<Record<string, string>> = {};

  // Try to detect quality from URL pattern
  const qualityMatch = url.match(/\.(\d+p|4k)\./i);

  if (qualityMatch) {
    const detectedQuality = qualityMatch[1].toLowerCase();
    videoUrls[detectedQuality] = url;
  } else {
    // Default to 1080p if no quality detected
    videoUrls["1080p"] = url;
  }

  return videoUrls;
}

/**
 * Find episode by number from existing list
 */
private findEpisodeByNumber(episodes: Episode[], number: number): Episode | undefined {
  return episodes.find(ep => ep.number === number);
}
```

3. **Update drama routes** to use validation:

```typescript
// In apps/api/src/routes/dramas.ts

app.get("/:slug", zValidator("param", GetDramaParamsSchema), async (c) => {
  const { slug } = c.req.valid("param");

  // Use new validation method
  const drama = await dramaService.getBySlugWithValidation(slug);

  if (!drama) {
    throw new HTTPException(404, {
      message: `Drama with slug "${slug}" not found`,
    });
  }

  c.header("Cache-Control", "public, max-age=60");

  return c.json({
    success: true,
    data: drama,
    meta: {
      source: drama.source, // "cache" or "fresh"
    },
  });
});
```

**Recommended Agent Profile:**

- **Category**: `unspecified-medium`
- **Skills**: ["hono-routing", "drizzle-orm-d1"]
- **Reason**: Requires understanding of async patterns, DB batch updates, and HTTP validation

**Parallelization:**

- **Can Run In Parallel**: NO
- **Sequential**: Single task with multiple components

**References:**

- `apps/api/src/routes/dramas.ts:47-64` - Current drama detail endpoint
- `apps/api/src/services/drama.service.ts:104-123` - Current `getBySlug` method
- `apps/api/src/services/api-proxy.service.ts:277-300` - `getEpisodes` function
- `apps/api/src/db/schema.ts:104-139` - Episodes table schema
- `apps/api/src/routes/videos.ts:190-215` - URL quality detection pattern

**Acceptance Criteria:**

- [x] URL validator function created with HEAD request and 5s timeout
- [x] `getBySlugWithValidation` method added to drama service
- [x] Drama detail route updated to use validation method
- [x] Fire-and-forget pattern implemented (no await on `fetchAndCacheEpisodes`)
- [x] Batch update updates ALL episodes by `bookId` + `index` (episode number)
- [x] Response includes `source` field ("cache" or "fresh")
- [x] Logs show: validation result, cache hit/miss, fire-and-forget completion

**Agent-Executed QA Scenario:**

```
Scenario 1: Valid cached URLs return immediately
  Tool: Bash (curl)
  Preconditions:
    - Drama exists with bookId and valid videoUrls
  Steps:
    1. curl http://localhost:3001/api/dramas/test-drama
    2. Assert: Response includes meta.source: "cache"
    3. Assert: Response time < 100ms (no API-Proxy call)
    4. Check logs: Should see "Cache valid for drama"
  Expected Result: Fast response from cache
  Evidence: Response time and source field

Scenario 2: Stale URLs trigger fetch and fire-and-forget
  Tool: Bash (curl)
  Preconditions:
    - Drama exists with invalid/expired videoUrls
  Steps:
    1. curl http://localhost:3001/api/dramas/test-drama
    2. Assert: Response includes meta.source: "fresh"
    3. Assert: Response returned within 2 seconds (API-Proxy fetch)
    4. Check logs: Should see "Cache stale", "Fire-and-forget: Fetching"
    5. Wait 3 seconds
    6. Check logs: Should see "Fire-and-forget: Cached X episodes"
  Expected Result: Fresh data returned, DB updated in background
  Evidence: Response source field, log messages

Scenario 3: Batch update saves all episodes
  Tool: Bash (curl) + DB query
  Preconditions:
    - Drama with bookId has multiple episodes
  Steps:
    1. Clear videoUrls for all episodes of drama: UPDATE episodes SET video_urls = '{}' WHERE drama_id = '...'
    2. curl http://localhost:3001/api/dramas/test-drama
    3. Wait 5 seconds for fire-and-forget
    4. Query DB: SELECT number, video_urls FROM episodes WHERE drama_id = '...'
    5. Assert: All episodes have non-empty video_urls
  Expected Result: All episodes updated with fresh URLs
  Evidence: DB query results
```

**Commit**: YES

- Message: `feat(api): add video URL validation with fire-and-forget caching`
- Files:
  - `apps/api/src/lib/url-validator.ts` (new)
  - `apps/api/src/services/drama.service.ts`
  - `apps/api/src/routes/dramas.ts`

---

## Implementation Details

### URL Validation Strategy

**Why HEAD request?**

- Faster than GET (no body download)
- Checks if URL is accessible
- 5-second timeout prevents hanging
- Accepts 2xx and 3xx (redirects) as valid

**Which URL to validate?**

- Pick first episode with any URL
- Use highest quality available (1080p → 720p → ...)
- If one URL is valid, assume all are (same CDN/source)

### Fire-and-Forget Pattern

**Why fire-and-forget?**

- User gets response immediately (better UX)
- DB update happens in background (non-blocking)
- Even if DB update fails, user has fresh data

**Implementation:**

```typescript
// DON'T await - let it run in background
this.fetchAndCacheEpisodes(bookId); // No await!

return freshDataToUser; // Immediate response
```

### Batch Update Logic

**API-Proxy returns:**

```json
{
  "episodes": [
    { "index": 1, "title": "Ep 1", "url": "..." },
    { "index": 2, "title": "Ep 2", "url": "..." },
    ...
  ]
}
```

**Update by:**

- `bookId` → lookup `drama.id`
- `index` (API-Proxy) → `number` (DB episode number)
- Update `videoUrls` JSONB field

**Why not single update?**

- Each episode is a separate row
- Need to match by `dramaId` + `number`
- Use `Promise.all()` for parallel updates

### Error Handling

**Validation errors:**

- Timeout → treat as invalid → fetch fresh
- Network error → treat as invalid → fetch fresh
- Never fail the request due to validation

**Fire-and-forget errors:**

- Log error
- Silent fail (don't throw)
- User already has response, DB update is bonus

---

## Success Criteria

### Verification Commands

```bash
# 1. Test cache hit (fast response)
curl -w "@curl-format.txt" http://localhost:3001/api/dramas/valid-drama
# Expected: Response time < 100ms, meta.source: "cache"

# 2. Test cache miss (fetch from API-Proxy)
curl -w "@curl-format.txt" http://localhost:3001/api/dramas/stale-drama
# Expected: Response time 1-2s, meta.source: "fresh"

# 3. Check logs for fire-and-forget
tail -f apps/api/logs/app.log | grep -E "(Fire-and-forget|Cache valid|Cache stale)"
```

### Final Checklist

- [x] URL validator with HEAD request and timeout
- [x] Drama service has `getBySlugWithValidation` method
- [x] Fire-and-forget pattern (no await on DB update)
- [x] Batch update all episodes by `bookId` + `index`
- [x] Response includes `meta.source` field
- [x] Logs show validation and caching operations
- [x] No TypeScript errors
- [x] All QA scenarios pass

---

## Notes for Executor

**Critical:** The fire-and-forget pattern means:

1. Call `fetchAndCacheEpisodes()` WITHOUT await
2. Return response to user immediately
3. DB update happens in background

**Testing tip:** Use ` Promise.all()` for batch updates but wrap individual updates in try-catch so one failure doesn't break all updates.

**Performance:** HEAD request validation adds ~50-200ms for cache hits, but prevents broken videos. Cache misses are slower (API-Proxy call) but user gets fresh data.

**Edge cases:**

- No bookId → can't fetch, return cached data
- API-Proxy failure → return cached data even if stale
- All episodes empty → fetch all from API-Proxy
