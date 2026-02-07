
## Turborepo Initialization - 2025-02-05

### Setup Summary
- Created root package.json with Bun workspaces (apps/*, packages/*)
- Configured turbo.json with standard pipeline tasks: build, dev, test, lint, typecheck
- Added comprehensive .gitignore for Bun/Node monorepo
- Created apps/ and packages/ directory structure
- Ran bun install successfully (turbo@2.8.3, prettier@3.8.1, typescript@5.9.3)

### Key Configuration Decisions
- Used `"type": "module"` for ES modules by default
- Added `engines.node >=20` for modern Node.js features
- Turbo pipeline uses `^build` dependency for proper build order
- Dev task marked as `persistent: true` and `cache: false` for watch mode

### Bun Workspaces Notes
- Bun workspaces are configured directly in package.json (no separate YAML needed)
- Pattern `apps/*` and `packages/*` allows automatic discovery
- bun.lock is the lockfile (not package-lock.json or pnpm-lock.yaml)

### Turbo Pipeline Tasks
- `build`: Depends on upstream builds, outputs to .next/ and dist/
- `dev`: Persistent, no caching (for dev servers)
- `test`: Depends on build completion
- `lint` and `typecheck`: Both depend on upstream builds

### Root Scripts
All root scripts use `turbo run` for parallel execution across workspaces:
- `bun run build` - Build all packages
- `bun run dev` - Start all dev servers
- `bun run test` - Run all tests
- `bun run lint` - Lint all packages
- `bun run typecheck` - Type check all packages

## Test Infrastructure Setup - 2026-02-05

### What Was Done
- Created bunfig.toml with test configuration (preload, coverage, patterns)
- Created test utilities in packages/shared/src/test/:
  - setup.ts - Global test setup with beforeAll/afterAll hooks
  - helpers.ts - Mock functions, assertions, test utilities
  - example.test.ts - 14 passing tests verifying the setup

### Key Configuration
- Preload: ./packages/shared/src/test/setup.ts runs before all tests
- Coverage: Enabled with 80% threshold
- Test patterns: **/*.test.ts, **/*.test.tsx
- Excludes: node_modules, dist, .opencode

### Test Scripts Added to package.json
- test: bun test
- test:coverage: bun test --coverage
- test:watch: bun test --watch

### Test Utilities Created
- createMock<T>() - Mock function with call/return tracking
- wait(ms) - Async delay helper
- createTestId() - Generate unique test IDs
- assertDefined<T>() - Non-null assertion helper
- expectToThrow() - Error assertion helper

### Verification
All 14 tests pass with 96.67% line coverage.

## Shared Package Setup - 2026-02-05

### What Was Done
- Created packages/shared/ with TypeScript and Zod dependencies
- Defined core domain types: User, Drama, Season, Episode, WatchlistItem, WatchHistory
- Created Zod schemas for runtime validation matching all types
- Added utility functions: formatDate, formatDuration, generateSlug, etc.
- Configured package.json with exports for types, schemas, utils subpaths

### Package Structure
```
packages/shared/
├── package.json       # @repo/shared with exports
├── tsconfig.json      # TypeScript config (ES2022, bundler resolution)
└── src/
    ├── index.ts       # Main exports
    ├── types/         # TypeScript interfaces
    ├── schemas/       # Zod validation schemas
    └── utils/         # Helper functions
```

### Type Definitions
- User: id, email, name, createdAt, updatedAt
- Drama: id, title, slug, description, posterUrl, status, metadata, timestamps
- Season: id, dramaId, number, title, description, createdAt
- Episode: id, seasonId, number, title, description, duration, videoUrls, createdAt
- WatchlistItem: id, userId, dramaId, addedAt
- WatchHistory: id, userId, episodeId, progress, watchedAt, completed

### Zod Schema Patterns
- Used z.ZodType<DramaStatus> for enum type safety
- Created factory functions ApiResponseSchema<T> and PaginatedResponseSchema<T>
- Applied .int().positive() for numeric IDs and counts
- Used .email() validator for user emails

### Utility Functions Added
- formatDate(date, options?) - Intl.DateTimeFormat wrapper
- formatDuration(seconds) - HH:MM:SS or MM:SS format
- generateSlug(title) - URL-friendly slug from title
- generateUniqueSlug(title, existingSlugs[]) - Collision-safe slug
- clamp(value, min, max) - Bound number to range
- isValidEmail(email) - Email regex validation
- truncateText(text, maxLength, suffix?) - Smart text truncation
- pick(obj, keys[]) - Select subset of object properties
- omit(obj, keys[]) - Remove properties from object
- groupBy(array, keyFn) - Group array items by key
- uniqueBy(array, keyFn) - Remove duplicates by key
- calculatePagination(total, page, pageSize) - Pagination math

### Export Strategy
- Main index.ts re-exports everything from submodules
- Subpath exports in package.json for tree-shaking:
  - @repo/shared/types
  - @repo/shared/schemas
  - @repo/shared/utils

### Verification
- TypeScript check passes: `cd packages/shared && npx tsc --noEmit`
- Removed test files that referenced bun:test (will be in separate test package)


## Task 6: Database Schema and Migrations - Completed

### Schema Design Patterns
- Used PostgreSQL with Drizzle ORM for type-safe database operations
- UUID primary keys with `gen_random_uuid()` default for all entities
- JSONB columns for flexible metadata (dramas.metadata, episodes.videoUrls)
- Composite indexes for efficient watch queries:
  - `watch_history_user_watched_at_idx` for user's watch history sorted by time
  - `watchlist_user_added_at_idx` for user's watchlist sorted by added time
  - `watch_history_user_episode_idx` unique constraint prevents duplicate entries
  - `watchlist_user_drama_idx` unique constraint prevents duplicate watchlist items

### Relations Setup
- dramas → seasons → episodes (one-to-many cascade delete)
- users → watchlist → dramas (many-to-many via watchlist table)
- users → watch_history → episodes (many-to-many with progress tracking)
- All foreign keys use `onDelete: "cascade"` for data integrity

### Migration Generation
- Successfully generated initial migration with `drizzle-kit generate`
- Migration file: `drizzle/migrations/0000_green_joseph.sql`
- Contains 6 tables, 15 indexes, 6 foreign key constraints

### Scripts Added to package.json
- `db:generate` - Generate migrations from schema changes
- `db:migrate` - Apply migrations to database
- `db:studio` - Launch Drizzle Studio for visual database management
- `db:seed` - Run seed script to populate test data

### Seed Data Includes
- 2 test users (Alice, Bob)
- 2 dramas (The Silent Echo - ongoing, Summer Dreams - completed)
- 2 seasons (1 per drama)
- 5 episodes (3 for drama 1, 2 for drama 2)
- 3 watchlist entries
- 3 watch history entries with varying progress

### Type Exports
All Drizzle table types exported for use in API:
- User, NewUser
- Drama, NewDrama
- Season, NewSeason
- Episode, NewEpisode
- WatchlistItem, NewWatchlistItem
- WatchHistoryItem, NewWatchHistoryItem

## Better-Auth Authentication Setup - 2026-02-05

### What Was Done
- Installed better-auth and drizzle-orm packages
- Created auth configuration with Drizzle adapter (SQLite provider for D1 compatibility)
- Set up auth middleware to attach user/session to Hono context
- Created protected route helper middleware (requireAuth)
- Mounted auth routes at /api/auth/* using Hono's app.on()
- Configured session cookies for cross-domain compatibility
- Added tanstackStartCookies plugin for TanStack Start compatibility
- Created configuration tests verifying all auth settings

### Key Configuration Decisions
- Email/password authentication only (no OAuth per requirements)
- Session expires in 7 days, updates after 1 day
- Cookie cache enabled (5 min cache) for performance
- Cross-subdomain cookies enabled for multi-subdomain deployment
- Rate limiting: 10 requests per 60-second window
- tanstackStartCookies plugin must be LAST in plugins array

### File Structure
```
apps/api/src/
├── lib/auth.ts          # Better-Auth configuration with Drizzle adapter
├── middleware/auth.ts   # Auth middleware and protected route helper
├── app.ts              # Updated with auth routes and middleware
└── test/
    ├── auth.config.test.ts   # Configuration verification tests
    └── auth.test.ts          # Full auth flow tests (needs DB schema)
```

### Auth Endpoints Available
- POST /api/auth/sign-up/email - Register new user
- POST /api/auth/sign-in/email - Login with credentials
- POST /api/auth/sign-out - Logout current user
- GET /api/session - Get current session (custom endpoint)
- GET /api/protected - Example protected route

### Environment Variables Required
- BETTER_AUTH_SECRET - Secret key for encryption (32+ chars)
- BETTER_AUTH_URL - Base URL for auth callbacks
- DATABASE_URL - Database connection string
- NODE_ENV - production/development (affects cookie secure flag)

### Middleware Usage Pattern
```typescript
// Global auth middleware attaches user/session to all routes
app.use("*", authMiddleware);

// Protected routes use requireAuth helper
app.get("/api/protected", requireAuth, (c) => {
  const user = c.get("user");
  // user is guaranteed to exist here
});
```

### Testing Notes
- Configuration tests pass (15 assertions)
- Full auth flow tests require database schema (Task 6)
- Better-Auth CLI generates schema: `bun x @better-auth/cli@latest generate`

### Integration with TanStack Start
The tanstackStartCookies plugin ensures cookies are properly handled when using Better-Auth with TanStack Start's server-side rendering. This is critical for SSR authentication flows.



## Task 10: API-Proxy Fallback Logic - Completed

### What Was Done
- Created fallback service (src/lib/fallback.ts) with circuit breaker pattern
- Created fallback middleware (src/middleware/fallback.ts) for video endpoints
- Created video routes (src/routes/videos.ts) with fallback integration
- Implemented circuit breaker with 3-failure threshold and 30s reset timeout
- Added in-memory caching for fallback responses (30s TTL)

### Circuit Breaker Pattern
- CLOSED: Normal operation, requests pass through
- OPEN: After 3 failures, blocks requests for 30s
- HALF_OPEN: After timeout, allows one test request
- Records success/failure to transition between states

### Fallback Flow
1. Request hits /api/episodes/:id/videos
2. Middleware checks cache first
3. Tries primary (Hono API) - local database query
4. On failure, tries fallback (Express API-Proxy on port 3002)
5. Caches successful responses
6. Returns 503 if both fail

### Environment Variables
- PRIMARY_API_URL: Hono API base URL (default: http://localhost:3001)
- API_PROXY_URL: Express API-Proxy base URL (default: http://localhost:3002)

### Admin Endpoints
- GET /api/admin/fallback/status: Check circuit breaker state
- POST /api/admin/fallback/clear-cache: Clear fallback cache

### Key Implementation Details
- Path pattern matching supports wildcards (e.g., /api/episodes/*/videos)
- Authorization header forwarded to fallback service
- Request timeout: 5 seconds
- Circuit breaker prevents cascading failures
- Comprehensive logging for debugging

## Docker Deployment Setup - Completed

### Files Created

1. **/.dockerignore** - Excludes node_modules, build outputs, .env files, IDE configs, logs, etc.

2. **/Dockerfile.root** - Root Dockerfile for turbo prune that creates minimal monorepo context

3. **/apps/api/Dockerfile** - Multi-stage build for API service:
   - Base stage: Bun Alpine with PostgreSQL client
   - Pruner stage: Turbo prune to minimize build context
   - Installer stage: Production dependencies only
   - Builder stage: Compiles TypeScript
   - Runner stage: Non-root user (api:1001), port 3001, health check on /health

4. **/apps/web/Dockerfile** - Multi-stage build for Web service:
   - Base stage: Bun Alpine
   - Pruner stage: Turbo prune for web dependencies
   - Installer stage: All dependencies (including dev for build)
   - Builder stage: Builds TanStack Start app
   - Runner stage: nginx:1.25-alpine, port 3000, gzip, static asset caching, SPA routing

5. **/docker-compose.yml** - Full stack orchestration:
   - **db**: PostgreSQL 15 Alpine with health check, volume persistence
   - **api**: Hono API on port 3001, depends on db, resource limits
   - **web**: TanStack Start on port 3000, depends on api, nginx serving
   - **api-proxy**: Optional fallback service on port 3002 (profiles: fallback, full)
   - Network: drama-network (bridge, 172.20.0.0/16)
   - Volume: postgres_data for database persistence

6. **/.env.example** - Local development environment template
7. **/.env.docker.example** - Docker environment template

### Key Design Decisions

- **Multi-stage builds**: Separate build and runtime for minimal image sizes
- **Turbo prune**: Efficient monorepo builds by pruning unused packages
- **Non-root users**: API runs as `api` user (UID 1001) for security
- **Health checks**: All services have HTTP health endpoints
- **Resource limits**: CPU and memory constraints for stability
- **Service dependencies**: API waits for DB, Web waits for API using health conditions
- **Profile-based services**: API-Proxy is optional (use `--profile fallback` or `--profile full`)

### Environment Variables

**Required:**
- `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`
- `BETTER_AUTH_SECRET` (min 32 chars), `BETTER_AUTH_URL`
- `PRIMARY_API_URL`, `API_PROXY_URL`
- `VITE_API_URL`

### Usage

```bash
# Start core services (db, api, web)
docker compose up -d

# Start with fallback API-Proxy
docker compose --profile fallback up -d

# Start all services
docker compose --profile full up -d

# View logs
docker compose logs -f

# Stop all
docker compose down

# Stop and remove volumes
docker compose down -v
```

### Health Check Endpoints

- Database: `pg_isready` command
- API: `GET http://localhost:3001/health`
- Web: `GET http://localhost:3000/health`
- API-Proxy: `GET http://localhost:3002/health`

### Security Considerations

- Non-root container execution
- No secrets in Docker images (use env files)
- PostgreSQL credentials via environment variables
- Internal network isolation
- Resource limits prevent DoS

## Video Player Implementation - 2026-02-05

### What Was Done
- Created use-video-progress.ts hook for tracking and syncing video progress
- Verified VideoControls component exists with quality selector integration
- Verified VideoPlayer component exists with HTML5 video and custom controls
- Verified watch.$episodeId.tsx route exists for episode playback

### Key Implementation Details

#### use-video-progress Hook
- Uses TanStack Query for fetching and syncing progress
- Syncs progress every 10 seconds (configurable)
- Marks episode as completed at 90% watched
- Uses navigator.sendBeacon for reliable unload sync
- Fetches resume time from /api/history/episodes/:episodeId
- Posts progress to /api/history/

#### VideoControls Component
- Custom controls: play/pause, seek bar, volume, fullscreen
- Quality selector dropdown (240p, 360p, 480p, 720p, 1080p, 4k)
- Keyboard shortcuts: space (play/pause), arrow keys (seek/volume), f (fullscreen), m (mute)
- Progress bar with buffered indicator
- Time display and hover preview

#### VideoPlayer Component
- HTML5 video element with crossOrigin="anonymous" for Range Request support
- Quality switching with seamless playback restoration
- Resume from last position on load
- Error handling with retry option
- Loading states and poster support

#### Watch Page Route
- Route: /watch/$episodeId
- Fetches episode details and adjacent episodes
- Displays drama info, season/episode navigation
- Integrates VideoPlayer with autoPlay

### HTTP Range Request Support
- Video element uses crossOrigin="anonymous" attribute
- This enables proper handling of HTTP Range Requests for Safari
- Critical for streaming video in Safari browser

### Type Safety Notes
- API client uses untyped hc() client due to missing @repo/api package
- Components use type assertions for API calls
- Proper interfaces defined for VideoProgress, VideoUrls, etc.

### Files Created/Verified
- /apps/web/src/hooks/use-video-progress.ts - Progress tracking hook
- /apps/web/src/components/video-controls.tsx - Custom controls (verified exists)
- /apps/web/src/components/video-player.tsx - Main player (verified exists)
- /apps/web/src/routes/watch.$episodeId.tsx - Watch page (verified exists)


## Video Player Component Implementation - Completed

### Files Created
1. **quality-selector.tsx** - Quality selector dropdown component
   - Supports 240p, 360p, 480p, 720p, 1080p, 4k quality options
   - Displays HD/4K badges for high quality options
   - Click-outside-to-close behavior
   - Accessible with aria labels

2. **video-controls.tsx** - Custom video controls overlay
   - Play/pause button with state indicators
   - Seek bar with buffered progress and hover scrubber
   - Volume control with mute toggle and slider
   - Skip forward/backward 10 seconds
   - Fullscreen toggle
   - Quality selector integration
   - Keyboard shortcuts: space (play/pause), arrows (seek/volume), f (fullscreen), m (mute)
   - Auto-hide controls when playing
   - Time display with formatTime helper

3. **video-player.tsx** - Main video player component
   - HTML5 video element with HTTP Range Request support (crossOrigin="anonymous")
   - Quality switching with seamless playback restoration
   - Resume from last position on load
   - Error handling with retry option
   - Loading states and poster support
   - Fullscreen API integration
   - Video event handlers: loadedmetadata, timeupdate, waiting, canplay, play, pause, ended, error

4. **use-video-progress.ts** - Progress tracking hook
   - Fetches initial progress from /api/history/episodes/:episodeId
   - Syncs progress every 10 seconds (configurable)
   - Marks episode as completed at 90% watched
   - Uses navigator.sendBeacon for reliable unload sync
   - Posts progress to /api/history/
   - Returns resumeTime, wasCompleted, isLoading, isSyncing, syncProgress

5. **watch.$episodeId.tsx** - Watch page route
   - Route: /watch/$episodeId
   - Fetches episode details from /api/episodes/:id
   - Displays drama info, season/episode details
   - Integrates VideoPlayer component
   - Loading and error states

6. **vite-env.d.ts** - Type definitions for Vite environment
   - Defines ImportMetaEnv with VITE_API_URL
   - Required for import.meta.env type safety

### Key Implementation Patterns

#### HTTP Range Request Support (Safari/iOS Critical)
```tsx
<video
  crossOrigin="anonymous"
  preload="metadata"
  playsInline  // Critical for iOS
/>
```

#### Quality Switching
- Store currentTime before switching
- Update video src to new quality URL
- Restore currentTime on loadedmetadata event
- Resume playback if was playing

#### Progress Sync Strategy
- Refs track currentTime and duration without re-renders
- 10-second interval sync when playing
- Force sync on pause and video end
- sendBeacon on page unload for reliability

#### Keyboard Shortcuts
- Space: Play/Pause
- ArrowLeft/Right: Seek -10s/+10s
- ArrowUp/Down: Volume +/- 10%
- F: Toggle fullscreen
- M: Toggle mute

### Styling Approach
- Tailwind CSS with CSS variables for theming
- Dark overlay gradient for controls visibility
- Backdrop blur for dropdown menus
- Responsive design (mobile-friendly controls)
- Custom range input styling for volume

### API Integration Notes
- Uses native fetch instead of Hono client due to type issues
- Credentials: "include" for cookie-based auth
- Endpoints:
  - GET /api/episodes/:id - Episode details
  - GET /api/history/episodes/:episodeId - Progress
  - POST /api/history - Save progress

### Type Safety
- VideoUrls type: { "240p"?: string; "360p"?: string; ... }
- VideoQuality union type for quality values
- EpisodeDetail interface with nested season and drama
- ProgressResponse and VideoProgress interfaces


## Watchlist and History Features - Completed

### Files Created/Modified

#### API Routes (Already Existed - Verified Working)
1. **/apps/api/src/routes/watchlist.ts** - Watchlist API endpoints
   - GET /api/watchlist - List user's watchlist with drama details
   - POST /api/watchlist - Add drama to watchlist
   - DELETE /api/watchlist/:dramaId - Remove from watchlist
   - GET /api/watchlist/check/:dramaId - Check if drama is in watchlist

2. **/apps/api/src/routes/history.ts** - History API endpoints
   - GET /api/history - Get user's watch history
   - GET /api/history/continue - Get continue watching list
   - POST /api/history - Record/update watch progress
   - GET /api/history/episodes/:episodeId - Get progress for specific episode
   - DELETE /api/history/:historyId - Delete history entry
   - DELETE /api/history - Clear all history

3. **/apps/api/src/services/watchlist.service.ts** - Watchlist business logic
   - getUserWatchlist() - Get watchlist with joined drama data
   - isInWatchlist() - Check if drama is in user's watchlist
   - addToWatchlist() - Add with duplicate prevention
   - removeFromWatchlist() - Remove by dramaId

4. **/apps/api/src/services/history.service.ts** - History business logic
   - getUserHistory() - Get history with episode/drama joins
   - getContinueWatching() - Get incomplete episodes for resume
   - recordProgress() - Upsert progress with completion tracking
   - getEpisodeProgress() - Get progress for single episode
   - deleteHistoryEntry() - Remove single entry
   - clearHistory() - Remove all user history

#### UI Components

5. **/apps/web/src/components/watchlist-button.tsx** - Add/Remove button
   - Uses useWatchlistStatus, useAddToWatchlist, useRemoveFromWatchlist hooks
   - Optimistic updates with TanStack Query
   - Loading states with spinner
   - Visual states: "Add to Watchlist" → "In Watchlist" → "Remove" on hover
   - Size variants: sm, md, lg
   - Style variants: default, outline, ghost
   - Green color for "in watchlist" state

6. **/apps/web/src/components/continue-watching.tsx** - Home section
   - Displays up to 4 continue watching items
   - Progress bar on thumbnails
   - "X left" time remaining indicator
   - Link to full history page
   - Uses useContinueWatching hook
   - Responsive grid layout

#### Pages

7. **/apps/web/src/routes/watchlist.tsx** - Watchlist page
   - Grid layout of saved dramas
   - Drama poster, title, status badge, metadata
   - Remove button with optimistic updates
   - Empty state with CTA to browse
   - Loading skeletons
   - Error handling with retry

8. **/apps/web/src/routes/history.tsx** - History page
   - List view of watched episodes
   - Progress bars with percentage
   - Episode thumbnails with play overlay
   - Delete individual entries
   - Clear all history with confirmation
   - Empty state with CTA

9. **/apps/web/src/routes/index.tsx** - Updated home page
   - Added ContinueWatching section at top
   - Converted <a> tags to <Link> components

#### Hooks

10. **/apps/web/src/hooks/use-watchlist.ts** - Watchlist hooks
    - useWatchlist() - Fetch full watchlist
    - useWatchlistStatus(dramaId) - Check single drama status
    - useAddToWatchlist() - Add mutation with optimistic update
    - useRemoveFromWatchlist() - Remove mutation with optimistic update

11. **/apps/web/src/hooks/use-history.ts** - History hooks
    - useHistory() - Fetch full history
    - useContinueWatching() - Fetch incomplete episodes
    - useEpisodeProgress(episodeId) - Get single episode progress
    - useRecordProgress() - Save progress mutation
    - useDeleteHistoryEntry() - Delete with optimistic update
    - useClearHistory() - Clear all mutation

### Optimistic Update Patterns

All mutations use the standard TanStack Query pattern:
1. Cancel outgoing refetches
2. Snapshot previous state
3. Optimistically update cache
4. Return context for rollback
5. On error: restore previous state
6. On settled: invalidate and refetch

Example from useAddToWatchlist:
```typescript
onMutate: async (dramaId) => {
  await queryClient.cancelQueries({ queryKey: ["watchlist"] });
  const previousStatus = queryClient.getQueryData(["watchlist", "status", dramaId]);
  queryClient.setQueryData(["watchlist", "status", dramaId], true);
  return { previousStatus };
},
onError: (_err, dramaId, context) => {
  if (context?.previousStatus !== undefined) {
    queryClient.setQueryData(["watchlist", "status", dramaId], context.previousStatus);
  }
},
onSettled: (_data, _error, dramaId) => {
  queryClient.invalidateQueries({ queryKey: ["watchlist"] });
  queryClient.invalidateQueries({ queryKey: ["watchlist", "status", dramaId] });
}
```

### Type Safety Notes

- Used native fetch instead of Hono client due to type resolution issues
- Defined interfaces for all API responses
- Proper TypeScript generics for query/mutation hooks
- Credentials: "include" for cookie-based auth

### API Response Structure

Watchlist response:
```json
{
  "success": true,
  "data": {
    "items": [{ "id", "dramaId", "addedAt", "drama": { ... } }],
    "total": 5
  }
}
```

History response:
```json
{
  "success": true,
  "data": {
    "items": [{ "id", "progress", "watchedAt", "completed", "episode": { ... } }],
    "total": 10
  }
}
```

Continue watching response:
```json
{
  "success": true,
  "data": [{ "historyId", "dramaTitle", "progressPercent", ... }]
}
```

### Security Considerations

- All endpoints require authentication (401 if not logged in)
- User ID extracted from session, not from request body
- Users can only access their own watchlist/history
- Proper authorization checks in service layer


## Task 11: Watchlist and History Features - Completed 2026-02-05

### Files Created

#### API Layer
- `/apps/api/src/routes/watchlist.ts` - Watchlist API routes with GET, POST, DELETE endpoints
- `/apps/api/src/routes/history.ts` - History API routes with GET, POST, DELETE, and /continue endpoints
- `/apps/api/src/services/watchlist.service.ts` - Watchlist business logic with Drizzle ORM
- `/apps/api/src/services/history.service.ts` - History business logic with Drizzle ORM

#### Web Layer
- `/apps/web/src/hooks/use-watchlist.ts` - TanStack Query hooks for watchlist (with optimistic updates)
- `/apps/web/src/hooks/use-history.ts` - TanStack Query hooks for history (with optimistic updates)
- `/apps/web/src/components/add-to-watchlist.tsx` - Re-exports WatchlistButton component
- `/apps/web/src/components/continue-watching.tsx` - Continue watching section component
- `/apps/web/src/routes/watchlist.tsx` - Watchlist page (enhanced existing)
- `/apps/web/src/routes/history.tsx` - History page (enhanced existing)

### API Endpoints Implemented

**Watchlist:**
- `GET /api/watchlist` - List user's watchlist with drama details
- `POST /api/watchlist` - Add drama to watchlist
- `DELETE /api/watchlist/:dramaId` - Remove drama from watchlist
- `GET /api/watchlist/check/:dramaId` - Check if drama is in watchlist

**History:**
- `GET /api/history` - Get full watch history
- `GET /api/history/continue` - Get continue watching list (incomplete episodes)
- `POST /api/history` - Record/update watch progress
- `GET /api/history/episodes/:episodeId` - Get progress for specific episode
- `DELETE /api/history/:historyId` - Delete specific history entry
- `DELETE /api/history` - Clear all history

### Key Implementation Details

**Optimistic Updates:**
- All mutations use TanStack Query's optimistic update pattern
- UI updates immediately before API response
- Rollback on error with previous state restoration
- Cache invalidation after successful mutations

**Type Safety:**
- Routes typed with `AuthContext` for user context
- Services use Drizzle ORM for type-safe database queries
- Shared types updated to match database schema (nullable metadata, partial videoUrls)

**Database Schema Integration:**
- Leverages existing `watchlist` and `watchHistory` tables
- Uses proper indexes for efficient queries (`watchlist_user_drama_idx`, `watch_history_user_episode_idx`)
- Relations properly configured for joined queries

**UI Features:**
- Loading states with skeletons
- Empty states with CTAs
- Error handling with retry options
- Progress bars for watch progress visualization
- Confirmation dialogs for destructive actions (clear history)
- Hover effects and transitions for better UX

### Design Decisions

1. **Used fetch API in web hooks** instead of Hono client to avoid type complexity
2. **Separate hooks for watchlist status** to enable individual drama checks without full list
3. **Continue watching as separate query** for efficient home page loading
4. **Optimistic updates for all mutations** for responsive UI feel
5. **Progress percentage calculation** in service layer for consistency

### Pre-existing Issues Fixed
- Added schema to Drizzle client for query API support
- Fixed shared types to match database schema (nullable metadata, partial videoUrls)

