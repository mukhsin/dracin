## Implementation: Video URL Validation with Fire-and-Forget Caching

### Completed: 2026-02-07

### Files Created/Modified:

1. **NEW:** `apps/api/src/lib/url-validator.ts` - URL validation utility
2. **MODIFIED:** `apps/api/src/services/drama.service.ts` - Added validation methods
3. **MODIFIED:** `apps/api/src/routes/dramas.ts` - Updated route to use validation

### Key Implementation Details:

#### URL Validator (`url-validator.ts`):

- `validateVideoUrl(url)` - Performs HEAD request with 5s timeout
- `getHighestQualityUrl(videoUrls)` - Extracts URL for validation (priority: 1080p → 720p → 480p → 360p → 240p → 4k)
- `hasAnyVideoUrl(videoUrls)` - Checks if any URL exists in the object

#### Drama Service Updates:

- `DramaWithValidation` interface extends `DramaWithEpisodes` with `source: "cache" | "fresh"`
- `getBySlugWithValidation(slug)` - Main method that validates cached URLs
- `fetchAndCacheEpisodes(bookId)` - Private fire-and-forget method for batch updates
- `transformApiProxyUrlToVideoUrls(url)` - Helper to parse quality from URL

#### Fire-and-Forget Pattern:

```typescript
// Called WITHOUT await - runs in background
this.fetchAndCacheEpisodes(drama.bookId.toString());
```

#### Batch Update Logic:

- Uses `Promise.all()` for parallel episode updates
- Matches episodes by `dramaId` + `number` (index from API-Proxy)
- Updates ALL episodes from API-Proxy response

#### TypeScript Learnings:

- Drizzle bigint with `mode: "number"` requires `Number()` conversion, not `BigInt()`
- Episodes table has no `updatedAt` field - only `createdAt`

#### Validation Flow:

1. Get drama with episodes from DB
2. Check if episodes have video URLs
3. If no URLs: fire-and-forget fetch, return "fresh"
4. If URLs exist: validate first episode's URL via HEAD request
5. If valid (2xx/3xx): return "cache"
6. If invalid: fire-and-forget fetch, return fresh data from API-Proxy

#### Response Format:

```json
{
  "success": true,
  "data": { ...drama, episodes: [...], source: "cache" | "fresh" },
  "meta": { "source": "cache" | "fresh" }
}
```
