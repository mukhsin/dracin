# URL Shortening & Cache Validation

## TL;DR

> **Quick Summary**: Implement unified video URL shortening for frontend plus cache validation at drama detail level. Frontend generates compact URLs (`/api/video/{dramaId}.{episodeNumber}.{quality}.mp4`), proxy looks up episodes in DB by `dramaId`+`number`, and fallback to API-Proxy using `bookId`.
>
> **Deliverables**:
>
> - New API endpoint: `GET /api/dramas/:slug/episodes` - episode list without URLs
> - Modified proxy route: `/api/video/:path*` handles `{dramaId}.{episodeNumber}.{quality}.mp4`
> - Frontend changes: Fetch episode list, generate short URLs
> - Cache validation: Drama detail endpoint validates URLs with HEAD requests, fire-and-forget pattern
>
> **Estimated Effort**: Medium (45-60 min)
> **Parallel Execution**: NO - sequential (backend → frontend → verify)

---

## Context

### Original Request

User wants shorter video URLs in frontend and smart proxy routing:

- Frontend should use: `/api/video/{dramaId}.{episodeNumber}.{quality}.mp4`
- `dramaId` = UUID from dramas table
- `episodeNumber` = episode number (1-indexed)
- `quality` = "1080p", "720p", etc.
- Proxy should map `dramaId.episodeNumber.quality` → look up episode in DB → get URL from `videoUrls[quality]`
- If episode not found, fallback using `dramaId` → `bookId` → API-Proxy

### Existing System

**Current Proxy Route** (`apps/api/src/routes/video-proxy.ts`):

- Pattern: `/api/video/:path*`
- Fetches from: `https://hwztvideo.dramaboxdb.com/${path}`
- No DB lookup - pure path forwarding

**Drama Detail Endpoint** (`apps/api/src/routes/dramas.ts`):

- Returns full drama with episodes and `videoUrls`
- No validation of URL accessibility
- No fire-and-forget caching

**Frontend Watch Page** (`apps/web/src/routes/watch.$episodeId.tsx`):

- Currently uses full proxy transformation: `https://hwztvideo.dramaboxdb.com/...` → `/api/video/...`
- Video URLs include full path with query params

### Research Findings

- **Dramas table** has `id` (UUID), `bookId` (BIGINT for API-Proxy correlation)
- **Episodes table** has `dramaId` (UUID reference), `number` (1-indexed), `videoUrls` (JSONB)
- **Quality mapping**: `"1080p"`, `"720p"`, `"480p"`, `"360p"`, `"240p"`, `"4k"` in `videoUrls` keys
- **API-Proxy service** fetches all episodes by `bookId`, returns: `{ episodes: [{ index, url, title }] }`

---

## Work Objectives

### Core Objective

Implement unified video URL system: frontend uses short compact URLs (`{dramaId}.{episodeNumber}.{quality}.mp4`), proxy intelligently resolves these by looking up episodes in DB or falling back to API-Proxy. Add cache validation at drama detail level with fire-and-forget pattern.

### Concrete Deliverables

1. **Modified** `apps/api/src/routes/dramas.ts` - Add `GET /api/dramas/:slug/episodes` endpoint
2. **Modified** `apps/api/src/routes/video-proxy.ts` - Handle `{dramaId}.{episodeNumber}.{quality}.mp4` format with DB lookup
3. **Modified** `apps/api/src/routes/dramas.ts` - Add URL validation to `/:slug` endpoint (fire-and-forget)
4. **Created** `apps/api/src/lib/url-validator.ts` - HEAD request validator (if not exists)
5. **Modified** `apps/api/src/services/drama.service.ts` - Validation methods and batch update logic
6. **Modified** `apps/web/src/routes/watch.$episodeId.tsx` - Use short URL format with new episodes endpoint
7. **Modified** `apps/web/src/hooks/use-episodes.ts` (or new) - Fetch episode list for generating URLs

### Definition of Done

- [x] New `/api/dramas/:slug/episodes` endpoint returns episode list without URLs
- [x] Proxy route parses `{dramaId}.{episodeNumber}.{quality}.mp4` and resolves via DB lookup
- [x] Proxy fallback: Episode not found → lookup `dramaId` → get `bookId` → fetch from API-Proxy
- [x] Cache validation: Drama detail endpoint validates URLs with HEAD request
- [x] Fire-and-forget: Valid URLs return cached immediately, invalid trigger API-Proxy fetch
- [x] DB updates: All episodes from API-Proxy saved by `bookId` + `number`
- [x] Frontend: Short URLs generated (`/api/video/{uuid}.{number}.{quality}.mp4`)
- [x] No TypeScript errors
- [x] All tests pass

### Must Have

- Short URL format: `/api/video/{dramaId}.{episodeNumber}.{quality}.mp4`
- DB lookup: Episode found by `dramaId` (UUID) + `number`
- URL extraction: `videoUrls[quality]` from matched episode
- Fallback: If episode missing, use `dramaId` → `bookId` → API-Proxy
- Cache validation: HEAD request with 5s timeout on drama detail endpoint
- Fire-and-forget: Response returned immediately, DB update async
- Response fields: `meta.source` indicates "cache" or "fresh"

### Must NOT Have (Guardrails)

- Do NOT modify DB schema (no new columns)
- Do NOT change frontend video player UI/controls
- Do NOT modify existing `/api/video/:path*` proxy logic for full paths (only add pattern support)
- Do NOT add authentication to proxy or validation (public endpoints)
- Do NOT change existing video URL transformation for full hwztvideo URLs (keep for compatibility)
- Do NOT await fire-and-forget DB updates (must be async)

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Create URL validator function
├── Task 2: Add episode list endpoint to dramas routes
└── Task 3: Modify drama service with validation methods

Wave 2 (After Wave 1):
├── Task 4: Modify proxy route to handle short URL format
├── Task 5: Add cache validation to drama detail endpoint
└── Task 6: Add fire-and-forget batch update to drama service

Wave 3 (After Wave 2):
├── Task 7: Create/use-episodes hook (or modify watch page directly)
└── Task 8: Update frontend watch page to use short URLs

Wave 4 (After Wave 3):
├── Task 9: Test short URL format via proxy
├── Task 10: Test cache validation at drama detail
├── Task 11: Test fire-and-forget fallback behavior
└── Task 12: Frontend E2E test with Playwright

Critical Path: Task 1 → Task 2 → Task 4 → Task 5 → Task 9 → Task 12
Parallel Speedup: ~35% faster than sequential
```

### Dependency Matrix

| Task | Depends On   | Blocks                    | Can Parallelize With |
| ---- | ------------ | ------------------------- | -------------------- |
| 1    | None         | 2, 3                      | None (first task)    |
| 2    | 1            | 4                         | 3                    |
| 3    | 1            | 5, 6                      | 2                    |
| 4    | 2            | 7                         | None (needs route)   |
| 5    | 4, 6         | 9, 10, 12                 | 6, 7, 8              |
| 6    | 5            | 10, 12                    | 4, 5, 7, 8           |
| 7    | 9            | 12                        | 10                   |
| 8    | 7            | 12                        | None                 |
| 9    | 4, 8         | 10                        | 7                    |
| 10   | 5, 9         | 12                        | 5, 9, 11             |
| 11   | 5, 10        | 12                        | 5, 9, 10             |
| 12   | 7, 9, 10, 11 | None (final verification) |

### Agent Dispatch Summary

| Wave | Tasks         | Recommended Agents                                                                                                       |
| ---- | ------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1    | 1, 2, 3       | task(category="quick", load_skills=["git-master", "nodejs-backend-patterns", "drizzle-orm-d1"], run_in_background=false) |
| 2    | 4, 5, 6       | task(category="quick", load_skills=["git-master", "nodejs-backend-patterns", "hono-routing"], run_in_background=false)   |
| 3    | 7, 8          | task(category="quick", load_skills=["git-master"], run_in_background=false)                                              |
| 4    | 9, 10, 11, 12 | task(category="quick", load_skills=["playwright"], run_in_background=false)                                              |

---

## TODOs

---

### Wave 1: Foundation

- [x] 1. Create URL validator function (`apps/api/src/lib/url-validator.ts`)

  **What to do**:
  - Create `apps/api/src/lib/url-validator.ts` file (if not exists)
  - Export `validateVideoUrl(url: string): Promise<boolean>` function
  - Use HEAD request with 5-second timeout
  - Accept 2xx and 3xx (redirects) as valid
  - Handle errors gracefully (return false, log error)
  - Do NOT follow redirects (manual redirect to detect stale URLs)

  **Implementation Details**:

  ```typescript
  // apps/api/src/lib/url-validator.ts
  export async function validateVideoUrl(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "manual",
      });

      clearTimeout(timeoutId);

      return response.ok || (response.status >= 300 && response.status < 400);
    } catch (error) {
      console.log(`[URLValidator] Validation failed for ${url}:`, error);
      return false;
    }
  }
  ```

  **Must NOT do**:
  - Do NOT use GET request (slower, downloads video)
  - Do NOT follow redirects (might mask stale URL issues)
  - Do NOT validate with timeout > 5 seconds

  **Recommended Agent Profile**:

  > Select category + skills based on task domain. Justify each choice.
  - **Category**: `quick`
    - Reason: Single utility function with clear implementation pattern
  - **Skills**: `["git-master", "nodejs-backend-patterns"]`
    - `git-master`: File creation, understanding of project structure
    - `nodejs-backend-patterns`: HTTP validation patterns, error handling
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed for backend utility function

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (Task 1 starts first)
  - **Blocks**: Tasks 2, 3 (depend on validator)
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL - Be Exhaustive):

  > The executor has NO context from your interview. References are their ONLY guide.
  > Each reference must answer: "What should I look at and WHY?"

  **Pattern References** (existing code to follow):
  - `apps/api/src/routes/videos.ts:190-215` - Error handling patterns for API responses
  - `apps/api/src/lib/fallback.ts` - HTTP request patterns with timeout handling

  **Test References** (testing patterns to follow):
  - None - this is a new utility function

  **Documentation References** (specs and requirements):
  - MDN: Fetch API - HEAD request usage, timeout with AbortController
  - HTTP specification: Status code meanings (2xx, 3xx)

  **External References** (libraries and frameworks):
  - Bun fetch documentation: Native fetch API with AbortSignal

  **WHY Each Reference Matters** (explain the relevance):
  - `apps/api/src/routes/videos.ts`: Shows how to handle API responses and errors consistently
  - `apps/api/src/lib/fallback.ts`: Demonstrates timeout and error handling patterns in this codebase
  - MDN docs: Provide authoritative reference for HEAD request behavior and best practices

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY** — No human action permitted.
  > Every criterion MUST be verifiable by running a command or using a tool.
  - [ ] File created: `apps/api/src/lib/url-validator.ts` exists
  - [ ] Function exported: `validateVideoUrl` is exported
  - [ ] HEAD request: Uses `fetch(url, { method: "HEAD" })`
  - [ ] Timeout: AbortController with 5-second timeout
  - [ ] Redirect handling: `redirect: "manual"` to prevent automatic following
  - [ ] Valid response: Returns `true` for 2xx and 3xx status codes
  - [ ] Error handling: Catches errors, logs them, returns `false`
  - [ ] No TypeScript errors: File compiles without type errors

  **Agent-Executed QA Scenarios (MANDATORY — per-scenario, ultra-detailed):**

  ```
  Scenario: Validate accessible video URL returns true
    Tool: Bash (node)
    Preconditions: API server running, URL validator file created
    Steps:
      1. cd apps/api && node -e "const { validateVideoUrl } = require('./lib/url-validator.js'); console.log(await validateVideoUrl('http://localhost:3001/api/video/test/path.mp4'))"
    Expected Result: Output "true" (URL is accessible)
    Failure Indicators: Output "false", error thrown, timeout occurs
    Evidence: Console output
  ```

  **Evidence to Capture**:
  - [ ] Node execution output saved to `.sisyphus/evidence/task-1-validator-test.txt`

  **Commit**: YES (group with Wave 1)
  - Message: `feat(api): add URL validator with HEAD request`
  - Files: `apps/api/src/lib/url-validator.ts`
  - Pre-commit: None

---

- [x] 2. Add episode list endpoint to dramas routes (`apps/api/src/routes/dramas.ts`)

  **What to do**:
  - Open `apps/api/src/routes/dramas.ts`
  - Import validator from `./lib/url-validator.js`
  - Add new GET endpoint: `/api/dramas/:slug/episodes`
  - Fetch drama by slug using existing `dramaService.getBySlug(slug)`
  - Return episode list without `videoUrls`: `{ id, number, title }` only
  - Add Cache-Control header: `public, max-age=300` (5 minutes)
  - Keep existing `/:slug` endpoint unchanged (will modify in Task 5)

  **Implementation Details**:

  ```typescript
  // In apps/api/src/routes/dramas.ts

  import { validateVideoUrl } from "../lib/url-validator.js";

  // Add new endpoint after existing /:slug route
  app.get(
    "/:slug/episodes",
    zValidator("param", GetDramaParamsSchema),
    async (c) => {
      const { slug } = c.req.valid("param");

      const drama = await dramaService.getBySlug(slug);

      if (!drama) {
        throw new HTTPException(404, {
          message: `Drama with slug "${slug}" not found`,
        });
      }

      c.header("Cache-Control", "public, max-age=300");

      return c.json({
        success: true,
        data: {
          dramaId: drama.id,
          episodes: drama.episodes.map((ep) => ({
            id: ep.id,
            number: ep.number,
            title: ep.title || `Episode ${ep.number}`,
          })),
        },
      });
    },
  );
  ```

  **Must NOT do**:
  - Do NOT modify existing `/:slug` endpoint (add new route separately)
  - Do NOT include `videoUrls` in response (this endpoint is for list generation only)
  - Do NOT modify `dramaService` (use existing `getBySlug`)
  - Do NOT change episode object structure (keep `{ id, number, title }`)

  **Recommended Agent Profile**:

  > Select category + skills based on task domain. Justify each choice.
  - **Category**: `quick`
    - Reason: Adding new route following existing Hono patterns
  - **Skills**: `["git-master", "hono-routing", "nodejs-backend-patterns"]`
    - `git-master`: Safe file editing, understanding of route mounting
    - `hono-routing`: Route parameter validation with zValidator, response structure
    - `nodejs-backend-patterns`: API endpoint patterns and response structure
  - **Skills Evaluated but Omitted**:
    - `drizzle-orm-d1`: No DB operations in this task (only route definition)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (depends on Task 1)
  - **Blocks**: Task 4 (proxy route depends on having drama with `dramaId`)
  - **Blocked By**: Task 1 (validator must exist)

  **References** (CRITICAL - Be Exhaustive):

  > The executor has NO context from your interview. References are their ONLY guide.
  > Each reference must answer: "What should I look at and WHY?"

  **Pattern References** (existing code to follow):
  - `apps/api/src/routes/dramas.ts:47-64` - Existing `/:slug` route structure (zValidator, HTTPException)
  - `apps/api/src/routes/search.ts:1-28` - Route parameter validation and response patterns

  **API/Type References** (contracts to implement against):
  - `apps/api/src/services/drama.service.ts:104-123` - `getBySlug(slug)` method signature
  - `packages/shared/src/schemas/index.ts` - `GetDramaParamsSchema` for slug validation

  **Test References** (testing patterns to follow):
  - None - this is a new route

  **Documentation References** (specs and requirements):
  - Hono documentation: Route parameter validation with zValidator

  **External References** (libraries and frameworks):
  - Hono docs: Route mounting and response patterns

  **WHY Each Reference Matters** (explain the relevance):
  - `apps/api/src/routes/dramas.ts`: Shows existing route structure to follow for consistency
  - `apps/api/src/services/drama.service.ts`: Confirms `getBySlug` method returns drama with episodes
  - `GetDramaParamsSchema`: Provides the schema for validating slug parameter

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY**
  - [ ] Route added: `app.get("/:slug/episodes", ...)` exists in dramaroutes.ts
  - [ ] Slug validation: Uses `zValidator("param", GetDramaParamsSchema)`
  - [ ] Drama fetched: Calls `dramaService.getBySlug(slug)`
  - [ ] Response structure: `{ success: true, data: { dramaId, episodes: [...] } }`
  - [ ] Episode object: Each episode has `{ id, number, title }` only (no videoUrls)
  - [ ] Cache header: `Cache-Control: public, max-age=300`
  - [ ] No TypeScript errors: File compiles without type errors

  **Agent-Executed QA Scenarios (MANDATORY — per-scenario, ultra-detailed):**

  ```
  Scenario: Episode list endpoint returns dramaId and episodes
    Tool: Bash (curl)
    Preconditions: API server running, route added
    Steps:
      1. curl -s http://localhost:3001/api/dramas/test-drama/episodes
      2. jq '.data | has("dramaId") and .data.episodes | has("id")'
    Expected Result: Response includes `dramaId` field, episodes array with `id`, `number`, `title`
    Failure Indicators: 404, missing dramaId, episodes include videoUrls
    Evidence: curl output
  ```

  **Evidence to Capture**:
  - [ ] curl output saved to `.sisyphus/evidence/task-2-episodes-list.txt`

  **Commit**: YES (group with Wave 1)
  - Message: `feat(api): add episode list endpoint for URL generation`
  - Files: `apps/api/src/routes/dramas.ts`
  - Pre-commit: None

---

- [x] 3. Modify drama service with validation methods (`apps/api/src/services/drama.service.ts`)

  **What to do**:
  - Open `apps/api/src/services/drama.service.ts`
  - Import `validateVideoUrl` from `../lib/url-validator.js`
  - Import `getEpisodes` from `./api-proxy.service.js`
  - Add `DramaWithValidation` interface extending `DramaWithEpisodes` with `source: "cache" | "fresh"`
  - Add `getBySlugWithValidation(slug)` method to implement fire-and-forget pattern
  - Add `transformApiProxyUrlToVideoUrls(url)` helper method
  - Add `fetchAndCacheEpisodes(bookId)` private method for async DB updates
  - Add `findEpisodeByNumber(episodes, number)` helper method
  - Keep existing `getBySlug(slug)` method unchanged

  **Implementation Details**:

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
    const drama = await this.getBySlug(slug);

    if (!drama) {
      return null;
    }

    const episodesWithUrls = drama.episodes.filter(
      ep => ep.videoUrls && Object.keys(ep.videoUrls).length > 0
    );

    if (episodesWithUrls.length === 0 || !drama.bookId) {
      if (drama.bookId) {
        this.fetchAndCacheEpisodes(drama.bookId.toString());
      }
      return { ...drama, source: "fresh" };
    }

    const firstEpisode = episodesWithUrls[0];
    const qualities = ["1080p", "720p", "480p", "360p", "240p"] as const;
    const urlToValidate = qualities
      .map(q => firstEpisode.videoUrls?.[q])
      .find(url => url !== undefined);

    if (!urlToValidate) {
      if (drama.bookId) {
        this.fetchAndCacheEpisodes(drama.bookId.toString());
      }
      return { ...drama, source: "fresh" };
    }

    const isValid = await validateVideoUrl(urlToValidate);

    if (isValid) {
      console.log(`[DramaService] Cache valid for drama ${drama.slug}`);
      return { ...drama, source: "cache" };
    }

    console.log(`[DramaService] Cache stale for drama ${drama.slug}`);

    if (drama.bookId) {
      this.fetchAndCacheEpisodes(drama.bookId.toString());
    }

    const freshEpisodes = await getEpisodes(drama.bookId.toString());

    if (freshEpisodes.success) {
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

      const [drama] = await db
        .select({ id: dramas.id })
        .from(dramas)
        .where(eq(dramas.bookId, BigInt(bookId)));

      if (!drama) {
        console.error(`[DramaService] Drama not found for bookId ${bookId}`);
        return;
      }

      const updatePromises = result.data.episodes.map(async (apiEpisode) => {
        const videoUrls = apiEpisode.url
          ? this.transformApiProxyUrlToVideoUrls(apiEpisode.url)
          : {};

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
    }
  }

  /**
   * Transform single API-Proxy URL to quality-mapped object
   */
  private transformApiProxyUrlToVideoUrls(url: string): Partial<Record<string, string>> {
    const videoUrls: Partial<Record<string, string>> = {};

    const qualityMatch = url.match(/\.(\d+p|4k)\./i);

    if (qualityMatch) {
      const detectedQuality = qualityMatch[1].toLowerCase();
      videoUrls[detectedQuality] = url;
    } else {
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

  **Must NOT do**:
  - Do NOT modify existing `getBySlug(slug)` method (new method is separate)
  - Do NOT remove any existing methods
  - Do NOT await `fetchAndCacheEpisodes` in main flow (must be async)
  - Do NOT throw errors in `fetchAndCacheEpisodes` (log and return)

  **Recommended Agent Profile**:

  > Select category + skills based on task domain. Justify each choice.
  - **Category**: `unspecified-medium`
    - Reason: Multiple methods with complex async patterns and DB operations
  - **Skills**: `["git-master", "drizzle-orm-d1", "nodejs-backend-patterns"]`
    - `git-master`: Safe file editing, understanding of service patterns
    - `drizzle-orm-d1`: DB select and update operations with proper schema usage
    - `nodejs-backend-patterns`: Async/await patterns, error handling
  - **Skills Evaluated but Omitted**:
    - `hono-routing`: Not routing in this task (service layer only)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (depends on Task 1)
  - **Blocks**: Tasks 5, 6 (depend on service methods)
  - **Blocked By**: Task 1, 2 (validator + episodes endpoint)

  **References** (CRITICAL - Be Exhaustive):

  > The executor has NO context from your interview. References are their ONLY guide.
  > Each reference must answer: "What should I look at and WHY?"

  **Pattern References** (existing code to follow):
  - `apps/api/src/services/drama.service.ts:104-123` - Existing `getBySlug` method structure
  - `apps/api/src/routes/videos.ts:190-215` - URL quality detection pattern in `transformApiProxyUrlToVideoUrls`
  - `apps/api/src/db/import-sql-data.ts` - DB update patterns with `db.update(episodes)`

  **API/Type References** (contracts to implement against):
  - `packages/shared/src/schemas/index.ts` - Episode, Drama, DramaWithEpisodes types
  - `apps/api/src/db/schema.ts:104-139` - Episodes table schema (dramaId, number, videoUrls)

  **Test References** (testing patterns to follow):
  - None - this is a service modification

  **Documentation References** (specs and requirements):
  - Drizzle ORM documentation: `db.update()`, `db.select()` usage patterns

  **External References** (libraries and frameworks):
  - Drizzle docs: Update operations with where clauses

  **WHY Each Reference Matters** (explain the relevance):
  - `apps/api/src/services/drama.service.ts`: Ensures consistency with existing service methods and patterns
  - `apps/api/src/routes/videos.ts`: Shows quality detection regex pattern to reuse for URL transformation
  - Episode schema: Confirms correct field names for `dramaId`, `number`, `videoUrls` in update operations

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY**
  - [ ] Methods added: `getBySlugWithValidation`, `fetchAndCacheEpisodes`, `transformApiProxyUrlToVideoUrls`, `findEpisodeByNumber`
  - [ ] Interface added: `DramaWithValidation` extends `DramaWithEpisodes`
  - [ ] Validation uses HEAD request: Imports and calls `validateVideoUrl`
  - [ ] Fire-and-forget pattern: `fetchAndCacheEpisodes` called WITHOUT await
  - [ ] DB updates episodes: Uses `db.update(episodes)` with `where(and(eq(dramaId), eq(number)))`
  - [ ] Batch updates: Uses `Promise.all()` for parallel episode updates
  - [ ] No TypeScript errors: File compiles without type errors

  **Agent-Executed QA Scenarios (MANDATORY — per-scenario, ultra-detailed):**

  ```
  Scenario: Service has all methods and compiles
    Tool: Bash (bun run dev)
    Preconditions: Service file modified
    Steps:
      1. cd apps/api && bun run dev > /tmp/dev-start.log 2>&1 &
      2. sleep 5
      3. grep -E "(getBySlugWithValidation|fetchAndCacheEpisodes)" /tmp/dev-start.log
    Expected Result: No TypeScript errors, service starts successfully
    Failure Indicators: TypeScript compilation errors, import errors, server won't start
    Evidence: Dev server log
  ```

  **Evidence to Capture**:
  - [ ] Dev server log saved to `.sisyphus/evidence/task-3-service-compile.txt`

  **Commit**: YES (group with Wave 1)
  - Message: `feat(api): add cache validation with fire-and-forget to drama service`
  - Files: `apps/api/src/services/drama.service.ts`
  - Pre-commit: None

---

### Wave 2: Proxy & Cache Implementation

- [x] 4. Modify proxy route to handle short URL format (`apps/api/src/routes/video-proxy.ts`)

  **What to do**:
  - Open `apps/api/src/routes/video-proxy.ts`
  - Add logic to parse short URL format: `{dramaId}.{episodeNumber}.{quality}.mp4`
  - Parse `dramaId` (UUID), `episodeNumber` (number), `quality` (string) from path
  - Lookup episode in DB by `dramaId` + `number`
  - If episode found: extract URL from `videoUrls[quality]`
  - If episode not found: fallback using `dramaId` → lookup `bookId` → fetch from API-Proxy
  - Keep existing full path forwarding for compatibility (non-matching paths still proxy to hwztvideo)

  **Implementation Details**:

  ```typescript
  // In apps/api/src/routes/video-proxy.ts

  import { zValidator } from "@hono/zod-validator";
  import { z } from "zod";
  import { db } from "../db/index.js";
  import { eq, and } from "drizzle-orm";
  import { episodes, dramas } from "../db/schema.js";
  import { HTTPException } from "hono/http-exception";
  import { getEpisodes } from "../services/api-proxy.service.js";

  // Schema for short URL format
  const ShortVideoPathSchema = z.object({
    dramaId: z.string().uuid(),
    episodeNumber: z.coerce.number().int().positive(),
    quality: z.enum(["240p", "360p", "480p", "720p", "1080p", "4k"]),
  });

  app.get("/:path*", async (c) => {
    const path = c.req.param("path");

    // Try to parse short URL format: {uuid}.{number}.{quality}.mp4
    const shortMatch = path.match(
      /^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\.(\d+)\.(240p|360p|480p|720p|1080p|4k)\.mp4$/i,
    );

    if (shortMatch) {
      const [dramaId, episodeNumberStr, quality] = shortMatch.slice(1, 4);
      const episodeNumber = parseInt(episodeNumberStr, 10);

      console.log(
        `[VideoProxy] Short URL request: dramaId=${dramaId}, episode=${episodeNumber}, quality=${quality}`,
      );

      // Look up episode by dramaId + number
      const episode = await db.query.episodes.findFirst({
        where: and(
          eq(episodes.dramaId, dramaId),
          eq(episodes.number, episodeNumber),
        ),
        columns: {
          dramaId: true,
          number: true,
          videoUrls: true,
          drama: {
            columns: {
              bookId: true,
            },
          },
        },
      });

      if (episode) {
        // Extract URL from videoUrls[quality]
        const targetUrl = episode.videoUrls?.[quality];

        if (targetUrl) {
          console.log(
            `[VideoProxy] Found episode in DB, using URL from videoUrls[${quality}]`,
          );
          return proxyToTargetUrl(targetUrl, c);
        } else {
          console.log(
            `[VideoProxy] Episode found but quality ${quality} not available in videoUrls`,
          );
          // Try other qualities in order of preference
          const preferredQualities = [
            "1080p",
            "720p",
            "480p",
            "360p",
            "240p",
            "4k",
          ] as const;
          for (const q of preferredQualities) {
            const fallbackUrl = episode.videoUrls?.[q];
            if (fallbackUrl) {
              console.log(
                `[VideoProxy] Using fallback quality ${q} for episode`,
              );
              return proxyToTargetUrl(fallbackUrl, c);
            }
          }
          return c.json(
            {
              success: false,
              error: "Quality not available",
              message: `No video URL available for quality ${quality}`,
            },
            404,
          );
        }
      }

      // Episode not found in DB - try fallback
      console.log(
        `[VideoProxy] Episode not found in DB, attempting fallback via API-Proxy`,
      );

      // Look up drama by dramaId to get bookId
      const drama = await db.query.dramas.findFirst({
        where: eq(dramas.id, dramaId),
        columns: {
          bookId: true,
        },
      });

      if (!drama || !drama.bookId) {
        console.log(`[VideoProxy] Drama not found or no bookId for fallback`);
        return c.json(
          {
            success: false,
            error: "Not Found",
            message: "Episode not found and cannot fetch from API-Proxy",
          },
          404,
        );
      }

      // Fetch from API-Proxy using bookId
      console.log(
        `[VideoProxy] Fetching from API-Proxy using bookId ${drama.bookId.toString()}`,
      );
      const result = await getEpisodes(drama.bookId.toString());

      if (!result.success || result.data.episodes.length === 0) {
        return c.json(
          {
            success: false,
            error: "Not Found",
            message: `No episodes found for bookId ${drama.bookId}`,
          },
          404,
        );
      }

      // Find episode by number in API-Proxy response
      const apiEpisode = result.data.episodes.find(
        (ep) => ep.index === episodeNumber,
      );

      if (!apiEpisode || !apiEpisode.url) {
        return c.json(
          {
            success: false,
            error: "Not Found",
            message: `Episode ${episodeNumber} not found in API-Proxy response`,
          },
          404,
        );
      }

      // Transform API-Proxy URL to quality-mapped object
      const transformedUrls = transformApiProxyUrlToVideoUrls(apiEpisode.url);
      const targetUrl = transformedUrls[quality] || transformedUrls["1080p"];

      if (!targetUrl) {
        return c.json(
          {
            success: false,
            error: "Not Found",
            message: `No video URL available for quality ${quality}`,
          },
          404,
        );
      }

      console.log(
        `[VideoProxy] Using fallback URL from API-Proxy: ${targetUrl}`,
      );
      return proxyToTargetUrl(targetUrl, c);
    }

    // Not a short URL format - use existing logic (full path forwarding)
    console.log(`[VideoProxy] Using full path forwarding for: ${path}`);
    return proxyToFullTargetUrl(path, c);
  });

  // Helper function to proxy to target URL with proper headers
  async function proxyToTargetUrl(
    targetUrl: string,
    c: any,
  ): Promise<Response> {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://dramaboxdb.com/",
      },
    });

    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "video/mp4",
        "Content-Length": response.headers.get("Content-Length") || "",
        "Accept-Ranges": response.headers.get("Accept-Ranges") || "bytes",
        "Content-Range": response.headers.get("Content-Range") || "",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Range",
      },
    });
  }

  // Helper function for full path forwarding (existing logic)
  async function proxyToFullTargetUrl(path: string, c: any): Promise<Response> {
    const targetUrl = `https://hwztvideo.dramaboxdb.com/${path}`;

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://dramaboxdb.com/",
      },
    });

    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "video/mp4",
        "Content-Length": response.headers.get("Content-Length") || "",
        "Accept-Ranges": response.headers.get("Accept-Ranges") || "bytes",
        "Content-Range": response.headers.get("Content-Range") || "",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Range",
      },
    });
  }

  // Helper to transform API-Proxy URL (reused from videos.ts or defined locally)
  function transformApiProxyUrlToVideoUrls(
    url: string,
  ): Partial<Record<string, string>> {
    const videoUrls: Partial<Record<string, string>> = {};

    const qualityMatch = url.match(/\.(\d+p|4k)\./i);

    if (qualityMatch) {
      const detectedQuality = qualityMatch[1].toLowerCase();
      videoUrls[detectedQuality] = url;
    } else {
      videoUrls["1080p"] = url;
    }

    return videoUrls;
  }
  ```

  **Must NOT do**:
  - Do NOT modify full path forwarding logic (keep `proxyToFullTargetUrl` helper)
  - Do NOT change CORS headers (must be present on both paths)
  - Do NOT remove existing OPTIONS handler
  - Do NOT change user-agent or referer headers
  - Do NOT remove error handling for 404 responses

  **Recommended Agent Profile**:

  > Select category + skills based on task domain. Justify each choice.
  - **Category**: `quick`
    - Reason: Adding new URL parsing logic to existing proxy route
  - **Skills**: `["git-master", "drizzle-orm-d1", "hono-routing"]`
    - `git-master`: Safe file editing, understanding of route patterns
    - `drizzle-orm-d1`: DB lookup with join to drama table for bookId
    - `hono-routing`: Route parameter parsing and response structure
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed for backend route modification

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (depends on Tasks 2, 3)
  - **Blocks**: Task 7 (frontend depends on short URL format working)
  - **Blocked By**: Tasks 2, 3 (episodes endpoint + service methods)

  **References** (CRITICAL - Be Exhaustive):

  > The executor has NO context from your interview. References are their ONLY guide.
  > Each reference must answer: "What should I look at and WHY?"

  **Pattern References** (existing code to follow):
  - `apps/api/src/routes/video-proxy.ts:1-47` - Current proxy implementation (CORS headers, user-agent)
  - `apps/api/src/routes/videos.ts:190-215` - `transformApiProxyUrlToVideoUrls` function to reuse
  - `apps/api/src/db/schema.ts:104-139` - Episodes table schema for DB lookup

  **API/Type References** (contracts to implement against):
  - `apps/api/src/db/schema.ts:68-85` - Dramas table schema for bookId lookup
  - `packages/shared/src/schemas/index.ts` - VideoQuality type for quality enum

  **Test References** (testing patterns to follow):
  - None - this is a route modification

  **Documentation References** (specs and requirements):
  - Zod documentation: UUID validation with `z.string().uuid()`, coercion with `z.coerce.number()`

  **External References** (libraries and frameworks):
  - Regex patterns: UUID format matching, quality enum extraction

  **WHY Each Reference Matters** (explain the relevance):
  - `apps/api/src/routes/video-proxy.ts`: Ensures consistency with existing CORS and header handling
  - `apps/api/src/routes/videos.ts`: Provides URL transformation helper to avoid duplication
  - Episode schema: Confirms `dramaId`, `number` fields for lookup logic
  - VideoQuality enum: Provides quality options for validation

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY**
  - [ ] Short URL parsing: Regex matches `{uuid}.{number}.{quality}.mp4` format
  - [ ] DB lookup: Episode queried by `dramaId` (UUID) + `number`
  - [ ] URL extraction: `videoUrls[quality]` used when episode found
  - [ ] Quality fallback: Tries preferred qualities if requested quality not available
  - [ ] Fallback logic: Uses `dramaId` → `bookId` → API-Proxy when episode not in DB
  - [ ] BookId lookup: Drama queried by `dramaId` to get `bookId`
  - [ ] API-Proxy fetch: Calls `getEpisodes(bookId)` when falling back
  - [ ] Full path preserved: Non-matching paths still use `proxyToFullTargetUrl`
  - [ ] No TypeScript errors: File compiles without type errors

  **Agent-Executed QA Scenarios (MANDATORY — per-scenario, ultra-detailed):**

  ```
  Scenario: Short URL format is resolved from DB
    Tool: Bash (curl)
    Preconditions: API server running, proxy route modified
    Steps:
      1. curl -I "http://localhost:3001/api/video/{dramaId}.1.1080p.mp4"
         # Replace {dramaId} with actual UUID from DB
      2. curl -I -H "Range: bytes=0-1023" "http://localhost:3001/api/video/{dramaId}.1.1080p.mp4"
    Expected Result: Status 200 or 206, Content-Type: video/mp4, CORS headers present
    Failure Indicators: 404, 500, missing CORS headers
    Evidence: curl output
  ```

  **Evidence to Capture**:
  - [ ] curl output saved to `.sisyphus/evidence/task-4-short-url-resolve.txt`

  **Commit**: YES (group with Wave 2)
  - Message: `feat(api): add short URL format support to video proxy`
  - Files: `apps/api/src/routes/video-proxy.ts`
  - Pre-commit: None

---

- [x] 5. Add cache validation to drama detail endpoint (`apps/api/src/routes/dramas.ts`)

  **What to do**:
  - Open `apps/api/src/routes/dramas.ts`
  - Import `getBySlugWithValidation` from drama service
  - Modify existing `GET /:slug` route to use `getBySlugWithValidation`
  - Add `meta.source` field to response to indicate cache vs fresh
  - Keep Cache-Control header (increase to 60s for validation overhead)

  **Implementation Details**:

  ```typescript
  // In apps/api/src/routes/dramas.ts

  import { dramaService } from "../services/drama.service.js";

  // Modify existing route
  app.get("/:slug", zValidator("param", GetDramaParamsSchema), async (c) => {
    const { slug } = c.req.valid("param");

    // Use validation method instead of getBySlug
    const drama = await dramaService.getBySlugWithValidation(slug);

    if (!drama) {
      throw new HTTPException(404, {
        message: `Drama with slug "${slug}" not found`,
      });
    }

    // Cache header: 60 seconds for validation overhead
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

  **Must NOT do**:
  - Do NOT remove existing route logic (only change method call)
  - Do NOT change response structure (only add `meta.source`)
  - Do NOT modify Cache-Control duration drastically (60s is reasonable)

  **Recommended Agent Profile**:

  > Select category + skills based on task domain. Justify each choice.
  - **Category**: `quick`
    - Reason: Simple route modification to use new service method
  - **Skills**: `["git-master", "hono-routing"]`
    - `git-master`: Safe file editing, understanding of route patterns
    - `hono-routing`: Route response structure with meta field
  - **Skills Evaluated but Omitted**:
    - `drizzle-orm-d1`: No DB operations in this task (route modification only)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (depends on Task 3)
  - **Blocks**: Task 9 (frontend depends on cache validation working)
  - **Blocked By**: Task 3 (service method must exist)

  **References** (CRITICAL - Be Exhaustive):

  > The executor has NO context from your interview. References are their ONLY guide.
  > Each reference must answer: "What should I look at and WHY?"

  **Pattern References** (existing code to follow):
  - `apps/api/src/routes/dramas.ts:47-64` - Current route structure (zValidator, HTTPException, response format)

  **API/Type References** (contracts to implement against):
  - `apps/api/src/services/drama.service.ts` - `getBySlugWithValidation` method signature and return type

  **Test References** (testing patterns to follow):
  - None - this is a route modification

  **Documentation References** (specs and requirements):
  - Hono documentation: Response structure with meta field

  **External References** (libraries and frameworks):
  - None

  **WHY Each Reference Matters** (explain the relevance):
  - `apps/api/src/routes/dramas.ts`: Ensures consistency with existing route patterns
  - `getBySlugWithValidation`: Confirms return type includes `source` field

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY**
  - [ ] Route modified: `getBySlug` call changed to `getBySlugWithValidation`
  - [ ] Response includes meta: Returns `{ success: true, data: drama, meta: { source: ... } }`
  - [ ] Service method used: Calls `dramaService.getBySlugWithValidation(slug)`
  - [ ] Cache header: `Cache-Control: public, max-age=60`
  - [ ] No TypeScript errors: File compiles without type errors

  **Agent-Executed QA Scenarios (MANDATORY — per-scenario, ultra-detailed):**

  ```
  Scenario: Cache validation adds meta.source to response
    Tool: Bash (curl)
    Preconditions: API server running, route modified
    Steps:
      1. curl -s http://localhost:3001/api/dramas/test-drama
      2. jq '.meta | has("source")'
    Expected Result: Response includes `meta.source` field with value "cache" or "fresh"
    Failure Indicators: Missing meta.source, response structure changed
    Evidence: curl output
  ```

  **Evidence to Capture**:
  - [ ] curl output saved to `.sisyphus/evidence/task-5-cache-validation.txt`

  **Commit**: YES (group with Wave 2)
  - Message: `feat(api): add cache validation to drama detail endpoint`
  - Files: `apps/api/src/routes/dramas.ts`
  - Pre-commit: None

---

- [x] 6. Add fire-and-forget batch update to drama service (`apps/api/src/services/drama.service.ts`)

  **What to do**:
  - Open `apps/api/src/services/drama.service.ts`
  - Verify `fetchAndCacheEpisodes` method exists (from Task 3)
  - If exists, ensure it has proper error handling
  - Verify `transformApiProxyUrlToVideoUrls` method exists
  - Verify `findEpisodeByNumber` method exists
  - Verify imports are correct (`validateVideoUrl`, `getEpisodes`)
  - Ensure all methods are properly typed

  **Note**: This task is verification/consistency check since the methods were added in Task 3.

  **Must NOT do**:
  - Do NOT modify method implementations (Task 3 should have created them)
  - Do NOT change method signatures

  **Recommended Agent Profile**:

  > Select category + skills based on task domain. Justify each choice.
  - **Category**: `unspecified-low`
    - Reason: Verification task - ensure methods exist and are correct
  - **Skills**: `["git-master"]`
    - `git-master`: File reading, understanding of service structure
  - **Skills Evaluated but Omitted**:
    - All other skills are overkill for verification task

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (depends on Task 3)
  - **Blocks**: Task 7 (frontend depends on complete service)
  - **Blocked By**: Task 3 (service must be complete)

  **References** (CRITICAL - Be Exhaustive):

  > The executor has NO context from your interview. References are their ONLY guide.
  > Each reference must answer: "What should I look at and WHY?"

  **Pattern References** (existing code to follow):
  - `apps/api/src/services/drama.service.ts` - Service method definitions for consistency check

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY**
  - [ ] Methods exist: `fetchAndCacheEpisodes`, `transformApiProxyUrlToVideoUrls`, `findEpisodeByNumber` present
  - [ ] Imports correct: `validateVideoUrl`, `getEpisodes` imported
  - [ ] No TypeScript errors: File compiles without type errors
  - [ ] Method signatures match plan: Parameters and return types as specified

  **Commit**: NO (verification only - no changes)

---

### Wave 3: Frontend Implementation

- [x] 7. Create/use-episodes hook or modify watch page (`apps/web/src/routes/watch.$episodeId.tsx`)

  **What to do**:
  - Open `apps/web/src/routes/watch.$episodeId.tsx`
  - Add hook to fetch episode list from new `/api/dramas/:slug/episodes` endpoint
  - Extract `dramaId` from episode list response
  - Generate short URLs: `/api/video/{dramaId}.{number}.{quality}.mp4`
  - Replace existing `rewriteVideoUrls` logic with short URL generation
  - Keep existing video player and controls (only change URL source)

  **Implementation Details**:

  ```typescript
  // In apps/web/src/routes/watch.$episodeId.tsx

  // Add new hook
  const { data: dramaWithEpisodes } = useQuery<{
    dramaId: string;
    episodes: { id: string; number: number; title: string }[];
  }>({
    queryKey: ["drama-episodes", episodeId],
    queryFn: async () => {
      if (episodeId === "test") {
        return { dramaId: "test-drama", episodes: MOCK_EPISODES_WITHOUT_URLS };
      }
      const response = await fetch(
        `${API_URL}/api/dramas/${dramaSlug}/episodes`,
        {
          credentials: "include",
        },
      );
      const result = await response.json();
      return result;
    },
    enabled: !!episodeId,
  });

  // Extract dramaId from hook data
  const dramaId = dramaWithEpisodes?.dramaId || "";

  // Update short URL generation function
  function generateShortVideoUrl(
    episodeNumber: number,
    quality: string,
  ): string {
    return `${API_URL}/api/video/${dramaId}.${episodeNumber}.${quality}.mp4`;
  }

  // Replace rewriteVideoUrls usage with short URL generation
  // Before:
  // const proxiedVideoUrls = useMemo(() => rewriteVideoUrls(videoData?.videoUrls), [videoData?.videoUrls]);

  // After:
  const proxiedVideoUrls = useMemo(() => {
    if (!videoData?.videoUrls || !dramaId) return videoData?.videoUrls || {};
    return Object.fromEntries(
      Object.entries(videoData.videoUrls).map(([quality, _url]) => [
        quality,
        generateShortVideoUrl(episodeNumber, quality),
      ]),
    );
  }, [videoData?.videoUrls, dramaId, episodeNumber]);
  ```

  **Must NOT do**:
  - Do NOT modify video player component or controls
  - Do NOT change video quality selector UI
  - Do NOT break existing test mode (episodeId === "test" should still work)
  - Do NOT remove existing URL transformation compatibility (keep for full paths)

  **Recommended Agent Profile**:

  > Select category + skills based on task domain. Justify each choice.
  - **Category**: `quick`
    - Reason: Frontend URL generation logic modification
  - **Skills**: `["git-master"]`
    - `git-master`: Safe file editing, understanding of React hooks patterns
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed for code changes (testing comes later)
    - `frontend-ui-ux`: Not modifying UI, only URL generation

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (depends on Task 4)
  - **Blocks**: Task 9 (backend verification depends on short URLs working)
  - **Blocked By**: Task 4 (proxy route must support short format)

  **References** (CRITICAL - Be Exhaustive):

  > The executor has NO context from your interview. References are their ONLY guide.
  > Each reference must answer: "What should I look at and WHY?"

  **Pattern References** (existing code to follow):
  - `apps/web/src/routes/watch.$episodeId.tsx:7-26` - Existing `useQuery` hook patterns
  - `apps/web/src/routes/watch.$episodeId.tsx:114-118` - Existing `rewriteVideoUrls` logic to replace

  **API/Type References** (contracts to implement against):
  - `apps/web/src/routes/watch.$episodeId.tsx:59-68` - `VideoUrls` type for mapping

  **Test References** (testing patterns to follow):
  - None - this is a code modification

  **Documentation References** (specs and requirements):
  - TanStack Query docs: useQuery hook usage and patterns

  **External References** (libraries and frameworks):
  - React docs: useMemo hook for memoization

  **WHY Each Reference Matters** (explain the relevance):
  - `apps/web/src/routes/watch.$episodeId.tsx:7-26`: Shows how to use `useQuery` for API calls with credentials
  - `apps/web/src/routes/watch.$episodeId.tsx:114-118`: Shows existing URL transformation to understand what to replace

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY**
  - [ ] Hook added: `useQuery` fetches episode list with `dramaId` and episodes array
  - [ ] DramaId extracted: Uses `dramaWithEpisodes?.dramaId`
  - [ ] Short URL generation: `generateShortVideoUrl` creates `/api/video/{dramaId}.{number}.{quality}.mp4`
  - [ ] URLs mapped: `videoUrls` transformed to short URLs using dramaId
  - [ ] Test mode preserved: episodeId === "test" still uses mock data
  - [ ] No TypeScript errors: File compiles without type errors

  **Commit**: YES (group with Wave 3)
  - Message: `feat(web): use short video URL format with dramaId lookup`
  - Files: `apps/web/src/routes/watch.$episodeId.tsx`
  - Pre-commit: None

---

- [x] 8. Test short URL format via proxy (`apps/api/src/routes/video-proxy.ts`)

  **What to do**:
  - Start API server: `bun run dev --filter=api`
  - Wait for server to be ready
  - Test short URL with dramaId from DB, episode number, and quality
  - Test fallback with invalid episode (should go to API-Proxy)
  - Test quality fallback (if requested quality not available)
  - Verify CORS headers present on all responses
  - Verify Range requests work for seeking
  - Save test outputs as evidence

  **Test Cases**:
  1. Valid episode in DB with requested quality
  2. Valid episode with unavailable quality (should use fallback)
  3. Invalid episode (should trigger fallback to API-Proxy)
  4. Non-short URL format (should use full path forwarding)

  **Must NOT do**:
  - Do NOT skip any test case
  - Do NOT ignore failures

  **Recommended Agent Profile**:

  > Select category + skills based on task domain. Justify each choice.
  - **Category**: `quick`
    - Reason: Running pre-defined test commands with curl
  - **Skills**: `["git-master"]`
    - `git-master`: File operations, understanding of project structure
  - **Skills Evaluated but Omitted**:
    - All other skills are overkill for curl testing

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (depends on Task 4, 7)
  - **Blocks**: Tasks 9, 10, 11, 12 (verification depends on proxy working)
  - **Blocked By**: Tasks 4, 7 (proxy must support short format)

  **References** (CRITICAL - Be Exhaustive):

  > The executor has NO context from your interview. References are their ONLY guide.
  > Each reference must answer: "What should I look at and WHY?"

  **Pattern References** (existing code to follow):
  - `apps/api/src/routes/video-proxy.ts:1-47` - Proxy implementation to verify against

  **API/Type References** (contracts to implement against):
  - Episode schema (DB): For test episode ID generation

  **Test References** (testing patterns to follow):
  - None - manual curl testing

  **Documentation References** (specs and requirements):
  - HTTP specification: Range request headers for video seeking

  **WHY Each Reference Matters** (explain the relevance):
  - Proxy route file: Confirms CORS headers and proxy logic implementation

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY**
  - [ ] Valid episode resolved: Short URL returns 200/206 with correct video URL
  - [ ] Quality fallback works: If requested quality unavailable, uses preferred quality
  - [ ] Fallback triggered: Invalid episode fetches from API-Proxy and returns 200
  - [ ] Full path preserved: Non-matching URLs proxy to hwztvideo directly
  - [ ] CORS headers: All responses include Access-Control-Allow-Origin
  - [ ] Range requests: Video seeking works with byte range requests
  - [ ] Evidence saved: All test outputs captured in `.sisyphus/evidence/`

  **Agent-Executed QA Scenarios (MANDATORY — per-scenario, ultra-detailed):**

  ```
  Scenario 1: Short URL resolves episode from DB and serves video
    Tool: Bash (curl)
    Preconditions: API server running, DB has test data
    Steps:
      1. Get a valid episode ID from DB: SELECT id FROM episodes LIMIT 1
      2. curl -I "http://localhost:3001/api/video/{episodeId}.1.1080p.mp4"
         # Replace {episodeId} with actual UUID
      3. curl -I -H "Range: bytes=0-1023" "http://localhost:3001/api/video/{episodeId}.1.1080p.mp4"
      4. jq '.status' from response (should be 200 or 206)
    Expected Result: Status 200 or 206, Content-Type: video/mp4, CORS headers present
    Failure Indicators: 404, 500, missing CORS, wrong video served
    Evidence: curl output with headers
  ```

  ```
  Scenario 2: Quality fallback uses preferred quality
    Tool: Bash (curl)
    Preconditions: Valid episode in DB, requested quality not in videoUrls
    Steps:
      1. curl -I "http://localhost:3001/api/video/{episodeId}.1.999p.mp4"
         # Request quality that doesn't exist
      2. jq '.status' from response (should be 200 or 206)
      3. Check logs for fallback message
    Expected Result: Status 200 or 206, logs show using fallback quality
    Failure Indicators: 404, no fallback logic executed
    Evidence: curl output, server logs
  ```

  ```
  Scenario 3: Invalid episode triggers API-Proxy fallback
    Tool: Bash (curl)
    Preconditions: Episode ID not in DB, drama exists with bookId
    Steps:
      1. Get valid dramaId from DB: SELECT id FROM dramas LIMIT 1
      2. curl -I "http://localhost:3001/api/video/{dramaId}.999.1080p.mp4"
         # Invalid episode number
      3. Check logs for API-Proxy fetch message
    Expected Result: Status 200 or 206, logs show fetching from API-Proxy
    Failure Indicators: 404, no fallback triggered
    Evidence: curl output, server logs
  ```

  ```
  Scenario 4: Non-short URL uses full path forwarding
    Tool: Bash (curl)
    Preconditions: API server running
    Steps:
      1. curl -I "http://localhost:3001/api/video/16/7x9/79x4/79450000024/700298461.1080p.wz.g264.mp4"
         # Full path (no dramaId.number.quality format)
      2. jq '.status' from response (should be 200 or 206)
    Expected Result: Status 200 or 206, proxies to hwztvideo.dramaboxdb.com
    Failure Indicators: 404, 500, CORS missing
    Evidence: curl output
  ```

  **Evidence to Capture**:
  - [ ] curl outputs for all scenarios saved to `.sisyphus/evidence/task-8-{scenario-name}.txt`
  - [ ] Server logs saved to `.sisyphus/evidence/task-8-server-logs.txt`

  **Commit**: NO (testing only)

---

### Wave 4: Verification & Testing

- [ ] 9. Test cache validation at drama detail (`apps/api/src/routes/dramas.ts`)

  **What to do**:
  - Start API server: `bun run dev --filter=api`
  - Test drama with valid cached URLs (should return "cache" source quickly)
  - Test drama with stale/invalid URLs (should return "fresh" source with API-Proxy fetch)
  - Verify `meta.source` field in response
  - Check logs for validation messages and fire-and-forget operations
  - Save test outputs as evidence

  **Test Cases**:
  1. Valid cached URLs - fast response (<100ms) with "cache" source
  2. Stale URLs - slower response (1-2s) with "fresh" source, logs show "Cache stale"
  3. Fire-and-forget - logs show "Fire-and-forget: Fetching" and "Cached X episodes"
  4. DB verification - episodes updated with fresh videoUrls

  **Must NOT do**:
  - Do NOT skip any test case
  - Do NOT ignore validation failures

  **Recommended Agent Profile**:

  > Select category + skills based on task domain. Justify each choice.
  - **Category**: `quick`
    - Reason: Testing cache validation and fire-and-forget patterns
  - **Skills**: `["git-master"]`
    - `git-master`: File operations, log reading
  - **Skills Evaluated but Omitted**:
    - All other skills are overkill for endpoint testing

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (depends on Tasks 5, 7, 8)
  - **Blocks**: Task 11 (E2E depends on cache validation working)
  - **Blocked By**: Tasks 5, 7 (cache validation must be implemented)

  **References** (CRITICAL - Be Exhaustive):

  > The executor has NO context from your interview. References are their ONLY guide.
  > Each reference must answer: "What should I look at and WHY?"

  **Pattern References** (existing code to follow):
  - `apps/api/src/routes/dramas.ts` - Modified route with cache validation

  **API/Type References** (contracts to implement against):
  - `DramaWithValidation` interface - `source` field for verification

  **Test References** (testing patterns to follow):
  - None - manual endpoint testing

  **Documentation References** (specs and requirements):
  - Plan specification: Cache validation behavior expectations

  **WHY Each Reference Matters** (explain the relevance):
  - Modified route file: Confirms cache validation was added correctly

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY**
  - [ ] Cache hit: Valid URLs return <100ms with `meta.source: "cache"`
  - [ ] Cache miss: Stale URLs return in 1-2s with `meta.source: "fresh"`
  - [ ] Fire-and-forget: Logs show async fetch and cache operations
  - [ ] DB updates: Episodes in DB have fresh videoUrls after fire-and-forget
  - [ ] Evidence saved: All test outputs and logs captured

  **Agent-Executed QA Scenarios (MANDATORY — per-scenario, ultra-detailed):**

  ```
  Scenario 1: Cache validation returns cached data for valid URLs
    Tool: Bash (curl)
    Preconditions: API server running, drama with valid videoUrls
    Steps:
      1. time curl -s http://localhost:3001/api/dramas/test-drama
      2. jq -S '.meta.source == "cache" and .time_total < 100'
    Expected Result: Response time <100ms, meta.source is "cache"
    Failure Indicators: Response time >100ms, meta.source not "cache"
    Evidence: curl output with time
  ```

  ```
  Scenario 2: Cache validation triggers fetch for stale URLs
    Tool: Bash (curl) + server logs
    Preconditions: Drama with stale/invalid videoUrls
    Steps:
      1. time curl -s http://localhost:3001/api/dramas/stale-drama
      2. Check logs for "Cache stale" message
      3. Check logs for "Fire-and-forget: Fetching" message
      4. Wait 3 seconds
      5. Check logs for "Fire-and-forget: Cached X episodes" message
    Expected Result: Response time 1-2s, logs show stale detection and fetch
    Failure Indicators: No fetch triggered, no DB update logs
    Evidence: curl time, server logs
  ```

  ```
  Scenario 3: DB updated with fresh videoUrls from fire-and-forget
    Tool: Bash (curl) + DB query
    Preconditions: Fire-and-forget completed
    Steps:
      1. Query DB: SELECT number, video_urls FROM episodes WHERE drama_id = '...' LIMIT 1
      2. Assert video_urls not empty and not '{}'
    Expected Result: Episodes have fresh video URLs
    Failure Indicators: video_urls still empty or '{}', no update logs
    Evidence: DB query results, logs
  ```

  **Evidence to Capture**:
  - [ ] curl outputs saved to `.sisyphus/evidence/task-9-{scenario-name}.txt`
  - [ ] Server logs saved to `.sisyphus/evidence/task-9-server-logs.txt`
  - [ ] DB query results saved to `.sisyphus/evidence/task-9-db-query.txt`

  **Commit**: NO (testing only)

---

- [ ] 10. Test fire-and-forget fallback behavior (`apps/api/src/routes/dramas.ts`)

  **What to do**:
  - Start API server: `bun run dev --filter=api`
  - Ensure DB has drama with stale videoUrls
  - Request drama detail endpoint to trigger fire-and-forget
  - Verify API-Proxy is called (check logs)
  - Verify DB is updated with fresh episodes
  - Verify response returns immediately (fire-and-forget is async)
  - Check logs for proper fire-and-forget sequence

  **Test Cases**:
  1. Fire-and-forget triggered - logs show fetch and async DB update
  2. DB update completes - all episodes have fresh videoUrls
  3. Response returned immediately - does not wait for DB update

  **Must NOT do**:
  - Do NOT modify test data in DB (use existing stale data)
  - Do NOT skip waiting for DB update completion

  **Recommended Agent Profile**:

  > Select category + skills based on task domain. Justify each choice.
  - **Category**: `quick`
    - Reason: Testing fire-and-forget async pattern and fallback behavior
  - **Skills**: `["git-master"]`
    - `git-master`: Log reading, file operations
  - **Skills Evaluated but Omitted**:
    - All other skills are overkill for behavior testing

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (depends on Tasks 5, 7, 8)
  - **Blocks**: Task 11 (E2E depends on fallback working)
  - **Blocked By**: Tasks 5, 7 (cache validation and service must be complete)

  **References** (CRITICAL - Be Exhaustive):

  > The executor has NO context from your interview. References are their ONLY guide.
  > Each reference must answer: "What should I look at and WHY?"

  **Pattern References** (existing code to follow):
  - `apps/api/src/routes/dramas.ts` - Modified route with fire-and-forget
  - `apps/api/src/services/drama.service.ts` - Service methods for fire-and-forget

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY**
  - [ ] API-Proxy called: Logs show "Fire-and-forget: Fetching episodes for bookId"
  - [ ] DB updated: Episodes have fresh videoUrls in DB
  - [ ] Async behavior: Response returned immediately (<2s), not waiting for DB update
  - [ ] Logs sequence: Validation → Fetch → Async update → Complete
  - [ ] Evidence saved: All logs and query results captured

  **Agent-Executed QA Scenarios (MANDATORY — per-scenario, ultra-detailed):**

  ```
  Scenario: Fire-and-forget fetches fresh episodes and updates DB asynchronously
    Tool: Bash (curl) + DB query + server logs
    Preconditions: API server running, drama with stale videoUrls
    Steps:
      1. Clear videoUrls: UPDATE episodes SET video_urls = '{}' WHERE drama_id = '...'
      2. Request drama endpoint: curl -s http://localhost:3001/api/dramas/test-drama
      3. Extract bookId from response: jq '.data.dramaId'
      4. Check logs for "Fire-and-forget: Fetching" message
      5. Wait 5 seconds for async DB update
      6. Query DB: SELECT number, video_urls FROM episodes WHERE drama_id = '...' AND number = 1 LIMIT 1
      7. Assert video_urls not empty and has quality keys
    Expected Result: Logs show fetch and async update, DB has fresh videoUrls
    Failure Indicators: No fetch triggered, DB not updated, video_urls still empty
    Evidence: Request time, logs, DB query result
  ```

  **Evidence to Capture**:
  - [ ] curl output saved to `.sisyphus/evidence/task-10-fire-forget.txt`
  - [ ] Server logs saved to `.sisyphus/evidence/task-10-server-logs.txt`
  - [ ] DB query results saved to `.sisyphus/evidence/task-10-db-query.txt`

  **Commit**: NO (testing only)

---

- [x] 11. Frontend E2E test with Playwright (`apps/web/src/routes/watch.$episodeId.tsx`)

  **What to do**:
  - Start both API and frontend servers: `bun run dev`
  - Navigate to watch page with real episode ID
  - Verify video src uses short URL format: `/api/video/{dramaId}.{number}.{quality}.mp4`
  - Verify video loads and plays successfully
  - Test quality switching (if available)
  - Check network requests to verify short URLs are used
  - Verify no CORS errors in console
  - Take screenshots of working video player
  - Save console logs and network requests as evidence

  **Must NOT do**:
  - Do NOT use test episode ID (use real episode from DB)
  - Do NOT skip video playback verification
  - Do NOT ignore console errors

  **Recommended Agent Profile**:

  > Select category + skills based on task domain. Justify each choice.
  - **Category**: `quick`
    - Reason: End-to-end testing with Playwright
  - **Skills**: `["playwright", "git-master"]`
    - `playwright`: Browser automation, video playback verification, console/network inspection
    - `git-master`: File operations for evidence handling
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not modifying UI, just verifying existing UI

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (final verification task)
  - **Blocks**: None (final task, completes work)
  - **Blocked By**: Tasks 4, 7, 8, 9, 10 (all backend work must be complete)

  **References** (CRITICAL - Be Exhaustive):

  > The executor has NO context from your interview. References are their ONLY guide.
  > Each reference must answer: "What should I look at and WHY?"

  **Pattern References** (existing code to follow):
  - `apps/web/src/routes/watch.$episodeId.tsx:7-26, 114-118, 194-199` - Watch page structure and video URL usage
  - `apps/web/src/components/video-player.tsx` - Video player component (verify src attribute)

  **Test References** (testing patterns to follow):
  - `.sisyphus/evidence/task-5-*.png` - Previous E2E test outputs (video proxy worked)

  **Documentation References** (specs and requirements):
  - TanStack Start docs: Route file patterns for testing
  - Playwright docs: Page navigation, video element verification

  **WHY Each Reference Matters** (explain the relevance):
  - Watch page: Confirms where video src is set and how to verify it
  - Video player: Shows video element structure for src attribute inspection
  - Previous E2E: Provides baseline for comparison

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY**
  - [ ] Watch page loaded: Page navigates successfully to watch page
  - [ ] Short URL used: Video src contains `/api/video/{dramaId}.{number}.{quality}.mp4` format
  - [ ] Video plays: Video element currentTime advances, no playback errors
  - [ ] Quality switching: Different qualities generate correct short URLs
  - [ ] Network requests: Requests use short URL format
  - [ ] No CORS errors: Console shows no CORS-related errors
  - [ ] Screenshots: Working video player captured
  - [ ] Evidence saved: Console and network logs captured

  **Agent-Executed QA Scenarios (MANDATORY — per-scenario, ultra-detailed):**

  ```
  Scenario 1: Watch page loads with short URL format and video plays
    Tool: Playwright (playwright skill)
    Preconditions: API and frontend servers running, episode ID from DB
    Steps:
      1. Navigate to: http://localhost:3000/watch/{real-episode-id}
      2. Wait for: video element visible (timeout: 10s)
      3. Get video src: document.querySelector('video').src
      4. Assert src contains: "/api/video/{dramaId}.{number}.{quality}.mp4"
      5. Play video: video.play()
      6. Wait for: video.state is "playing" (timeout: 5s)
      7. Check network: Requests to /api/video/{dramaId}.*.mp4 present
    Expected Result: Video src uses short format, video plays without errors
    Failure Indicators: Full URL format, video fails to load, CORS errors
    Evidence: Screenshot, src attribute value, network requests
  ```

  ```
  Scenario 2: Quality switching generates correct short URLs
    Tool: Playwright (playwright skill)
    Preconditions: Video player loaded with multiple qualities
    Steps:
      1. Get current video src
      2. Click on quality selector button (1080p, 720p, etc.)
      3. Wait for: video src changes
      4. Get new video src
      5. Assert new src matches quality in button label
      6. Verify video continues playing
    Expected Result: Quality changes update video src with correct .quality.mp4 suffix
    Failure Indicators: Quality button doesn't change src, wrong quality in URL
    Evidence: Screenshots, src values before/after
  ```

  ```

  Scenario 3: No CORS errors in console
    Tool: Playwright (playwright skill)
    Preconditions: Watch page loaded, video playing
    Steps:
      1. browser_console_messages(level="error")
      2. Assert: No errors containing "CORS" or "Access-Control"
      3. Assert: No errors related to video loading or playback
    Expected Result: Console has zero errors, no CORS-related messages
    Failure Indicators: CORS errors present, video loading failures
    Evidence: Console messages output
  ```

  **Evidence to Capture**:
  - [ ] Screenshot 1: `.sisyphus/evidence/task-11-watch-page-loaded.png`
  - [ ] Screenshot 2: `.sisyphus/evidence/task-11-quality-switching.png`
  - [ ] Console logs: `.sisyphus/evidence/task-11-console.txt`
  - [ ] Network logs: `.sisyphus/evidence/task-11-network.txt`

  **Commit**: NO (testing only - E2E verification only)

---

## Commit Strategy

| After Task | Message                                                                 | Files                                      | Verification                      |
| ---------- | ----------------------------------------------------------------------- | ------------------------------------------ | --------------------------------- |
| 1          | `feat(api): add URL validator with HEAD request`                        | `apps/api/src/lib/url-validator.ts`        | bun run dev (compiles)            |
| 2          | `feat(api): add episode list endpoint for URL generation`               | `apps/api/src/routes/dramas.ts`            | curl + jq (endpoint returns list) |
| 3          | `feat(api): add cache validation with fire-and-forget to drama service` | `apps/api/src/services/drama.service.ts`   | bun run dev (service compiles)    |
| Wave 1     | `feat(api): implement cache validation and URL shortening foundation`   | All Wave 1 files                           | bun run dev (no errors)           |
| 4          | `feat(api): add short URL format support to video proxy`                | `apps/api/src/routes/video-proxy.ts`       | curl test scenarios (Task 8)      |
| 5          | `feat(api): add cache validation to drama detail endpoint`              | `apps/api/src/routes/dramas.ts`            | curl + logs (Task 9)              |
| 6          | `feat(api): add fire-and-forget batch update to drama service`          | `apps/api/src/services/drama.service.ts`   | curl + DB query (Task 10)         |
| Wave 2     | `feat(api): implement proxy short URLs and cache validation`            | All Wave 2 files                           | bun run dev (no errors)           |
| 7          | `feat(web): use short video URL format with dramaId lookup`             | `apps/web/src/routes/watch.$episodeId.tsx` | bun run dev (frontend compiles)   |
| Wave 3     | `feat(web): implement frontend short URL generation`                    | Wave 3 files                               | bun run dev (no errors)           |
| 8          | (no commit)                                                             | -                                          | curl tests (Task 8)               |
| 9          | (no commit)                                                             | -                                          | curl + logs (Task 9)              |
| 10         | (no commit)                                                             | -                                          | curl + logs (Task 10)             |
| 11         | (no commit)                                                             | -                                          | Playwright E2E test (Task 11)     |
| Wave 4     | `feat(e2e): verify URL shortening and cache validation`                 | Evidence files                             | Playwright screenshots            |

---

## Success Criteria

### Verification Commands

```bash
# Start servers
bun run dev

# Test episode list endpoint
curl -s http://localhost:3001/api/dramas/test-drama/episodes
# Expected: { success: true, data: { dramaId: "...", episodes: [...] } }

# Test short URL format
curl -I http://localhost:3001/api/video/{dramaId}.1.1080p.mp4
# Expected: Status 200 or 206, Content-Type: video/mp4, CORS headers

# Test fallback with invalid episode
curl -I http://localhost:3001/api/video/{dramaId}.999.1080p.mp4
# Expected: Status 200, logs show API-Proxy fetch

# Test cache validation
curl -s http://localhost:3001/api/dramas/test-drama
# Expected: meta.source: "cache" or "fresh", response time <200ms (cache hit)

# Test fire-and-forget
curl -s http://localhost:3001/api/dramas/stale-drama
# Expected: Logs show "Fire-and-forget: Fetching" and "Cached X episodes"
```

### Final Checklist

- [ ] URL validator function created with HEAD request and timeout
- [ ] Episode list endpoint returns dramaId and episodes (no videoUrls)
- [ ] Proxy route handles short URL format with DB lookup
- [ ] Proxy fallback uses dramaId → bookId → API-Proxy
- [ ] Full path forwarding preserved for non-matching URLs
- [ ] Cache validation added to drama detail endpoint
- [ ] Fire-and-forget pattern: Response immediate, DB update async
- [ ] Frontend generates short URLs: `/api/video/{dramaId}.{number}.{quality}.mp4`
- [ ] Frontend uses episode list to get dramaId
- [ ] No TypeScript errors in backend
- [ ] No TypeScript errors in frontend
- [ ] All curl tests pass (short URL, fallback, cache validation)
- [ ] All E2E tests pass (video plays, short URLs, no CORS errors)
- [ ] All evidence files captured in `.sisyphus/evidence/`
