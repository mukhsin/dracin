# Database Schema Revamp - Remaining Tasks

> **STATUS: ✅ COMPLETED** (All tasks finished)

## TL;DR

> **Quick Summary**: Complete the database schema revamp by updating test fixtures to match the new flattened schema (dramas→episodes, no seasons), and finalize ambiguous data handling decisions.
>
> **Deliverables**:
>
> - Updated test fixtures in `history.test.ts` and `watchlist.test.ts`
> - Decisions documented for video URLs, duration, and play count handling
> - All tests passing with new schema
>
> **Estimated Effort**: Short (2-3 hours)
> **Parallel Execution**: NO - sequential tasks
> **Critical Path**: Update test fixtures → Run tests → Verify

---

## Context

### Original Request

Complete the remaining tasks from the database schema revamp: update test files and resolve ambiguous data handling items.

### What Was Already Completed

- ✅ Migration file: `0001_remove_seasons_update_schema.sql`
- ✅ Import script: `import-sql-data.ts`
- ✅ Schema updated: Flattened dramas→episodes (no seasons table)
- ✅ Service layer: `drama.service.ts` already uses new schema

### Current State

The schema has been successfully flattened:

- **dramas table**: Has `book_id`, `language`, `play_count`, `source_endpoint`, `metadata` (JSONB)
- **episodes table**: Has `drama_id` (direct reference), `book_id`, `number`, `duration`, `video_urls` (JSONB), `source_url`
- **No seasons table** - completely removed

### Critical Gap

Test files still use old fixture functions that don't include new schema columns:

- `apps/api/src/test/history.test.ts` (lines 65-102)
- `apps/api/src/test/watchlist.test.ts` (lines 75-114)

### Ambiguous Items

| Item                   | Current State                                           | Decision Needed          |
| ---------------------- | ------------------------------------------------------- | ------------------------ |
| **Episode video URLs** | SQL has single URL, schema supports multi-quality JSONB | How to handle in tests?  |
| **Play count**         | All NULL in SQL data                                    | Default value for tests? |
| **Episode duration**   | Not provided in SQL data                                | Default value for tests? |

---

## Work Objectives

### Core Objective

Update test fixtures to match the new flattened schema and ensure all tests pass.

### Concrete Deliverables

- Updated `createTestDrama()` function in both test files
- Updated `createTestEpisode()` function in both test files
- All tests passing (`bun test`)

### Definition of Done

- [x] `bun test apps/api/src/test/history.test.ts` → PASS
- [x] `bun test apps/api/src/test/watchlist.test.ts` → PASS
- [x] No references to `seasons` table in test files

### Must Have

- Test fixtures include all new schema columns (`book_id`, `language`, `play_count`, `source_endpoint`, `source_url`)
- Tests verify same behavior as before (watchlist add/remove, history record/retrieve)

### Must NOT Have (Guardrails)

- MUST NOT: Modify test assertions or test logic (only fixtures)
- MUST NOT: Change schema.ts (already finalized)
- MUST NOT: Modify import script (already working)
- MUST NOT: Add new test files or test cases

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision

- **Infrastructure exists**: YES (bun:test already configured)
- **Automated tests**: Tests-after (update fixtures, then run tests)
- **Framework**: bun:test

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

**Example — Test Verification (Bash):**

```
Scenario: Test fixtures compile and tests pass
  Tool: Bash
  Preconditions: Database running, migrations applied
  Steps:
    1. cd apps/api && bun test src/test/history.test.ts
    2. Assert: Exit code 0
    3. Assert: Output contains "X tests passed"
    4. cd apps/api && bun test src/test/watchlist.test.ts
    5. Assert: Exit code 0
    6. Assert: Output contains "Y tests passed"
  Expected Result: All tests pass with new fixtures
  Evidence: Terminal output captured
```

---

## Execution Strategy

### Parallel Execution Waves

This is a sequential task - test fixtures must be updated before tests can run.

```
Wave 1 (Sequential):
├── Task 1: Update history.test.ts fixtures
├── Task 2: Update watchlist.test.ts fixtures
└── Task 3: Run tests and verify
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
| ---- | ---------- | ------ | -------------------- |
| 1    | None       | 2, 3   | None                 |
| 2    | None       | 3      | None                 |
| 3    | 1, 2       | None   | None                 |

---

## TODOs

- [x] 1. Update history.test.ts fixtures

  **What to do**:
  - Update `createTestDrama()` function (lines 65-85)
    - Add `bookId: number` parameter (optional, auto-generate if not provided)
    - Add `language: "en"` (or parameter)
    - Add `playCount: 0`
    - Add `sourceEndpoint: null` or test URL
  - Update `createTestEpisode()` function (lines 86-102)
    - Add `bookId: number` parameter (optional, auto-generate if not provided)
    - Add `sourceUrl: string` parameter (use videoUrls[720p] as default)
    - Keep `videoUrls` as JSONB with quality keys
    - Keep `duration` (use 3600 as default for 1 hour)

  **Must NOT do**:
  - Change test assertions or test logic
  - Remove any existing test cases
  - Add new dependencies

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple fixture updates, no complex logic
  - **Skills**: [`drizzle-orm-d1`]
    - `drizzle-orm-d1`: Understand schema types and column names

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 3 (test verification)
  - **Blocked By**: None

  **References**:
  - `apps/api/src/db/schema.ts` - Current schema with all columns
  - `apps/api/src/test/history.test.ts:65-102` - Current fixture functions
  - `apps/api/src/db/import-sql-data.ts` - How import script handles data

  **Acceptance Criteria**:
  - [ ] `createTestDrama()` includes: `bookId`, `language`, `playCount`, `sourceEndpoint`
  - [ ] `createTestEpisode()` includes: `bookId`, `sourceUrl`
  - [ ] TypeScript compiles without errors
  - [ ] `bun test src/test/history.test.ts` → PASS

  **Agent-Executed QA Scenario:**

  ```
  Scenario: history.test.ts fixtures updated and tests pass
    Tool: Bash
    Preconditions: apps/api directory, database running
    Steps:
      1. cd /Users/mukhsin/Code/sandbox/bun-dracin/apps/api
      2. bun test src/test/history.test.ts 2>&1
      3. Assert: Exit code equals 0
      4. Assert: Output contains "passed" (not "failed")
    Expected Result: All history tests pass
    Evidence: Terminal output saved to .sisyphus/evidence/task-1-history-test.log
  ```

  **Commit**: YES
  - Message: `test(api): update history.test.ts fixtures for flattened schema`
  - Files: `apps/api/src/test/history.test.ts`
  - Pre-commit: `bun test src/test/history.test.ts`

---

- [x] 2. Update watchlist.test.ts fixtures

  **What to do**:
  - Update `createTestDrama()` function (lines 75-95)
    - Same changes as history.test.ts
  - Update `createTestEpisode()` function (lines 96-114)
    - Same changes as history.test.ts

  **Must NOT do**:
  - Change test assertions or test logic
  - Remove any existing test cases

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Same fixture updates as Task 1
  - **Skills**: [`drizzle-orm-d1`]
    - `drizzle-orm-d1`: Schema understanding

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 1)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 3
  - **Blocked By**: None

  **References**:
  - `apps/api/src/test/watchlist.test.ts:75-114` - Current fixture functions
  - `apps/api/src/test/history.test.ts` - Reference after Task 1 completes

  **Acceptance Criteria**:
  - [ ] `createTestDrama()` includes all new columns
  - [ ] `createTestEpisode()` includes all new columns
  - [ ] TypeScript compiles without errors
  - [ ] `bun test src/test/watchlist.test.ts` → PASS

  **Agent-Executed QA Scenario:**

  ```
  Scenario: watchlist.test.ts fixtures updated and tests pass
    Tool: Bash
    Preconditions: apps/api directory, database running
    Steps:
      1. cd /Users/mukhsin/Code/sandbox/bun-dracin/apps/api
      2. bun test src/test/watchlist.test.ts 2>&1
      3. Assert: Exit code equals 0
      4. Assert: Output contains "passed" (not "failed")
    Expected Result: All watchlist tests pass
    Evidence: Terminal output saved to .sisyphus/evidence/task-2-watchlist-test.log
  ```

  **Commit**: YES
  - Message: `test(api): update watchlist.test.ts fixtures for flattened schema`
  - Files: `apps/api/src/test/watchlist.test.ts`
  - Pre-commit: `bun test src/test/watchlist.test.ts`

---

- [x] 3. Verify all tests pass and check for seasons references

  **What to do**:
  - Run both test files together
  - Search for any remaining references to `seasons` table in test files
  - Verify no TypeScript errors

  **Must NOT do**:
  - Modify any other files
  - Add new test cases

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Verification only
  - **Skills**: [] (no special skills needed)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (final verification)
  - **Blocks**: None
  - **Blocked By**: Task 1, Task 2

  **References**:
  - `apps/api/src/test/*.test.ts` - All test files to verify

  **Acceptance Criteria**:
  - [ ] `bun test src/test/history.test.ts src/test/watchlist.test.ts` → ALL PASS
  - [ ] `grep -r "seasons" apps/api/src/test/` → No matches (or only in comments)
  - [ ] `bun run typecheck` → No errors

  **Agent-Executed QA Scenario:**

  ```
  Scenario: All tests pass and no seasons references remain
    Tool: Bash
    Preconditions: Tasks 1 and 2 complete
    Steps:
      1. cd /Users/mukhsin/Code/sandbox/bun-dracin/apps/api
      2. bun test src/test/history.test.ts src/test/watchlist.test.ts 2>&1
      3. Assert: Exit code equals 0
      4. grep -r "seasons" src/test/ | grep -v "// " | wc -l
      5. Assert: Output equals "0" (no non-comment references)
      6. bun run typecheck 2>&1 | tail -5
      7. Assert: Output contains "0 errors"
    Expected Result: All tests pass, no seasons references, no type errors
    Evidence:
      - Test output: .sisyphus/evidence/task-3-all-tests.log
      - Grep results: .sisyphus/evidence/task-3-seasons-check.log
  ```

  **Commit**: NO (no code changes, just verification)

---

## Decisions Made (From Previous Session)

### Video URL Handling

**Decision**: Tests should continue using multi-quality JSONB format (`{ "720p": "url" }`) because:

- The schema supports it
- The video player expects it
- Import script populates `source_url` with SQL data, tests can populate `video_urls`

### Episode Duration

**Decision**: Use `3600` (60 minutes) as default in test fixtures because:

- Provides realistic test data
- Matches typical drama episode length
- Can be overridden per test if needed

### Play Count

**Decision**: Use `0` as default in test fixtures because:

- Matches typical new drama state
- Clearer than NULL for test assertions
- Can be updated in specific tests if needed

### Book ID

**Decision**: Auto-generate random BIGINT (10 digits) if not provided because:

- Maintains referential integrity within test
- Allows tests to not care about specific IDs
- Matches SQL data format

---

## Updated Fixture Reference

```typescript
// Updated createTestDrama for both test files
async function createTestDrama(title: string, slug: string, bookId?: number) {
  const [drama] = await db
    .insert(dramas)
    .values({
      bookId: bookId || Math.floor(Math.random() * 10000000000),
      title,
      slug,
      description: `Test description for ${title}`,
      posterUrl: "https://example.com/poster.jpg",
      status: "ongoing",
      language: "en",
      playCount: 0,
      sourceEndpoint: null,
      metadata: {
        releaseYear: 2024,
        country: "Test",
        genre: ["Drama"],
        totalEpisodes: 16,
      },
    })
    .returning();
  return drama;
}

// Updated createTestEpisode for both test files
async function createTestEpisode(
  dramaId: string,
  number: number,
  bookId?: number,
  duration = 3600,
) {
  const videoUrl = `https://example.com/video-${number}.mp4`;
  const [episode] = await db
    .insert(episodes)
    .values({
      dramaId,
      bookId: bookId || Math.floor(Math.random() * 10000000000),
      number,
      title: `Episode ${number}`,
      description: `Test episode ${number}`,
      duration,
      videoUrls: { "720p": videoUrl, "1080p": videoUrl },
      sourceUrl: videoUrl,
    })
    .returning();
  return episode;
}
```

---

## Commit Strategy

| After Task | Message                                                             | Files             | Verification                 |
| ---------- | ------------------------------------------------------------------- | ----------------- | ---------------------------- |
| 1          | `test(api): update history.test.ts fixtures for flattened schema`   | history.test.ts   | `bun test history.test.ts`   |
| 2          | `test(api): update watchlist.test.ts fixtures for flattened schema` | watchlist.test.ts | `bun test watchlist.test.ts` |

---

## Success Criteria

### Verification Commands

```bash
# Run all API tests
cd apps/api && bun test src/test/history.test.ts src/test/watchlist.test.ts
# Expected: All tests pass

# Check for seasons references
grep -r "seasons" apps/api/src/test/ | grep -v "// "
# Expected: No output (no non-comment references)

# Type check
bun run typecheck
# Expected: No errors
```

### Final Checklist

- [ ] All test fixtures include new schema columns
- [ ] All tests pass
- [ ] No references to seasons table in test files
- [ ] TypeScript compiles without errors
