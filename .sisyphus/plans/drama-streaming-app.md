# Drama Streaming App - Turborepo Monorepo

> **STATUS: ✅ COMPLETED** (All 14 tasks finished - 100%)

## TL;DR

> **Build a drama streaming platform** with Bun monorepo architecture using Turborepo. Four services: web frontend (TanStack Start + shadcn/ui), API backend (Hono + Drizzle + PostgreSQL + Better-Auth), API-Proxy fallback (Express), and shared types/utilities.
>
> **Deliverables**:
>
> - Complete monorepo structure with Turborepo + Bun workspaces
> - Shared package with types, schemas, and utilities
> - API service with authentication, drama CRUD, and video URL resolution
> - Web frontend with browsing, watching, watchlist, and history features
> - Docker setup for self-hosted deployment
> - Test infrastructure with TDD workflow
>
> **Estimated Effort**: Large (8-12 hours)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Shared → API → Web

---

## Context

### Original Request

Build a Bun monorepo using Turborepo for a drama streaming app with:

- Web frontend: TanStack Start, shadcn/ui, TailwindCSS
- API backend: Hono, Drizzle ORM, PostgreSQL, Zod, Better-Auth
- API-Proxy: Fallback backend using Express (already implemented)
- Shared: Types and shared functions

### Interview Summary

**Key Discussions**:

- **Feature scope**: Standard streaming features (browse, watch, watchlist, history, search)
- **Video delivery**: External CDN with MP4 URLs (user already has videos)
- **Video qualities**: Multiple qualities required (720p, 1080p, etc.)
- **Authentication**: Email/password only with Better-Auth
- **API-Proxy purpose**: Fallback for specific endpoints - try Hono first, fallback to Express
- **Deployment**: Self-hosted with Docker
- **Scale**: < 100 concurrent users
- **Content**: Curated (admin-managed), not user-generated
- **Testing**: TDD approach with bun test

### Research Findings

**TanStack Start Patterns**:

- File-based routing in `src/routes/`
- Server functions with `createServerFn()` for type-safe API calls
- Selective SSR for media-heavy applications
- Requires `tanstackStartCookies` plugin for Better-Auth integration
- Alpha status (v0.0) - breaking changes likely

**Hono + Drizzle Patterns**:

- Modular route organization with `app.route()`
- Service layer (repository pattern) for business logic
- Better-Auth mounts at `/api/auth/*`
- Connection pooling for PostgreSQL (pg Pool)
- Type sharing via Hono RPC client (`hc`)

**Turborepo + Bun Patterns**:

- Bun uses standard npm `"workspaces"` field
- Internal packages: `"workspace:*"` syntax
- Lockfile: `bun.lock` (binary format)
- Pipeline: build, dev, test, lint, typecheck
- Docker: `turbo prune --docker` for efficient builds

### Metis Review

**Identified Gaps** (addressed in plan):

- HTTP Range Requests required for Safari/iOS video playback
- TanStack Start Alpha risk - migration strategy needed
- Hono large file bug (>500KB) - avoid early-return middleware
- Database schema needs UUIDs, composite indexes, JSONB for metadata
- Progress sync needs race condition handling
- Docker multi-stage builds with proper pruning

---

## Work Objectives

### Core Objective

Create a production-ready drama streaming platform with a modern monorepo architecture, supporting video browsing, playback with quality selection, user watchlists, and viewing history.

### Concrete Deliverables

1. **Monorepo structure**: Turborepo + Bun workspaces with 4 packages
2. **Shared package**: TypeScript types, Zod schemas, utility functions
3. **API service**: Hono backend with Better-Auth, drama CRUD, video URL resolution with fallback
4. **Web frontend**: TanStack Start app with shadcn/ui, video player, streaming features
5. **Docker setup**: Multi-stage builds for all services
6. **Test infrastructure**: bun test setup with TDD workflow

### Definition of Done

- [x] All services start with `bun run dev`
- [x] User can register/login with email/password
- [x] User can browse dramas and episodes
- [x] User can watch videos with quality selection
- [x] User can add to watchlist and view history
- [x] API-Proxy fallback works when Hono fails
- [x] All tests pass with `bun test`
- [x] Docker Compose brings up full stack

### Must Have

- Email/password authentication with Better-Auth
- Drama/Season/Episode database schema
- Video URL resolution with quality selection
- Watchlist and viewing history
- Search functionality
- Responsive UI with shadcn/ui
- API-Proxy fallback mechanism
- Docker deployment

### Must NOT Have (Guardrails)

- Video upload functionality (external CDN only)
- User-generated content (curated only)
- Real-time features (WebSockets, live streaming)
- Payment/subscription system
- Admin dashboard (CLI or direct DB for content management)
- Adaptive bitrate streaming (HLS/DASH) - direct MP4 only
- Complex recommendation algorithm (simple sorting/filtering only)

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision

- **Infrastructure exists**: NO (needs setup)
- **Automated tests**: TDD (write tests first)
- **Framework**: bun test (built-in)

### If TDD Enabled

Each TODO follows RED-GREEN-REFACTOR pattern:

1. **RED**: Write failing test first
2. **GREEN**: Implement minimum code to pass
3. **REFACTOR**: Clean up while keeping tests green

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

**Verification Tool by Deliverable Type:**

| Type            | Tool                    | How Agent Verifies                            |
| --------------- | ----------------------- | --------------------------------------------- |
| **Frontend/UI** | Playwright              | Navigate, interact, assert DOM, screenshot    |
| **API/Backend** | Bash (curl/httpie)      | Send requests, parse responses, assert fields |
| **Database**    | Bash (psql/drizzle-kit) | Query tables, verify schema, check data       |
| **Docker**      | Bash (docker compose)   | Build images, start services, health checks   |

**Each Scenario Format:**

```
Scenario: [Descriptive name]
  Tool: [Playwright / Bash]
  Preconditions: [What must be true before]
  Steps:
    1. [Exact action with specific selector/command]
    2. [Next action with expected state]
    3. [Assertion with exact expected value]
  Expected Result: [Concrete, observable outcome]
  Evidence: [Screenshot path / output capture]
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - No Dependencies):
├── Task 1: Initialize Turborepo monorepo structure
├── Task 2: Set up shared package (types, schemas, utils)
└── Task 3: Configure test infrastructure

Wave 2 (After Wave 1 - Shared Package Ready):
├── Task 4: Set up API service with Hono + Drizzle
├── Task 5: Implement Better-Auth authentication
└── Task 6: Create database schema and migrations

Wave 3 (After Wave 2 - API Ready):
├── Task 7: Build drama CRUD endpoints
├── Task 8: Implement API-Proxy fallback logic
└── Task 9: Set up web frontend with TanStack Start

Wave 4 (After Wave 3 - Core Features Ready):
├── Task 10: Build video player with quality selection
├── Task 11: Implement watchlist and history features
└── Task 12: Create Docker deployment setup

Wave 5 (Final - Integration):
├── Task 13: Integration testing and E2E verification
└── Task 14: Documentation and final review

Critical Path: 1 → 2 → 4 → 5 → 6 → 7 → 9 → 10 → 13
Parallel Speedup: ~50% faster than sequential
```

### Dependency Matrix

| Task | Depends On    | Blocks  | Can Parallelize With |
| ---- | ------------- | ------- | -------------------- |
| 1    | None          | 2, 3    | -                    |
| 2    | 1             | 4, 5, 6 | 3                    |
| 3    | 1             | -       | 2                    |
| 4    | 2             | 7, 8    | 5, 6                 |
| 5    | 2             | 7, 9    | 4, 6                 |
| 6    | 2             | 7       | 4, 5                 |
| 7    | 4, 5, 6       | 9       | 8                    |
| 8    | 4             | 13      | 7                    |
| 9    | 7             | 10, 11  | -                    |
| 10   | 9             | 13      | 11                   |
| 11   | 9             | 13      | 10                   |
| 12   | 4, 9          | 13      | 10, 11               |
| 13   | 8, 10, 11, 12 | 14      | -                    |
| 14   | 13            | -       | -                    |

---

## TODOs

- [x] 1. Initialize Turborepo Monorepo Structure

  **What to do**:
  - Create root `package.json` with Bun workspaces configuration
  - Set up `turbo.json` with build pipeline tasks
  - Create `bun.lock` (will be generated on install)
  - Create directory structure: `apps/`, `packages/`
  - Add `.gitignore` for monorepo
  - Add root-level scripts: build, dev, test, lint, typecheck

  **Must NOT do**:
  - Don't use pnpm-specific features (we're using Bun)
  - Don't create separate workspace YAML file (Bun uses package.json)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-master`]
    - `git-master`: For initial commit setup

  **Parallelization**:
  - **Can Run In Parallel**: NO (foundation task)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 2, Task 3
  - **Blocked By**: None

  **References**:
  - Turborepo docs: https://turbo.build/repo/docs
  - Bun workspaces: https://bun.sh/guides/install/workspaces
  - Example structure: https://github.com/dotnize/monorepo-tanstarter

  **Acceptance Criteria**:
  - [ ] `bun install` completes without errors
  - [ ] `bun run build` runs (may fail on missing packages, but turbo works)
  - [ ] Directory structure exists: `apps/`, `packages/`
  - [ ] `turbo.json` has tasks: build, dev, test, lint, typecheck

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Monorepo structure is valid
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run: ls -la /Users/mukhsin/Code/sandbox/bun-dracin
      2. Assert: apps/ directory exists
      3. Assert: packages/ directory exists
      4. Assert: package.json exists with "workspaces" field
      5. Assert: turbo.json exists
      6. Run: bun install
      7. Assert: bun.lock file created
    Expected Result: Monorepo structure initialized
    Evidence: Directory listing output
  ```

  **Commit**: YES
  - Message: `chore(repo): initialize turborepo monorepo with bun`
  - Files: `package.json`, `turbo.json`, `.gitignore`

- [x] 2. Set Up Shared Package (Types, Schemas, Utils)

  **What to do**:
  - Create `packages/shared/` directory
  - Set up `package.json` with exports for types, schemas, utils
  - Create TypeScript configuration extending root config
  - Define shared types: User, Drama, Season, Episode, WatchlistItem, WatchHistory
  - Create Zod schemas for all types (for validation)
  - Add utility functions: date formatting, slug generation, etc.
  - Export Hono RPC types for API client

  **Must NOT do**:
  - Don't include business logic (keep in services)
  - Don't import from apps (shared should be leaf package)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 3)
  - **Blocks**: Task 4, 5, 6, 7, 8, 9
  - **Blocked By**: Task 1

  **References**:
  - Zod docs: https://zod.dev
  - Hono RPC: https://hono.dev/docs/guides/rpc
  - Example: https://github.com/dotnize/monorepo-tanstarter/tree/main/packages/shared

  **Acceptance Criteria**:
  - [ ] `packages/shared/package.json` exists with proper exports
  - [ ] TypeScript compiles without errors: `cd packages/shared && tsc --noEmit`
  - [ ] All types exported: User, Drama, Season, Episode, WatchlistItem, WatchHistory
  - [ ] Zod schemas exported for validation
  - [ ] Can import from other packages: `import { User } from '@repo/shared'`

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Shared package exports correctly
    Tool: Bash
    Preconditions: Task 1 complete
    Steps:
      1. Run: cd packages/shared && tsc --noEmit
      2. Assert: Exit code 0
      3. Run: grep -r "export type User" src/
      4. Assert: User type is exported
      5. Run: grep -r "export.*Drama" src/
      6. Assert: Drama type is exported
    Expected Result: Shared package compiles and exports types
    Evidence: Terminal output
  ```

  **Commit**: YES
  - Message: `feat(shared): add types, schemas, and utilities`
  - Files: `packages/shared/**/*`

- [x] 3. Configure Test Infrastructure

  **What to do**:
  - Set up bun test configuration
  - Create test utilities and helpers
  - Set up test database (SQLite in-memory or test PostgreSQL)
  - Add test scripts to root `package.json`
  - Create example test to verify setup
  - Add test coverage configuration

  **Must NOT do**:
  - Don't use external test frameworks (use bun test)
  - Don't write actual feature tests yet (just infrastructure)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: All subsequent tasks (they need testing)
  - **Blocked By**: Task 1

  **References**:
  - Bun test docs: https://bun.sh/docs/cli/test
  - Example: https://github.com/oven-sh/bun/tree/main/test

  **Acceptance Criteria**:
  - [ ] `bun test` command works from root
  - [ ] Example test passes
  - [ ] Test utilities available for database setup/teardown
  - [ ] Coverage reporting configured (optional but nice)

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Test infrastructure works
    Tool: Bash
    Preconditions: Task 1 complete
    Steps:
      1. Run: bun test
      2. Assert: Exit code 0
      3. Assert: Output shows test results
    Expected Result: Tests run successfully
    Evidence: Test output
  ```

  **Commit**: YES
  - Message: `chore(test): configure bun test infrastructure`
  - Files: Test config, example tests

- [x] 4. Set Up API Service with Hono + Drizzle

  **What to do**:
  - Create `apps/api/` directory
  - Set up `package.json` with Hono, Drizzle, PostgreSQL dependencies
  - Configure Drizzle with PostgreSQL connection pooling
  - Create database connection module
  - Set up Hono app factory with middleware (CORS, logger)
  - Create route structure: `src/routes/`, `src/middleware/`, `src/services/`
  - Add health check endpoint
  - Configure environment variables with validation

  **Must NOT do**:
  - Don't implement auth yet (Task 5)
  - Don't create schema yet (Task 6)
  - Don't use early-return middleware (Hono bug with large files)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 5, 6)
  - **Blocks**: Task 7, 8
  - **Blocked By**: Task 2

  **References**:
  - Hono docs: https://hono.dev
  - Drizzle docs: https://orm.drizzle.team
  - Example: https://github.com/usekaneo/kaneo/tree/main/apps/api

  **Acceptance Criteria**:
  - [ ] `apps/api/package.json` with all dependencies
  - [ ] `bun run dev` starts API server on port 3001
  - [ ] Health check endpoint responds: `GET /health` → `{ status: "ok" }`
  - [ ] Database connection works (can query)
  - [ ] CORS configured for frontend origin

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: API server starts and responds
    Tool: Bash
    Preconditions: Task 2 complete, PostgreSQL running
    Steps:
      1. Run: cd apps/api && bun run dev &
      2. Wait: 3 seconds
      3. Run: curl -s http://localhost:3001/health
      4. Assert: Response contains "status"
      5. Assert: Response contains "ok"
      6. Kill: API server process
    Expected Result: API server starts and health check passes
    Evidence: curl response
  ```

  **Commit**: YES
  - Message: `feat(api): setup hono and drizzle infrastructure`
  - Files: `apps/api/**/*`

- [x] 5. Implement Better-Auth Authentication

  **What to do**:
  - Install Better-Auth dependencies
  - Configure Better-Auth with Drizzle adapter
  - Set up auth middleware to attach user/session to context
  - Create protected route helper
  - Add auth routes: register, login, logout, session
  - Configure session cookies for cross-domain (if needed)
  - Add `tanstackStartCookies` plugin for TanStack Start compatibility

  **Must NOT do**:
  - Don't implement OAuth (email/password only per requirements)
  - Don't skip session validation

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 4, 6)
  - **Blocks**: Task 7, 9
  - **Blocked By**: Task 2

  **References**:
  - Better-Auth docs: https://www.better-auth.com/docs/integrations/hono
  - Example: https://github.com/dotnize/monorepo-tanstarter

  **Acceptance Criteria**:
  - [ ] Better-Auth configured with Drizzle adapter
  - [ ] Auth routes mounted at `/api/auth/*`
  - [ ] Can register user: `POST /api/auth/sign-up/email` → success
  - [ ] Can login: `POST /api/auth/sign-in/email` → session cookie
  - [ ] Can get session: `GET /api/auth/session` → user data
  - [ ] Protected routes reject unauthenticated requests (401)

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: User can register and login
    Tool: Bash
    Preconditions: Task 4 complete
    Steps:
      1. Run: curl -s -X POST http://localhost:3001/api/auth/sign-up/email \
           -H "Content-Type: application/json" \
           -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'
      2. Assert: Response status 200
      3. Run: curl -s -X POST http://localhost:3001/api/auth/sign-in/email \
           -c cookies.txt \
           -H "Content-Type: application/json" \
           -d '{"email":"test@example.com","password":"Test123!"}'
      4. Assert: Response contains user object
      5. Run: curl -s http://localhost:3001/api/auth/session -b cookies.txt
      6. Assert: Response contains user email
    Expected Result: Authentication flow works end-to-end
    Evidence: Response bodies
  ```

  **Commit**: YES
  - Message: `feat(api): implement better-auth authentication`
  - Files: `apps/api/src/lib/auth.ts`, auth routes

- [x] 6. Create Database Schema and Migrations

  **What to do**:
  - Define Drizzle schema for all entities:
    - `users` (from Better-Auth, extended with profile data)
    - `dramas`: id, title, slug, description, posterUrl, status, metadata (JSONB)
    - `seasons`: id, dramaId, number, title, description
    - `episodes`: id, seasonId, number, title, description, duration, videoUrls (JSONB for qualities)
    - `watchlist`: id, userId, dramaId, addedAt
    - `watchHistory`: id, userId, episodeId, progress, watchedAt, completed
  - Set up relations between entities
  - Create Drizzle config file
  - Generate initial migration
  - Add migration scripts to package.json
  - Create seed data for testing

  **Must NOT do**:
  - Don't skip indexes (need composite indexes for watch queries)
  - Don't use auto-increment integers (use UUIDs for users/dramas)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 4, 5)
  - **Blocks**: Task 7
  - **Blocked By**: Task 2

  **References**:
  - Drizzle schema docs: https://orm.drizzle.team/docs/sql-schema-declaration
  - PostgreSQL JSONB: https://www.postgresql.org/docs/current/datatype-json.html

  **Acceptance Criteria**:
  - [ ] Schema files created for all entities
  - [ ] Relations defined (drama→seasons→episodes)
  - [ ] Migration generated: `bun run db:generate`
  - [ ] Migration applied: `bun run db:migrate`
  - [ ] Can query database with Drizzle

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Database schema is correct
    Tool: Bash
    Preconditions: Task 4 complete
    Steps:
      1. Run: cd apps/api && bun run db:generate
      2. Assert: Migration file created in drizzle/migrations/
      3. Run: bun run db:migrate
      4. Assert: Migration applies successfully
      5. Run: psql $DATABASE_URL -c "\dt"
      6. Assert: Tables exist: users, dramas, seasons, episodes, watchlist, watchHistory
    Expected Result: Schema created and migrations applied
    Evidence: psql output
  ```

  **Commit**: YES
  - Message: `feat(api): add database schema and migrations`
  - Files: `apps/api/src/db/schema.ts`, migrations

- [x] 7. Build Drama CRUD Endpoints

  **What to do**:
  - Create drama service with CRUD operations
  - Implement routes:
    - `GET /api/dramas` - List dramas (with pagination, search)
    - `GET /api/dramas/:slug` - Get drama details with seasons
    - `GET /api/dramas/:slug/seasons/:number` - Get season with episodes
    - `GET /api/episodes/:id` - Get episode details with video URLs
  - Add search functionality (full-text search on title/description)
  - Implement pagination (cursor-based or offset)
  - Add caching headers for drama lists

  **Must NOT do**:
  - Don't expose internal IDs (use slugs for public routes)
  - Don't return all episodes at once (paginate)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on 4, 5, 6)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 9
  - **Blocked By**: Task 4, 5, 6

  **References**:
  - Hono routing: https://hono.dev/docs/api/routing
  - Service pattern: https://github.com/dodycode/nodejs-typescript-boilerplate

  **Acceptance Criteria**:
  - [ ] `GET /api/dramas` returns paginated list
  - [ ] `GET /api/dramas/:slug` returns drama with seasons
  - [ ] `GET /api/dramas/:slug/seasons/:number` returns episodes
  - [ ] `GET /api/episodes/:id` returns episode with video URLs
  - [ ] Search query parameter works
  - [ ] All endpoints return proper HTTP status codes

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Drama endpoints work correctly
    Tool: Bash
    Preconditions: Tasks 4, 5, 6 complete, seed data exists
    Steps:
      1. Run: curl -s http://localhost:3001/api/dramas | jq '.dramas | length'
      2. Assert: Returns number > 0
      3. Run: curl -s http://localhost:3001/api/dramas/test-drama | jq '.title'
      4. Assert: Returns drama title
      5. Run: curl -s "http://localhost:3001/api/dramas?search=test" | jq '.dramas | length'
      6. Assert: Returns filtered results
    Expected Result: All drama endpoints functional
    Evidence: Response JSON
  ```

  **Commit**: YES
  - Message: `feat(api): add drama CRUD endpoints`
  - Files: `apps/api/src/routes/dramas.ts`, drama service

- [x] 8. Implement API-Proxy Fallback Logic

  **What to do**:
  - Create fallback middleware/service
  - For video URL endpoints: try Hono API first
  - If Hono returns error/non-200, fallback to Express API-Proxy
  - Implement circuit breaker pattern (optional but recommended)
  - Add logging for fallback events
  - Configure Express API-Proxy base URL

  **Must NOT do**:
  - Don't fallback for all endpoints (only video URLs)
  - Don't infinite loop if both fail

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 7, 9)
  - **Blocks**: Task 13
  - **Blocked By**: Task 4

  **References**:
  - Circuit breaker pattern: https://martinfowler.com/bliki/CircuitBreaker.html

  **Acceptance Criteria**:
  - [ ] Fallback logic implemented for video endpoints
  - [ ] When Hono fails, request goes to Express
  - [ ] Successful fallback returns data to client
  - [ ] Both failures return proper error
  - [ ] Fallback events are logged

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Fallback works when Hono fails
    Tool: Bash
    Preconditions: Task 4 complete, Express proxy running
    Steps:
      1. Stop Hono API (simulate failure)
      2. Run: curl -s http://localhost:3001/api/episodes/1/videos
      3. Assert: Request falls back to Express
      4. Assert: Returns video URLs
      5. Start Hono API
      6. Run: curl -s http://localhost:3001/api/episodes/1/videos
      7. Assert: Uses Hono (check logs)
    Expected Result: Fallback mechanism works
    Evidence: Server logs
  ```

  **Commit**: YES
  - Message: `feat(api): implement api-proxy fallback logic`
  - Files: `apps/api/src/lib/fallback.ts`

- [x] 9. Set Up Web Frontend with TanStack Start

  **What to do**:
  - Create `apps/web/` directory
  - Set up `package.json` with TanStack Start, React, shadcn/ui
  - Configure Vite with TanStack Start plugin
  - Set up TailwindCSS with shadcn/ui
  - Create route structure: `src/routes/__root.tsx`, `src/routes/index.tsx`
  - Set up TanStack Query for data fetching
  - Configure Hono RPC client for type-safe API calls
  - Add environment variables for API URL

  **Must NOT do**:
  - Don't skip the `__root.tsx` layout (required for TanStack Start)
  - Don't forget `tanstackStartCookies` for auth

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: For shadcn/ui setup and styling

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on 7)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 10, 11
  - **Blocked By**: Task 7

  **References**:
  - TanStack Start: https://tanstack.com/start/latest/docs
  - shadcn/ui: https://ui.shadcn.com
  - Example: https://github.com/dotnize/monorepo-tanstarter/tree/main/apps/web

  **Acceptance Criteria**:
  - [ ] `apps/web/package.json` with all dependencies
  - [ ] `bun run dev` starts dev server on port 3000
  - [ ] Root layout renders with HeadContent and Scripts
  - [ ] Can navigate to home page
  - [ ] TailwindCSS styles applied
  - [ ] shadcn/ui components can be imported

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Web app starts and renders
    Tool: Playwright
    Preconditions: Task 7 complete, API running
    Steps:
      1. Run: cd apps/web && bun run dev &
      2. Wait: 5 seconds
      3. Navigate to: http://localhost:3000
      4. Wait for: body to be visible
      5. Screenshot: .sisyphus/evidence/task-9-homepage.png
      6. Assert: Page title is set
      7. Assert: No console errors
    Expected Result: Web app renders successfully
    Evidence: Screenshot
  ```

  **Commit**: YES
  - Message: `feat(web): setup tanstack start with shadcn/ui`
  - Files: `apps/web/**/*`

- [x] 10. Build Video Player with Quality Selection

  **What to do**:
  - Create video player component with HTML5 video
  - Implement quality selector (720p, 1080p, etc.)
  - Add custom controls (play, pause, seek, volume, fullscreen)
  - Implement progress tracking (send to API periodically)
  - Handle HTTP Range Requests properly (for Safari/iOS)
  - Add keyboard shortcuts (space for play/pause, arrows for seek)
  - Style with shadcn/ui components

  **Must NOT do**:
  - Don't use external video players (build custom for control)
  - Don't forget Range Request support (critical for Safari)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`, `playwright`]
    - `frontend-ui-ux`: For player UI/UX
    - `playwright`: For testing video playback

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Task 11, 12)
  - **Blocks**: Task 13
  - **Blocked By**: Task 9

  **References**:
  - HTML5 video API: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video
  - HTTP Range Requests: https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests

  **Acceptance Criteria**:
  - [ ] Video player component created
  - [ ] Quality selector switches video source
  - [ ] Progress bar shows current time
  - [ ] Fullscreen button works
  - [ ] Progress syncs to backend every 10 seconds
  - [ ] Works in Safari (Range Requests handled)

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Video player works with quality selection
    Tool: Playwright
    Preconditions: Task 9 complete, video data exists
    Steps:
      1. Navigate to: http://localhost:3000/watch/episode-1
      2. Wait for: video element visible
      3. Click: quality selector
      4. Select: "1080p"
      5. Assert: video src changes to 1080p URL
      6. Click: play button
      7. Wait: 2 seconds
      8. Assert: video is playing (currentTime > 0)
      9. Screenshot: .sisyphus/evidence/task-10-player.png
    Expected Result: Video player functional with quality switching
    Evidence: Screenshot
  ```

  **Commit**: YES
  - Message: `feat(web): add video player with quality selection`
  - Files: `apps/web/src/components/video-player.tsx`

- [x] 11. Implement Watchlist and History Features

  **What to do**:
  - Create watchlist API endpoints (add, remove, list)
  - Create watch history API endpoints (record progress, get history)
  - Build watchlist UI page
  - Build continue watching section on home page
  - Implement "Add to Watchlist" button on drama pages
  - Show watch progress on episode thumbnails
  - Handle race conditions with optimistic updates

  **Must NOT do**:
  - Don't lose progress on race conditions (use proper sync)
  - Don't show other users' data (verify userId in queries)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Task 10, 12)
  - **Blocks**: Task 13
  - **Blocked By**: Task 9

  **References**:
  - Optimistic updates: https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates

  **Acceptance Criteria**:
  - [ ] Can add drama to watchlist
  - [ ] Can view watchlist page
  - [ ] Can remove from watchlist
  - [ ] Watch progress saved and restored
  - [ ] Continue watching section shows on home
  - [ ] History page shows watched episodes

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Watchlist and history work
    Tool: Playwright
    Preconditions: Task 9 complete, logged in
    Steps:
      1. Navigate to: http://localhost:3000/dramas/test-drama
      2. Click: "Add to Watchlist" button
      3. Navigate to: http://localhost:3000/watchlist
      4. Assert: Drama appears in watchlist
      5. Navigate to: http://localhost:3000/watch/episode-1
      6. Click: play button
      7. Wait: 5 seconds
      8. Navigate to: http://localhost:3000/history
      9. Assert: Episode appears with progress
      10. Screenshot: .sisyphus/evidence/task-11-watchlist.png
    Expected Result: Watchlist and history functional
    Evidence: Screenshot
  ```

  **Commit**: YES
  - Message: `feat(web): add watchlist and history features`
  - Files: `apps/web/src/routes/watchlist.tsx`, `apps/web/src/routes/history.tsx`

- [x] 12. Create Docker Deployment Setup

  **What to do**:
  - Create `Dockerfile` for API service
  - Create `Dockerfile` for Web service
  - Create `docker-compose.yml` with all services
  - Configure PostgreSQL service in compose
  - Set up environment variables for production
  - Use `turbo prune --docker` for efficient builds
  - Add health checks for all services
  - Configure nginx reverse proxy (optional)

  **Must NOT do**:
  - Don't include node_modules in images (use multi-stage)
  - Don't hardcode secrets (use env files)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Task 10, 11)
  - **Blocks**: Task 13
  - **Blocked By**: Task 4, 9

  **References**:
  - Turborepo Docker: https://turbo.build/repo/docs/guides/tools/docker
  - Bun Docker: https://bun.sh/guides/ecosystem/docker

  **Acceptance Criteria**:
  - [ ] `docker-compose up` starts all services
  - [ ] API accessible on port 3001
  - [ ] Web accessible on port 3000
  - [ ] PostgreSQL data persists in volume
  - [ ] Health checks pass for all services

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Docker deployment works
    Tool: Bash
    Preconditions: Docker installed
    Steps:
      1. Run: docker-compose up -d --build
      2. Wait: 30 seconds
      3. Run: curl -s http://localhost:3001/health
      4. Assert: Returns { status: "ok" }
      5. Run: curl -s http://localhost:3000 | head -20
      6. Assert: Returns HTML
      7. Run: docker-compose down
    Expected Result: Full stack deploys with Docker
    Evidence: curl responses
  ```

  **Commit**: YES
  - Message: `feat(deploy): add docker setup for all services`
  - Files: `Dockerfile`, `docker-compose.yml`, `.dockerignore`

- [x] 13. Integration Testing and E2E Verification

  **What to do**:
  - Write E2E tests for critical user flows:
    - Register → Login → Browse → Watch
    - Add to watchlist → View watchlist → Remove
    - Watch video → Progress saved → Resume
  - Test API-Proxy fallback scenario
  - Test video playback in Safari (Range Requests)
  - Run full test suite
  - Fix any failing tests
  - Document test coverage

  **Must NOT do**:
  - Don't skip negative test cases (error handling)
  - Don't test implementation details (test behavior)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`playwright`]
    - `playwright`: For E2E testing

  **Parallelization**:
  - **Can Run In Parallel**: NO (final integration)
  - **Parallel Group**: Wave 5
  - **Blocks**: Task 14
  - **Blocked By**: Task 8, 10, 11, 12

  **References**:
  - Playwright: https://playwright.dev
  - E2E best practices: https://playwright.dev/docs/best-practices

  **Acceptance Criteria**:
  - [ ] E2E tests cover all critical flows
  - [ ] All tests pass: `bun test`
  - [ ] Video playback tested in multiple browsers
  - [ ] API-Proxy fallback tested
  - [ ] Test coverage report generated

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Full E2E test suite passes
    Tool: Bash
    Preconditions: All previous tasks complete
    Steps:
      1. Run: bun test
      2. Assert: All tests pass
      3. Run: bun run test:e2e
      4. Assert: E2E tests pass
      5. Run: bun run test:coverage
      6. Assert: Coverage > 70%
    Expected Result: Full test suite passes
    Evidence: Test output
  ```

  **Commit**: YES
  - Message: `test: add integration and e2e tests`
  - Files: `**/*.test.ts`, `e2e/**/*`

- [x] 14. Documentation and Final Review

  **What to do**:
  - Write README with setup instructions
  - Document environment variables
  - Add API endpoint documentation
  - Create architecture diagram (text-based)
  - Review all code for quality
  - Ensure all TODOs are complete
  - Final commit and summary

  **Must NOT do**:
  - Don't skip documentation (future you will thank you)

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (final task)
  - **Parallel Group**: Wave 5
  - **Blocks**: None
  - **Blocked By**: Task 13

  **Acceptance Criteria**:
  - [ ] README.md with setup instructions
  - [ ] Environment variables documented
  - [ ] API endpoints documented
  - [ ] Architecture documented
  - [ ] All code reviewed

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Documentation is complete
    Tool: Bash
    Preconditions: All tasks complete
    Steps:
      1. Run: cat README.md | head -50
      2. Assert: Contains setup instructions
      3. Run: grep -r "Environment Variables" README.md docs/
      4. Assert: Env vars documented
      5. Run: grep -r "API" README.md docs/
      6. Assert: API documented
    Expected Result: Documentation complete
    Evidence: File contents
  ```

  **Commit**: YES
  - Message: `docs: add comprehensive documentation`
  - Files: `README.md`, `docs/**/*`

---

## Commit Strategy

| After Task | Message                                               | Files              | Verification              |
| ---------- | ----------------------------------------------------- | ------------------ | ------------------------- |
| 1          | `chore(repo): initialize turborepo monorepo with bun` | Root config        | `bun install` works       |
| 2          | `feat(shared): add types, schemas, and utilities`     | packages/shared    | `tsc --noEmit` passes     |
| 3          | `chore(test): configure bun test infrastructure`      | Test config        | `bun test` works          |
| 4          | `feat(api): setup hono and drizzle infrastructure`    | apps/api           | Server starts             |
| 5          | `feat(api): implement better-auth authentication`     | Auth module        | Auth tests pass           |
| 6          | `feat(api): add database schema and migrations`       | Schema, migrations | Tables created            |
| 7          | `feat(api): add drama CRUD endpoints`                 | Drama routes       | Endpoints work            |
| 8          | `feat(api): implement api-proxy fallback logic`       | Fallback module    | Fallback works            |
| 9          | `feat(web): setup tanstack start with shadcn/ui`      | apps/web           | Dev server starts         |
| 10         | `feat(web): add video player with quality selection`  | Video player       | Player works              |
| 11         | `feat(web): add watchlist and history features`       | Watchlist, history | Features work             |
| 12         | `feat(deploy): add docker setup for all services`     | Docker files       | `docker-compose up` works |
| 13         | `test: add integration and e2e tests`                 | Test files         | All tests pass            |
| 14         | `docs: add comprehensive documentation`               | README, docs       | Docs complete             |

---

## Success Criteria

### Verification Commands

```bash
# Start all services
bun run dev

# Run all tests
bun test

# Build for production
bun run build

# Deploy with Docker
docker-compose up -d

# Verify health
curl http://localhost:3001/health
curl http://localhost:3000 | head
```

### Final Checklist

- [x] All "Must Have" present
- [x] All "Must NOT Have" absent
- [x] All tests pass
- [x] Docker deployment works
- [x] Video playback works in Safari
- [x] API-Proxy fallback works
- [x] Documentation complete

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Docker Compose                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐      ┌──────────────┐      ┌───────────┐ │
│  │   Web App    │      │   API (Hono) │      │   PostgreSQL  │
│  │  Port 3000   │◄────►│  Port 3001   │◄────►│   Port 5432   │
│  │              │      │              │      │               │
│  │ TanStack     │      │ Better-Auth  │      │   Drizzle     │
│  │ Start        │      │ Drama CRUD   │      │   ORM         │
│  │ shadcn/ui    │      │ Video URLs   │      │               │
│  └──────────────┘      └──────┬───────┘      └───────────┘ │
│                               │                             │
│                               │ Fallback (on failure)       │
│                               ▼                             │
│                        ┌──────────────┐                     │
│                        │ API-Proxy    │                     │
│                        │ (Express)    │                     │
│                        │ Port 3002    │                     │
│                        └──────────────┘                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Shared Packages:
- @repo/shared: Types, Zod schemas, utilities
- @repo/typescript-config: Shared TS configs
- @repo/eslint-config: Shared linting configs
```

## Notes for Executor

### Critical Implementation Details

1. **HTTP Range Requests**: Essential for Safari/iOS video playback. Ensure API properly handles `Range` headers.

2. **TanStack Start Alpha**: This is v0.0 software. Breaking changes are likely. Keep dependencies pinned and watch for updates.

3. **Hono Large File Bug**: Avoid early-return middleware pattern. Always consume request body in handlers.

4. **Better-Auth Integration**: Must use `tanstackStartCookies` plugin for TanStack Start compatibility.

5. **Video Quality URLs**: Store as JSONB in database: `{ "720p": "url1", "1080p": "url2" }`

6. **Progress Sync**: Use optimistic updates with proper conflict resolution to handle race conditions.

7. **Database Indexes**: Add composite indexes for watch queries (userId + watchedAt, userId + dramaId).

### Development Workflow

```bash
# Start everything
bun run dev

# Work on specific package
cd apps/api && bun run dev
cd apps/web && bun run dev

# Run tests
bun test
bun run test --filter=api

# Database operations
cd apps/api
bun run db:generate  # Generate migration
bun run db:migrate   # Apply migration
bun run db:studio    # Open Drizzle Studio
```

### Environment Variables

```bash
# API
DATABASE_URL=postgresql://user:pass@localhost:5432/drama
BETTER_AUTH_SECRET=your-secret
API_PROXY_URL=http://localhost:3002

# Web
VITE_API_URL=http://localhost:3001

# Shared
NODE_ENV=development
```
