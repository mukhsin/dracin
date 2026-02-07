# Drama Card Update - Learnings

## Date: 2026-02-07

### What Was Done

Updated DramaCard component to be more compact and display actual episode counts from database metadata.

### Key Technical Decisions

1. **Height Reduction**: Changed from `h-48` (192px) to `h-28` (112px) for content area
   - This provides good balance between compactness and readability
   - Still allows for 2-line title with language badge

2. **Data Extraction Pattern**:
   - `totalEpisodes` is stored in `metadata.totalEpisodes` (JSONB field)
   - Parent component extracts and passes as prop: `totalEpisodes={drama.metadata?.totalEpisodes}`
   - Component handles undefined gracefully

3. **Stats Display Format**:
   - Format: "{playCount} views • {totalEpisodes} eps"
   - Only shows episode count if > 0
   - Shows "0 views" when playCount is null (current database state)

### Bug Fixed

- `formatDramaPlayCount` was incorrectly parsing "14M" as just "14"
- Fixed by using `parsePlayCount` from `@repo/shared/utils` instead of regex

### Responsive Behavior Verified

- Mobile (375px): 2 columns, text readable
- Desktop (1920px): 6 columns

### Database State Note

All 4,550 dramas currently have `playCount: null` in database. The formatting code is ready to display values like "14M views" when data is populated.
