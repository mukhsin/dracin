# API-Proxy Integration Plan

## TL;DR

**Objective:** Integrate API-Proxy (Express) with Hono API via HTTP client calls to:

1. Fix stale video URLs by falling back to API-Proxy when DB URLs fail
2. Expose rich catalog endpoints from API-Proxy through the API (latest, rank, featured, channel, indo, search, suggest)

**Architecture:** Docker Compose with HTTP communication between services (port 3001 → 3002)

**Estimated Effort:** Medium (6-8 tasks)  
**Parallel Execution:** YES - Wave 1 (service layer), Wave 2 (routes), Wave 3 (video fallback + integration)

---

## Context

### Current State

**API (Hono - Port 3001):**

- Database-driven endpoints: `/api/dramas`, `/api/episodes`, `/api/watchlist`, `/api/history`
- Video endpoint: `/api/episodes/:id/videos` (returns stale URLs from DB)
- Better-Auth authentication
- PostgreSQL + Drizzle ORM

**API-Proxy (Express - Port 3002):**

- External scraper for DramaboxDB
- Rich filtering endpoints: `/drama/featured`, `/drama/latest`, `/drama/rank`, `/drama/channel/:id`, `/drama/indo`
- Search: `/drama/search`, `/drama/suggest`
- Episode fetcher: `/drama/episodes/:bookId` (returns fresh video URLs)

**Problem:**

1. Video URLs in database are outdated → UI can't play videos
2. API lacks rich catalog features (ranking, latest, channel filtering) that api-proxy provides

**Solution:**
HTTP client integration where API calls api-proxy internally when:

- Fresh video URLs are needed (fallback from DB)
- Rich catalog data is requested (new endpoints)

---

## Work Objectives

### Core Objective

Create HTTP client layer in API to fetch fresh data from API-Proxy, expose rich catalog endpoints, and implement intelligent video URL fallback.

### Concrete Deliverables

1. HTTP client service for API-Proxy communication (`apps/api/src/services/api-proxy.service.ts`)
2. Catalog routes exposing api-proxy features (`apps/api/src/routes/catalog.ts`)
3. Search routes exposing search/suggest (`apps/api/src/routes/search.ts`)
4. Enhanced video endpoint with fallback logic (`apps/api/src/routes/videos.ts` modification)
5. Environment configuration updates (`.env.example`, `docker-compose.yml`)

### Definition of Done

- [x] Video endpoint returns fresh URLs when DB URLs are stale
- [x] Catalog endpoints return data from api-proxy
- [x] Search endpoints work with autocomplete
- [x] Docker Compose network properly configured
- [x] All endpoints tested and returning data

### Must Have

- HTTP client with timeout, retry, and error handling
- Video URL fallback mechanism
- Catalog endpoints (latest, rank, featured, channel, indo)
- Search endpoints (search, suggest)
- Docker network configuration

### Must NOT Have (Guardrails)

- Direct function calls between services (keep HTTP separation)
- Caching in API layer (api-proxy already caches)
- Database writes from api-proxy data (read-only proxy pattern)

---

## Verification Strategy

### Test Decision

- **Infrastructure exists:** YES (bun:test)
- **Automated tests:** Tests after implementation
- **Framework:** bun:test

### Agent-Executed QA Scenarios

**Scenario: Video Fallback Returns Fresh URLs**

```
Tool: Bash (curl)
Preconditions: API and API-Proxy running in Docker
Steps:
  1. curl http://localhost:3001/api/episodes/{episode-id}/videos
  2. Assert response contains videoUrls object
  3. Assert response has "source": "fallback" when DB URL is stale
  4. Verify URLs are accessible (HEAD request returns 200)
Expected Result: Fresh video URLs returned from api-proxy
Evidence: Response JSON saved to .sisyphus/evidence/video-fallback.json
```

**Scenario: Catalog Endpoints Return Data**

```
Tool: Bash (curl)
Steps:
  1. curl http://localhost:3001/api/catalog/latest
  2. curl http://localhost:3001/api/catalog/rank?type=1
  3. curl http://localhost:3001/api/catalog/featured
  4. Assert all return status 200 and data array
Expected Result: Rich catalog data from api-proxy
Evidence: Response samples saved to .sisyphus/evidence/catalog-*.json
```

**Scenario: Search with Autocomplete**

```
Tool: Bash (curl)
Steps:
  1. curl "http://localhost:3001/api/search?q=love"
  2. Assert returns search results array
  3. curl "http://localhost:3001/api/search/suggest?q=lov"
  4. Assert returns suggestions array
Expected Result: Search functionality working
Evidence: Search responses saved to .sisyphus/evidence/search-*.json
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Create HTTP client service for api-proxy
└── Task 2: Add environment configuration (API_PROXY_URL)

Wave 2 (After Wave 1):
├── Task 3: Create catalog routes (latest, rank, featured, channel, indo)
└── Task 4: Create search routes (search, suggest)

Wave 3 (After Wave 2):
└── Task 5: Implement video URL fallback logic

Wave 4 (Final):
└── Task 6: Update docker-compose and test integration
```

### Dependency Matrix

| Task               | Depends On | Blocks     | Can Parallelize With |
| ------------------ | ---------- | ---------- | -------------------- |
| 1 (HTTP Client)    | None       | 3, 4, 5    | 2                    |
| 2 (Env Config)     | None       | 3, 4, 5, 6 | 1                    |
| 3 (Catalog Routes) | 1, 2       | 6          | 4                    |
| 4 (Search Routes)  | 1, 2       | 6          | 3                    |
| 5 (Video Fallback) | 1, 2       | 6          | 3, 4                 |
| 6 (Docker/Test)    | 3, 4, 5    | None       | None                 |

---

## TODOs

- [x] 1. Create HTTP Client Service for API-Proxy

  **What to do**:
  - Create `apps/api/src/services/api-proxy.service.ts`
  - Implement HTTP client using native fetch with timeout (5s default, 30s for episodes)
  - Add retry logic (3 attempts with exponential backoff)
  - Handle API-Proxy response format transformation
  - Add proper error handling and logging

  **Must NOT do**:
  - Don't add caching (api-proxy already caches)
  - Don't modify api-proxy package

  **Recommended Agent Profile**:
  - **Category:** `quick` or `unspecified-low`
  - **Skills:** `hono-routing`
  - Reason: HTTP client is straightforward fetch wrapper

  **Parallelization**:
  - **Can Run In Parallel:** YES
  - **Parallel Group:** Wave 1 (with Task 2)
  - **Blocks:** Tasks 3, 4, 5
  - **Blocked By:** None

  **References**:
  - API-Proxy endpoints: `/drama/featured`, `/drama/latest`, `/drama/rank`, `/drama/channel/:id`, `/drama/indo`, `/drama/search`, `/drama/suggest`, `/drama/episodes/:bookId`
  - API-Proxy base URL from env: `API_PROXY_URL` (default: `http://localhost:3002`)

  **Acceptance Criteria**:
  - [x] Service exports functions: `getFeatured()`, `getLatest()`, `getRank()`, `getChannel()`, `getIndo()`, `search()`, `suggest()`, `getEpisodes(bookId)`
  - [x] Each function handles timeouts and retries
  - [x] Errors are logged and thrown as HTTPException
  - [x] bun test services/api-proxy.service.test.ts → PASS

  **Agent-Executed QA**:

  ```
  Scenario: HTTP client calls api-proxy
    Tool: Bash (bun test)
    Steps:
      1. Run unit tests for api-proxy service
      2. Assert all 9 methods exist and are callable
      3. Mock server responds correctly
      4. Timeout and retry logic works
    Expected Result: All tests pass
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `feat(api): add api-proxy HTTP client service`
  - Files: `apps/api/src/services/api-proxy.service.ts`, `apps/api/src/services/api-proxy.service.test.ts`
  - Pre-commit: `bun test apps/api/src/services/api-proxy.service.test.ts`

- [x] 2. Add Environment Configuration

  **What to do**:
  - Add `API_PROXY_URL` to `apps/api/src/lib/env.ts`
  - Update `apps/api/.env.example` with `API_PROXY_URL=http://api-proxy:3002`
  - Update `docker-compose.yml` to add api-proxy service and internal network
  - Ensure api-proxy is healthy before API starts

  **Must NOT do**:
  - Don't hardcode URLs
  - Don't remove existing env vars

  **Recommended Agent Profile**:
  - **Category:** `quick`
  - **Skills:** `docker-expert`
  - Reason: Docker Compose network configuration

  **Parallelization**:
  - **Can Run In Parallel:** YES
  - **Parallel Group:** Wave 1 (with Task 1)
  - **Blocks:** Tasks 3, 4, 5, 6
  - **Blocked By:** None

  **References**:
  - Current env.ts pattern in `apps/api/src/lib/env.ts`
  - Existing docker-compose.yml structure

  **Acceptance Criteria**:
  - [x] `API_PROXY_URL` is read from environment
  - [x] Default value works for local dev (`http://localhost:3002`)
  - [x] Docker Compose has `api-proxy` service
  - [x] API service depends on api-proxy health check

  **Agent-Executed QA**:

  ```
  Scenario: Environment variables loaded
    Tool: Bash
    Steps:
      1. cat apps/api/.env.example | grep API_PROXY_URL
      2. Assert shows API_PROXY_URL=http://api-proxy:3002
      3. docker-compose config | grep -A5 api-proxy
      4. Assert service exists with proper network
    Expected Result: Config correctly set up
    Evidence: Config output captured
  ```

  **Commit**: YES
  - Message: `chore(api): add api-proxy env config and docker setup`
  - Files: `apps/api/src/lib/env.ts`, `apps/api/.env.example`, `docker-compose.yml`
  - Pre-commit: `docker-compose config` (validate YAML)

- [x] 3. Create Catalog Routes

  **What to do**:
  - Create `apps/api/src/routes/catalog.ts`
  - Mount at `/api/catalog`
  - Implement: GET `/featured`, GET `/latest`, GET `/rank`, GET `/channel/:id`, GET `/indo`
  - Use api-proxy service from Task 1
  - Add caching headers (5 min for catalog data)
  - Transform response format to match API conventions

  **Must NOT do**:
  - Don't duplicate api-proxy logic
  - Don't cache internally (use HTTP headers only)

  **Recommended Agent Profile**:
  - **Category:** `unspecified-low`
  - **Skills:** `hono-routing`
  - Reason: Standard Hono route implementation

  **Parallelization**:
  - **Can Run In Parallel:** YES (after Wave 1)
  - **Parallel Group:** Wave 2 (with Task 4)
  - **Blocks:** Task 6
  - **Blocked By:** Tasks 1, 2

  **References**:
  - Pattern from `apps/api/src/routes/dramas.ts`
  - API-Proxy endpoints: `/drama/featured`, `/drama/latest`, etc.

  **Acceptance Criteria**:
  - [x] All 5 catalog endpoints implemented
  - [x] Response format matches API conventions (`{ success: true, data: [...] }`)
  - [x] Proper query param validation (page, size, type, id)
  - [x] Error handling returns proper HTTP status codes

  **Agent-Executed QA**:

  ```
  Scenario: Catalog endpoints return data
    Tool: Bash (curl)
    Preconditions: API and API-Proxy running
    Steps:
      1. curl http://localhost:3001/api/catalog/featured?page=1&size=10
      2. Assert status 200, data array present
      3. curl http://localhost:3001/api/catalog/latest
      4. curl http://localhost:3001/api/catalog/rank?type=1
      5. curl http://localhost:3001/api/catalog/channel/205
      6. curl http://localhost:3001/api/catalog/indo
      7. Assert all return valid drama arrays
    Expected Result: All catalog endpoints working
    Evidence: Responses saved to .sisyphus/evidence/catalog-*.json
  ```

  **Commit**: YES
  - Message: `feat(api): add catalog routes with api-proxy integration`
  - Files: `apps/api/src/routes/catalog.ts`
  - Pre-commit: Manual curl test of one endpoint

- [x] 4. Create Search Routes

  **What to do**:
  - Create `apps/api/src/routes/search.ts`
  - Mount at `/api/search`
  - Implement: GET `/search?q=keyword`, GET `/search/suggest?q=keyword`
  - Use api-proxy service from Task 1
  - Add validation for required `q` parameter

  **Must NOT do**:
  - Don't implement search in database (use api-proxy)

  **Recommended Agent Profile**:
  - **Category:** `quick`
  - **Skills:** `hono-routing`
  - Reason: Simple route implementation

  **Parallelization**:
  - **Can Run In Parallel:** YES (after Wave 1)
  - **Parallel Group:** Wave 2 (with Task 3)
  - **Blocks:** Task 6
  - **Blocked By:** Tasks 1, 2

  **References**:
  - API-Proxy search endpoints: `/drama/search`, `/drama/suggest`
  - Pattern from `apps/api/src/routes/dramas.ts`

  **Acceptance Criteria**:
  - [x] Search endpoint returns results for query
  - [x] Suggest endpoint returns autocomplete suggestions
  - [x] Missing `q` parameter returns 400 error
  - [x] Empty results handled gracefully

  **Agent-Executed QA**:

  ```
  Scenario: Search and suggest working
    Tool: Bash (curl)
    Preconditions: API and API-Proxy running
    Steps:
      1. curl "http://localhost:3001/api/search?q=love"
      2. Assert status 200, data array present
      3. curl "http://localhost:3001/api/search/suggest?q=lov"
      4. Assert returns array of suggestions
      5. curl "http://localhost:3001/api/search" (no q)
      6. Assert status 400
    Expected Result: Search functionality complete
    Evidence: Responses saved to .sisyphus/evidence/search-*.json
  ```

  **Commit**: YES
  - Message: `feat(api): add search routes with autocomplete`
  - Files: `apps/api/src/routes/search.ts`
  - Pre-commit: Manual curl test

- [x] 5. Implement Video URL Fallback

  **What to do**:
  - Modify `apps/api/src/routes/videos.ts`
  - Enhance `GET /api/episodes/:id/videos` to check if DB URLs are stale
  - If stale/missing: fetch fresh URLs from `/drama/episodes/:bookId` via api-proxy
  - Need to get drama's bookId from database (episodes joined with dramas)
  - Return source indicator: "primary" (DB) or "fallback" (api-proxy)
  - Keep existing circuit breaker fallback as last resort

  **Must NOT do**:
  - Don't permanently update database with fallback URLs (read-only)
  - Don't remove existing circuit breaker fallback logic

  **Recommended Agent Profile**:
  - **Category:** `unspecified-low`
  - **Skills:** `hono-routing`, `drizzle-orm-d1`
  - Reason: Database query + HTTP call integration

  **Parallelization**:
  - **Can Run In Parallel:** YES (after Wave 1)
  - **Parallel Group:** Wave 3
  - **Blocks:** Task 6
  - **Blocked By:** Tasks 1, 2

  **References**:
  - Current videos route: `apps/api/src/routes/videos.ts`
  - Database schema: episodes have dramaId, dramas have bookId
  - API-Proxy endpoint: `/drama/episodes/:bookId`

  **Acceptance Criteria**:
  - [x] Video endpoint first tries DB
  - [x] If DB URLs stale/empty, fetches from api-proxy using bookId
  - [x] Response includes source field: "primary" | "fallback" | "circuit-breaker"
  - [x] Stale detection: URL returns 404 or videoUrls empty object
  - [x] All existing tests still pass

  **Agent-Executed QA**:

  ```
  Scenario: Video fallback working
    Tool: Bash (curl)
    Preconditions: API running with stale DB URLs
    Steps:
      1. curl http://localhost:3001/api/episodes/{id}/videos
      2. Assert response contains videoUrls
      3. Assert source is "fallback"
      4. Verify video URLs are accessible (HEAD request)
      5. Screenshot/video playback test
    Expected Result: Fresh video URLs served
    Evidence: Response saved to .sisyphus/evidence/video-fallback.json
  ```

  **Commit**: YES
  - Message: `feat(api): implement video URL fallback from api-proxy`
  - Files: `apps/api/src/routes/videos.ts`
  - Pre-commit: `bun test apps/api/src/test/fallback.test.ts`

- [x] 6. Mount Routes and Integration Testing

  **What to do**:
  - Update `apps/api/src/app.ts` to mount new routes:
    - `app.route("/api/catalog", catalogRoutes)`
    - `app.route("/api/search", searchRoutes)`
  - Ensure route order is correct (catalog/search before generic routes)
  - Run full integration test
  - Test all new endpoints end-to-end
  - Verify Docker Compose works correctly

  **Must NOT do**:
  - Don't break existing routes
  - Don't change existing route paths

  **Recommended Agent Profile**:
  - **Category:** `unspecified-low`
  - **Skills:** `hono-routing`, `docker-expert`
  - Reason: Route mounting + Docker verification

  **Parallelization**:
  - **Can Run In Parallel:** NO
  - **Parallel Group:** Wave 4 (final)
  - **Blocks:** None
  - **Blocked By:** Tasks 3, 4, 5

  **References**:
  - Current app.ts route mounting pattern
  - Docker Compose file structure

  **Acceptance Criteria**:
  - [x] All new routes mounted correctly
  - [x] No route conflicts
  - [x] Docker Compose starts all services
  - [x] All endpoints respond correctly
  - [x] Video playback works in UI

  **Agent-Executed QA**:

  ```
  Scenario: Full integration test
    Tool: Bash (curl + docker-compose)
    Steps:
      1. docker-compose up -d
      2. Wait for health checks
      3. Test all catalog endpoints
      4. Test search endpoints
      5. Test video endpoint with fallback
      6. Verify existing routes still work
      7. docker-compose down
    Expected Result: All services integrated
    Evidence: Test results saved
  ```

  **Commit**: YES
  - Message: `feat(api): mount catalog/search routes, integrate api-proxy`
  - Files: `apps/api/src/app.ts`
  - Pre-commit: Full curl test suite

---

## New API Endpoints Summary

### Catalog Endpoints (`/api/catalog`)

```
GET /api/catalog/featured?page=1&size=20     → Featured dramas
GET /api/catalog/latest?page=1&size=20       → Latest dramas
GET /api/catalog/rank?type=1                 → Ranked dramas
GET /api/catalog/channel/:id?page=1&size=20  → Channel dramas
GET /api/catalog/indo?page=1&size=20         → Indonesian dubbed
```

### Search Endpoints (`/api/search`)

```
GET /api/search?q=keyword&page=1&size=20     → Search dramas
GET /api/search/suggest?q=keyword            → Autocomplete
```

### Enhanced Video Endpoint

```
GET /api/episodes/:id/videos
  → Returns: { success, data: { episodeId, videoUrls, qualities, source } }
  → Source: "primary" (DB) | "fallback" (api-proxy) | "circuit-breaker" (external)
```

---

## Environment Variables

Add to `apps/api/.env`:

```env
# API-Proxy Configuration
API_PROXY_URL=http://api-proxy:3002  # Use localhost:3002 for local dev
```

---

## Docker Compose Changes

Add to `docker-compose.yml`:

```yaml
services:
  api-proxy:
    build:
      context: .
      dockerfile: apps/api-proxy/Dockerfile
    ports:
      - "3002:3002"
    environment:
      - PORT=3002
      - PRIVATE_KEY=${PRIVATE_KEY}
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3002/"]
      interval: 30s
      timeout: 10s
      retries: 3

  api:
    # ... existing config ...
    depends_on:
      postgres:
        condition: service_healthy
      api-proxy:
        condition: service_healthy
    environment:
      # ... existing env ...
      - API_PROXY_URL=http://api-proxy:3002
```

---

## Success Criteria

### Verification Commands

```bash
# Test catalog
curl http://localhost:3001/api/catalog/featured
curl http://localhost:3001/api/catalog/latest
curl http://localhost:3001/api/catalog/rank?type=1

# Test search
curl "http://localhost:3001/api/search?q=love"
curl "http://localhost:3001/api/search/suggest?q=lov"

# Test video fallback
curl http://localhost:3001/api/episodes/{episode-id}/videos

# Docker test
docker-compose up -d
# All services should start and respond
docker-compose down
```

### Final Checklist

- [x] All 7 new endpoints working
- [x] Video fallback fetches fresh URLs
- [x] Docker Compose network configured
- [x] No existing functionality broken
- [x] All tests passing

---

## Notes

**Data Flow:**

1. User requests video → API checks DB → URLs stale? → Fetch from API-Proxy → Return fresh URLs
2. User requests catalog → API calls API-Proxy → Transform response → Return to user
3. User searches → API calls API-Proxy → Return results

**Error Handling:**

- API-Proxy down: Return 503 with appropriate error message
- Timeout: Return 504 Gateway Timeout
- Invalid bookId: Return 404

**Caching Strategy:**

- API layer: Only HTTP Cache-Control headers (no internal caching)
- API-Proxy layer: Already has NodeCache (5-60 min TTL)
- This avoids double caching complexity
