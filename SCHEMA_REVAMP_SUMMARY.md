# Database Schema Revamp - Summary

## Overview

Successfully merged the old schema (dramas → seasons → episodes) with the SQL data structure (dramas → episodes directly) while preserving UUID relationships and adding book_id from SQL files.

## Schema Changes

### Removed

- **Seasons table** - No longer needed, flattened hierarchy

### Updated Dramas Table

- `id` (UUID) - Primary key (unchanged)
- `book_id` (BIGINT) - NEW: External ID from SQL files for correlation
- `title` (text) - unchanged
- `slug` (text) - unchanged
- `description` (text) - unchanged
- `poster_url` (text) - unchanged
- `status` (enum) - kept with default 'upcoming'
- `language` (text) - NEW: From SQL files (en, id, es, pt)
- `play_count` (integer) - NEW: From SQL files
- `source_endpoint` (text) - NEW: From SQL files
- `metadata` (jsonb) - kept for flexibility
- `created_at`, `updated_at` - unchanged

### Updated Episodes Table

- `id` (UUID) - Primary key (unchanged)
- `drama_id` (UUID) - NEW: Direct reference to drama (replaces season_id)
- `book_id` (BIGINT) - NEW: External ID from SQL files
- `number` (integer) - unchanged
- `title` (text) - unchanged
- `description` (text) - unchanged
- `duration` (integer) - unchanged
- `video_urls` (jsonb) - unchanged
- `source_url` (text) - NEW: From SQL files
- `created_at` - unchanged

## Files Modified

### Schema & Database

1. `apps/api/src/db/schema.ts` - Updated schema definition
2. `apps/api/src/db/seed.ts` - Updated to work without seasons
3. `apps/api/src/db/import-sql-data.ts` - NEW: Script to import SQL data
4. `apps/api/drizzle/migrations/0001_remove_seasons_update_schema.sql` - NEW: Migration

### Services

5. `apps/api/src/services/drama.service.ts` - Updated to work without seasons
6. `apps/api/src/services/history.service.ts` - Updated to work without seasons

### Routes

7. `apps/api/src/routes/dramas.ts` - Updated routes (removed seasons endpoint)

### Shared Types

8. `packages/shared/src/types/index.ts` - Updated types (removed Season, updated Episode)

### Package Scripts

9. `apps/api/package.json` - Added `db:import-sql` script

## Migration Plan

### Step 1: Run Migration

```bash
cd apps/api
bun run db:migrate
```

This will:

- Add new columns to dramas and episodes tables
- Migrate existing episode data to point directly to dramas
- Drop seasons table and related constraints
- Create new indexes

### Step 2: Import SQL Data

```bash
cd apps/api
bun run db:import-sql
```

This will parse all SQL files (en.sql, id.sql, es.sql, pt.sql) and import:

- ~322k episodes across all languages
- Dramas with book_id correlation
- Episode URLs and metadata

## API Changes

### Removed Endpoints

- `GET /api/dramas/:slug/seasons/:number` - No longer needed

### Modified Endpoints

- `GET /api/dramas/:slug` - Now returns drama with episodes directly (no seasons wrapper)
- `GET /api/dramas/:slug/episodes` - NEW: Get episodes for a drama

### Response Changes

Episode objects no longer have `seasonId`, instead have `dramaId` directly.

## URL Structure

New watch URL format:

```
/watch/:dramaSlug/:episodeNumber
```

Example:

```
/watch/my-stunning-boss-lady/1
```

## Remaining Tasks

### Test Files Need Updates

The following test files reference the old schema with seasons:

- `apps/api/src/test/history.test.ts`
- `apps/api/src/test/watchlist.test.ts`

These need to be updated to:

1. Remove references to `seasons` table
2. Update episode creation to use `dramaId` instead of `seasonId`
3. Update test assertions to match new response structure

### Frontend Updates

The web app may need updates to:

- Handle new episode structure (no season wrapper)
- Update routing to new URL format
- Update type imports from shared package

## Data Statistics

From SQL files:

- **en.sql**: ~82 dramas, ~140k episodes
- **id.sql**: ~78 dramas, ~62k episodes
- **es.sql**: ~82 dramas, ~66k episodes
- **pt.sql**: ~64 dramas, ~51k episodes
- **Total**: ~306 dramas, ~319k episodes

## Notes

1. **Book ID Correlation**: The `book_id` field allows correlation between our UUID-based data and the external SQL data
2. **Backward Compatibility**: The migration preserves existing data by migrating episode relationships
3. **Language Support**: Dramas now have a `language` field for filtering
4. **Source URLs**: Episode `source_url` stores the original URL from SQL files
