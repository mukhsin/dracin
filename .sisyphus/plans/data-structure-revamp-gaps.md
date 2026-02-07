# Data Structure Revamp - Gap Analysis

## Auto-Resolved Items

These items were automatically resolved during implementation:

### ✅ Schema Design Decisions

1. **status field** - DECISION: Keep with default 'upcoming'
   - Reason: Useful for tracking drama state (ongoing/completed/upcoming)
   - Implementation: Kept as enum with default value

2. **metadata field** - DECISION: Keep as nullable JSONB
   - Reason: Flexible for future extensibility (genres, ratings, etc.)
   - Implementation: Preserved with existing structure

3. **seasons table** - DECISION: Remove completely
   - Reason: SQL data has no seasons, flat hierarchy
   - Implementation: Removed from schema, migration handles data

4. **book_id field type** - DECISION: Use BIGINT
   - Reason: SQL files use large integers (e.g., 41000100291)
   - Implementation: Added to both dramas and episodes tables

### ✅ Field Mappings (Auto-Resolved)

| SQL Field       | Schema Field           | Notes                        |
| --------------- | ---------------------- | ---------------------------- |
| bookId          | book_id                | BIGINT, unique index         |
| title           | title                  | Direct mapping               |
| cover           | poster_url             | Direct mapping               |
| intro           | description            | Direct mapping               |
| chapterCount    | metadata.totalEpisodes | Stored in metadata JSON      |
| playCount       | play_count             | Direct mapping               |
| language        | language               | Direct mapping (en/id/es/pt) |
| source_endpoint | source_endpoint        | Direct mapping               |
| episode_index   | number                 | +1 (0-indexed → 1-indexed)   |
| url             | source_url             | Direct mapping               |

### ✅ URL Structure

- **Format**: `/watch/:dramaSlug/:episodeNumber`
- **Example**: `/watch/my-stunning-boss-lady/1`
- **Implementation**: Updated routes to support this format

---

## Critical Gaps (Require Action)

### 🔴 CRITICAL: Test Files Not Updated

**Status**: PENDING
**Impact**: Type checking fails, tests won't compile

**Files Affected**:

- `apps/api/src/test/history.test.ts`
- `apps/api/src/test/watchlist.test.ts`

**Issues**:

1. Import `seasons` from schema (no longer exported)
2. `createTestSeason` function uses removed table
3. `createTestEpisode` uses `seasonId` instead of `dramaId`
4. Test assertions expect `season` property in responses

**Required Changes**:

```typescript
// BEFORE
import { seasons, episodes } from "../db/schema.js";
await db.insert(episodes).values({ seasonId: testSeasonId, ... });
expect(data.episode.season.drama).toBeDefined();

// AFTER
import { episodes } from "../db/schema.js";
await db.insert(episodes).values({ dramaId: testDramaId, ... });
expect(data.episode.drama).toBeDefined();
```

---

## Minor Gaps (Nice to Have)

### 🟡 MINOR: Frontend Route Updates

**Status**: NOT ADDRESSED
**Impact**: Frontend may have broken routes

The web app likely has routes referencing the old structure:

- May need to update episode detail page
- May need to update routing logic for `/watch/:dramaSlug/:episodeNumber`

**Note**: Not addressed as part of backend schema revamp scope.

### 🟡 MINOR: Additional Validation

**Status**: NOT IMPLEMENTED
**Impact**: Low - data integrity

Could add:

- Check for duplicate book_id during import
- Validate episode numbers are sequential
- Verify all episodes have corresponding dramas

---

## Ambiguous Items (Need Clarification)

### 🟠 AMBIGUOUS: Episode Video URLs

**Question**: SQL files only provide single URL per episode. How should we populate `video_urls` JSONB?

**Options**:

1. Store single URL as `{ "source": "url" }`
2. Store as `{ "720p": "url" }` (assume quality)
3. Leave empty and populate via separate process

**Current Implementation**: Empty object `{}`, source_url stores the SQL URL

**Recommendation**: Option 3 - populate via CDN integration later

### 🟠 AMBIGUOUS: Play Count Data

**Question**: SQL files have NULL for all playCount values. Should we:

1. Keep as NULL
2. Default to 0
3. Calculate from watch history

**Current Implementation**: NULL (preserving SQL data)

### 🟠 AMBIGUOUS: Episode Duration

**Question**: SQL files don't include episode duration. Should we:

1. Leave as NULL
2. Set default value (e.g., 3600 seconds)
3. Calculate from video files

**Current Implementation**: NULL

---

## Summary

| Category      | Count | Status            |
| ------------- | ----- | ----------------- |
| Auto-Resolved | 4     | ✅ Complete       |
| Critical Gaps | 1     | 🔴 Needs Action   |
| Minor Gaps    | 2     | 🟡 Optional       |
| Ambiguous     | 3     | 🟠 Needs Decision |

### Next Steps

1. **Immediate**: Update test files to fix type errors
2. **Before Merge**: Run migration and import data
3. **Optional**: Decide on ambiguous items
4. **Later**: Update frontend routes

### Decisions Needed

None blocking - all critical decisions were auto-resolved. The remaining ambiguous items can be addressed later or left as-is.
