# Drama Streaming API Documentation

Complete REST API documentation for the Drama Streaming application.

**Base URL:** `http://localhost:3001`

**Authentication:** Most endpoints require Bearer token authentication via the `Authorization` header.

---

## Table of Contents

- [Authentication](#authentication)
- [Dramas](#dramas)
- [Episodes](#episodes)
- [Watchlist](#watchlist)
- [History](#history)
- [Admin](#admin)
- [Error Responses](#error-responses)

---

## Authentication

All authentication endpoints are provided by [Better-Auth](https://www.better-auth.com/).

### POST /api/auth/sign-up/email

Register a new user with email and password.

**Request Body:**

| Field    | Type   | Required | Description                 |
| -------- | ------ | -------- | --------------------------- |
| email    | string | Yes      | User email address          |
| password | string | Yes      | Password (min 8 characters) |
| name     | string | Yes      | Display name                |

**Response:**

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "image": null,
    "emailVerified": false,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Status Codes:**

- `200` - Success
- `400` - Validation error (invalid email, weak password)
- `409` - Email already exists

**Example:**

```bash
curl -X POST http://localhost:3001/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "John Doe"
  }'
```

---

### POST /api/auth/sign-in/email

Authenticate an existing user.

**Request Body:**

| Field    | Type   | Required | Description        |
| -------- | ------ | -------- | ------------------ |
| email    | string | Yes      | User email address |
| password | string | Yes      | User password      |

**Response:**

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "image": null,
    "emailVerified": false,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Status Codes:**

- `200` - Success
- `400` - Invalid credentials
- `401` - Authentication failed

**Example:**

```bash
curl -X POST http://localhost:3001/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

---

### POST /api/auth/sign-out

Sign out the current user and invalidate the session.

**Authentication:** Required

**Request Body:** None

**Response:**

```json
{
  "success": true
}
```

**Status Codes:**

- `200` - Success
- `401` - Not authenticated

**Example:**

```bash
curl -X POST http://localhost:3001/api/auth/sign-out \
  -H "Authorization: Bearer <session_token>"
```

---

### GET /api/auth/session

Get the current user's session information.

**Authentication:** Required

**Response:**

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "image": null,
    "emailVerified": false,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "session": {
    "id": "session-uuid",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "expiresAt": "2024-02-15T10:30:00Z"
  }
}
```

**Status Codes:**

- `200` - Success (returns user and session)
- `401` - No active session

**Example:**

```bash
curl http://localhost:3001/api/auth/session \
  -H "Authorization: Bearer <session_token>"
```

---

## Dramas

### GET /api/dramas

List all dramas with pagination, search, and genre filtering.

**Query Parameters:**

| Parameter | Type    | Required | Default  | Description                                       |
| --------- | ------- | -------- | -------- | ------------------------------------------------- |
| page      | integer | No       | 1        | Page number                                       |
| limit     | integer | No       | 20       | Items per page (max 100)                          |
| search    | string  | No       | -        | Search by title or description                    |
| genre     | string  | No       | -        | Filter by genre slug                              |
| sort      | string  | No       | "newest" | Sort order: "newest", "oldest", "rating", "title" |

**Response:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "title": "Crash Landing on You",
        "slug": "crash-landing-on-you",
        "description": "A South Korean heiress falls in love with a North Korean officer...",
        "posterUrl": "https://cdn.example.com/posters/crash-landing.jpg",
        "backdropUrl": "https://cdn.example.com/backdrops/crash-landing.jpg",
        "releaseYear": 2019,
        "rating": 8.7,
        "genres": ["Romance", "Comedy", "Drama"],
        "totalSeasons": 1,
        "totalEpisodes": 16,
        "status": "completed",
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 150,
    "page": 1,
    "pageSize": 20,
    "hasMore": true
  },
  "meta": {
    "source": "db"
  }
}
```

**Fallback Behavior:**

When the database has no dramas or search returns no results, the API automatically falls back to the api-proxy service:

- **DB Empty**: Falls back to `api-proxy/drama/latest`
- **Search Empty**: Falls back to `api-proxy/drama/search?q={query}`
- **Source Indicator**: Response includes `meta.source` field:
  - `"db"` - Data came from local database
  - `"api-proxy"` - Data came from external api-proxy service

When data comes from api-proxy, it is automatically cached to the database (fire-and-forget) for future requests.

**Status Codes:**

- `200` - Success
- `400` - Invalid query parameters

**Example:**

```bash
# List all dramas
curl http://localhost:3001/api/dramas

# Search with pagination
curl "http://localhost:3001/api/dramas?search=romance&page=1&limit=10"

# Filter by genre
curl "http://localhost:3001/api/dramas?genre=romance&sort=rating"
```

---

### GET /api/dramas/:slug

Get detailed information about a specific drama. Episodes are not included - use the episode list endpoint or construct episode buttons using `totalEpisodes`.

**Path Parameters:**

| Parameter | Type   | Required | Description    |
| --------- | ------ | -------- | -------------- |
| slug      | string | Yes      | Drama URL slug |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "title": "Crash Landing on You",
    "slug": "crash-landing-on-you",
    "description": "A South Korean heiress falls in love with a North Korean officer...",
    "posterUrl": "/api/dramas/crash-landing-on-you/poster.jpg",
    "releaseYear": 2019,
    "rating": 8.7,
    "genres": ["Romance", "Comedy", "Drama"],
    "totalEpisodes": 16,
    "status": "completed"
  }
}
```

**Optimization Notes**:

- This endpoint returns drama metadata only (no episodes array)
- Frontend should use `totalEpisodes` to construct episode buttons 1..totalEpisodes
- Episode data is fetched separately when user clicks via `GET /api/dramas/:slug/episodes/:number`
- This avoids fetching episode data when user is just browsing drama details
- The endpoint does not perform video URL validation - that's done on the episode endpoint when user actually watches

**Status Codes:**

- `200` - Success
- `404` - Drama not found

**Example:**

```bash
curl http://localhost:3001/api/dramas/crash-landing-on-you
```

---

### GET /api/dramas/:slug/episodes/:number

Get a specific episode by drama slug and episode number. This endpoint is used for the video player page.

**Path Parameters:**

| Parameter | Type    | Required | Description                |
| --------- | ------- | -------- | -------------------------- |
| slug      | string  | Yes      | Drama URL slug             |
| number    | integer | Yes      | Episode number             |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "dramaId": "550e8400-e29b-41d4-a716-446655440001",
    "number": 1,
    "title": "Episode 1",
    "description": "Yoon Se-ri's paragliding accident...",
    "duration": 4200,
    "drama": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "title": "Crash Landing on You",
      "slug": "crash-landing-on-you",
      "posterUrl": "https://cdn.example.com/posters/crash-landing.jpg",
      "totalEpisodes": 16
    },
    "navigation": {
      "prevEpisode": null,
      "nextEpisode": {
        "id": "550e8400-e29b-41d4-a716-446655440005",
        "number": 2,
        "title": "Episode 2"
      }
    },
    "video": {
      "urls": {
        "240p": "/api/video/550e8400-e29b-41d4-a716-446655440001.1.240p.mp4",
        "480p": "/api/video/550e8400-e29b-41d4-a716-446655440001.1.480p.mp4",
        "720p": "/api/video/550e8400-e29b-41d4-a716-446655440001.1.720p.mp4",
        "1080p": "/api/video/550e8400-e29b-41d4-a716-446655440001.1.1080p.mp4"
      }
    }
  },
  "meta": {
    "source": "cache"
  }
}
```

**Episode Data Freshness:**

The endpoint automatically validates cached video URLs before returning:

- **Cache Validation**: Checks if the cached video URLs are still accessible by making a HEAD request to the highest quality URL
- **Synchronous Fetch**: If cache is stale or missing video URLs, fetches fresh episodes from api-proxy synchronously
  - Client receives actual fresh data (not stale data)
  - May take 1-3 seconds if api-proxy fetch is required
- **Fire-and-Forget Save**: Fresh episodes are saved to the database in the background without blocking the response
- **Source Indicator**: Response includes `meta.source` field:
  - `"cache"` - Episode served from database cache with valid URLs (fast)
  - `"fresh"` - Episode freshly fetched from api-proxy with new video URLs

**Cache Headers:**

- `Cache-Control: public, max-age=30` - Client-side caching for 30 seconds

**Status Codes:**

- `200` - Success
- `404` - Drama or episode not found

**Example:**

```bash
curl http://localhost:3001/api/dramas/crash-landing-on-you/episodes/1
```

---

### GET /api/dramas/:slug/seasons/:number

Get a specific season with all its episodes.

**Path Parameters:**

| Parameter | Type    | Required | Description    |
| --------- | ------- | -------- | -------------- |
| slug      | string  | Yes      | Drama URL slug |
| number    | integer | Yes      | Season number  |

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "number": 1,
  "title": "Season 1",
  "description": "The complete first season",
  "episodeCount": 16,
  "drama": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "title": "Crash Landing on You",
    "slug": "crash-landing-on-you"
  },
  "episodes": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "number": 1,
      "title": "Episode 1",
      "description": "Yoon Se-ri's paragliding accident...",
      "duration": 4200,
      "thumbnailUrl": "https://cdn.example.com/thumbnails/ep1.jpg",
      "airDate": "2019-12-14",
      "videoCount": 3
    }
  ]
}
```

**Status Codes:**

- `200` - Success
- `404` - Season or drama not found

**Example:**

```bash
curl http://localhost:3001/api/dramas/crash-landing-on-you/seasons/1
```

---

### GET /api/dramas/featured

Get a list of featured/promoted dramas.

**Query Parameters:**

| Parameter | Type    | Required | Default | Description                                  |
| --------- | ------- | -------- | ------- | -------------------------------------------- |
| limit     | integer | No       | 6       | Number of featured dramas to return (max 20) |

**Response:**

```json
{
  "dramas": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "title": "Crash Landing on You",
      "slug": "crash-landing-on-you",
      "description": "A South Korean heiress falls in love with a North Korean officer...",
      "posterUrl": "https://cdn.example.com/posters/crash-landing.jpg",
      "backdropUrl": "https://cdn.example.com/backdrops/crash-landing.jpg",
      "releaseYear": 2019,
      "rating": 8.7,
      "genres": ["Romance", "Comedy", "Drama"],
      "totalSeasons": 1,
      "totalEpisodes": 16,
      "featured": true,
      "featuredOrder": 1
    }
  ]
}
```

**Status Codes:**

- `200` - Success

**Example:**

```bash
curl http://localhost:3001/api/dramas/featured?limit=10
```

---

### GET /api/dramas/genres

Get all available genres.

**Response:**

```json
{
  "genres": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "name": "Romance",
      "slug": "romance",
      "description": "Love stories and romantic relationships",
      "dramaCount": 45
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440011",
      "name": "Comedy",
      "slug": "comedy",
      "description": "Humorous and funny content",
      "dramaCount": 32
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440012",
      "name": "Drama",
      "slug": "drama",
      "description": "Serious and emotional storytelling",
      "dramaCount": 78
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440013",
      "name": "Action",
      "slug": "action",
      "description": "Exciting and fast-paced content",
      "dramaCount": 23
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440014",
      "name": "Thriller",
      "slug": "thriller",
      "description": "Suspenseful and intense stories",
      "dramaCount": 19
    }
  ]
}
```

**Status Codes:**

- `200` - Success

**Example:**

```bash
curl http://localhost:3001/api/dramas/genres
```

---

## Episodes

### GET /api/episodes/:id

Get detailed information about a specific episode.

**Path Parameters:**

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| id        | UUID | Yes      | Episode ID  |

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "number": 1,
  "title": "Episode 1",
  "description": "Yoon Se-ri's paragliding accident...",
  "duration": 4200,
  "thumbnailUrl": "https://cdn.example.com/thumbnails/ep1.jpg",
  "airDate": "2019-12-14",
  "season": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "number": 1,
    "title": "Season 1"
  },
  "drama": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "title": "Crash Landing on You",
    "slug": "crash-landing-on-you"
  },
  "videos": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440004",
      "quality": "1080p",
      "url": "https://cdn.example.com/videos/ep1-1080p.mp4"
    }
  ],
  "nextEpisode": {
    "id": "550e8400-e29b-41d4-a716-446655440005",
    "number": 2,
    "title": "Episode 2"
  },
  "prevEpisode": null
}
```

**Status Codes:**

- `200` - Success
- `404` - Episode not found

**Example:**

```bash
curl http://localhost:3001/api/episodes/550e8400-e29b-41d4-a716-446655440003
```

---

### GET /api/episodes/:id/videos

Get all video URLs with available qualities for an episode.

**Path Parameters:**

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| id        | UUID | Yes      | Episode ID  |

**Response:**

```json
{
  "episodeId": "550e8400-e29b-41d4-a716-446655440003",
  "videos": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440004",
      "quality": "240p",
      "resolution": "426x240",
      "url": "https://cdn.example.com/videos/ep1-240p.mp4",
      "size": 157286400,
      "format": "mp4"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440005",
      "quality": "480p",
      "resolution": "854x480",
      "url": "https://cdn.example.com/videos/ep1-480p.mp4",
      "size": 314572800,
      "format": "mp4"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440006",
      "quality": "720p",
      "resolution": "1280x720",
      "url": "https://cdn.example.com/videos/ep1-720p.mp4",
      "size": 629145600,
      "format": "mp4"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440007",
      "quality": "1080p",
      "resolution": "1920x1080",
      "url": "https://cdn.example.com/videos/ep1-1080p.mp4",
      "size": 1073741824,
      "format": "mp4",
      "isHD": true
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440008",
      "quality": "4k",
      "resolution": "3840x2160",
      "url": "https://cdn.example.com/videos/ep1-4k.mp4",
      "size": 4294967296,
      "format": "mp4",
      "is4K": true
    }
  ]
}
```

**Status Codes:**

- `200` - Success
- `404` - Episode not found

**Example:**

```bash
curl http://localhost:3001/api/episodes/550e8400-e29b-41d4-a716-446655440003/videos
```

---

## Watchlist

All watchlist endpoints require authentication.

### GET /api/watchlist

Get the current user's watchlist with drama details.

**Authentication:** Required

**Query Parameters:**

| Parameter | Type    | Required | Default | Description    |
| --------- | ------- | -------- | ------- | -------------- |
| page      | integer | No       | 1       | Page number    |
| limit     | integer | No       | 20      | Items per page |

**Response:**

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440100",
      "addedAt": "2024-01-15T10:30:00Z",
      "drama": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "title": "Crash Landing on You",
        "slug": "crash-landing-on-you",
        "posterUrl": "https://cdn.example.com/posters/crash-landing.jpg",
        "rating": 8.7,
        "genres": ["Romance", "Comedy", "Drama"],
        "totalEpisodes": 16,
        "status": "completed"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

**Status Codes:**

- `200` - Success
- `401` - Not authenticated

**Example:**

```bash
curl http://localhost:3001/api/watchlist \
  -H "Authorization: Bearer <session_token>"
```

---

### POST /api/watchlist

Add a drama to the user's watchlist.

**Authentication:** Required

**Request Body:**

| Field   | Type | Required | Description     |
| ------- | ---- | -------- | --------------- |
| dramaId | UUID | Yes      | Drama ID to add |

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440100",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "dramaId": "550e8400-e29b-41d4-a716-446655440001",
  "addedAt": "2024-01-15T10:30:00Z"
}
```

**Status Codes:**

- `201` - Created
- `400` - Invalid drama ID
- `401` - Not authenticated
- `409` - Drama already in watchlist
- `404` - Drama not found

**Example:**

```bash
curl -X POST http://localhost:3001/api/watchlist \
  -H "Authorization: Bearer <session_token>" \
  -H "Content-Type: application/json" \
  -d '{"dramaId": "550e8400-e29b-41d4-a716-446655440001"}'
```

---

### DELETE /api/watchlist/:dramaId

Remove a drama from the user's watchlist.

**Authentication:** Required

**Path Parameters:**

| Parameter | Type | Required | Description        |
| --------- | ---- | -------- | ------------------ |
| dramaId   | UUID | Yes      | Drama ID to remove |

**Response:**

```json
{
  "success": true
}
```

**Status Codes:**

- `200` - Success
- `401` - Not authenticated
- `404` - Drama not in watchlist

**Example:**

```bash
curl -X DELETE http://localhost:3001/api/watchlist/550e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer <session_token>"
```

---

### GET /api/watchlist/check/:dramaId

Check if a specific drama is in the user's watchlist.

**Authentication:** Required

**Path Parameters:**

| Parameter | Type | Required | Description       |
| --------- | ---- | -------- | ----------------- |
| dramaId   | UUID | Yes      | Drama ID to check |

**Response:**

```json
{
  "inWatchlist": true,
  "addedAt": "2024-01-15T10:30:00Z"
}
```

**Status Codes:**

- `200` - Success
- `401` - Not authenticated

**Example:**

```bash
curl http://localhost:3001/api/watchlist/check/550e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer <session_token>"
```

---

## History

All history endpoints require authentication.

### GET /api/history

Get the user's complete watch history.

**Authentication:** Required

**Query Parameters:**

| Parameter | Type    | Required | Default | Description              |
| --------- | ------- | -------- | ------- | ------------------------ |
| page      | integer | No       | 1       | Page number              |
| limit     | integer | No       | 20      | Items per page           |
| dramaId   | UUID    | No       | -       | Filter by specific drama |

**Response:**

```json
{
  "history": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440200",
      "progress": 1800,
      "duration": 4200,
      "progressPercent": 42.8,
      "isCompleted": false,
      "watchedAt": "2024-01-15T14:30:00Z",
      "updatedAt": "2024-01-15T14:45:00Z",
      "episode": {
        "id": "550e8400-e29b-41d4-a716-446655440003",
        "number": 1,
        "title": "Episode 1",
        "duration": 4200,
        "thumbnailUrl": "https://cdn.example.com/thumbnails/ep1.jpg",
        "season": {
          "id": "550e8400-e29b-41d4-a716-446655440002",
          "number": 1
        },
        "drama": {
          "id": "550e8400-e29b-41d4-a716-446655440001",
          "title": "Crash Landing on You",
          "slug": "crash-landing-on-you",
          "posterUrl": "https://cdn.example.com/posters/crash-landing.jpg"
        }
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

**Status Codes:**

- `200` - Success
- `401` - Not authenticated

**Example:**

```bash
curl http://localhost:3001/api/history \
  -H "Authorization: Bearer <session_token>"
```

---

### GET /api/history/continue

Get the "Continue Watching" list - episodes that are partially watched.

**Authentication:** Required

**Query Parameters:**

| Parameter | Type    | Required | Default | Description             |
| --------- | ------- | -------- | ------- | ----------------------- |
| limit     | integer | No       | 10      | Maximum items to return |

**Response:**

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440200",
      "progress": 1800,
      "duration": 4200,
      "progressPercent": 42.8,
      "timeRemaining": 2400,
      "watchedAt": "2024-01-15T14:30:00Z",
      "episode": {
        "id": "550e8400-e29b-41d4-a716-446655440003",
        "number": 1,
        "title": "Episode 1",
        "thumbnailUrl": "https://cdn.example.com/thumbnails/ep1.jpg",
        "season": {
          "id": "550e8400-e29b-41d4-a716-446655440002",
          "number": 1
        },
        "drama": {
          "id": "550e8400-e29b-41d4-a716-446655440001",
          "title": "Crash Landing on You",
          "slug": "crash-landing-on-you",
          "posterUrl": "https://cdn.example.com/posters/crash-landing.jpg"
        }
      }
    }
  ]
}
```

**Status Codes:**

- `200` - Success
- `401` - Not authenticated

**Example:**

```bash
curl http://localhost:3001/api/history/continue \
  -H "Authorization: Bearer <session_token>"
```

---

### POST /api/history

Record or update watch progress for an episode.

**Authentication:** Required

**Request Body:**

| Field     | Type    | Required | Description                       |
| --------- | ------- | -------- | --------------------------------- |
| episodeId | UUID    | Yes      | Episode ID                        |
| progress  | integer | Yes      | Current position in seconds       |
| duration  | integer | Yes      | Total episode duration in seconds |

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440200",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "episodeId": "550e8400-e29b-41d4-a716-446655440003",
  "progress": 1800,
  "duration": 4200,
  "isCompleted": false,
  "watchedAt": "2024-01-15T14:30:00Z",
  "updatedAt": "2024-01-15T14:45:00Z"
}
```

**Status Codes:**

- `200` - Updated existing record
- `201` - Created new record
- `400` - Invalid request data
- `401` - Not authenticated
- `404` - Episode not found

**Example:**

```bash
curl -X POST http://localhost:3001/api/history \
  -H "Authorization: Bearer <session_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "episodeId": "550e8400-e29b-41d4-a716-446655440003",
    "progress": 1800,
    "duration": 4200
  }'
```

**Notes:**

- If `progress` is greater than or equal to 90% of `duration`, the episode is marked as completed (`isCompleted: true`)
- This endpoint is called automatically by the video player every 10 seconds during playback

---

### GET /api/history/episodes/:episodeId

Get the watch progress for a specific episode.

**Authentication:** Required

**Path Parameters:**

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| episodeId | UUID | Yes      | Episode ID  |

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440200",
  "progress": 1800,
  "duration": 4200,
  "progressPercent": 42.8,
  "isCompleted": false,
  "watchedAt": "2024-01-15T14:30:00Z",
  "updatedAt": "2024-01-15T14:45:00Z"
}
```

**Status Codes:**

- `200` - Success
- `401` - Not authenticated
- `404` - No history found for this episode

**Example:**

```bash
curl http://localhost:3001/api/history/episodes/550e8400-e29b-41d4-a716-446655440003 \
  -H "Authorization: Bearer <session_token>"
```

---

### DELETE /api/history/:historyId

Delete a specific history entry.

**Authentication:** Required

**Path Parameters:**

| Parameter | Type | Required | Description      |
| --------- | ---- | -------- | ---------------- |
| historyId | UUID | Yes      | History entry ID |

**Response:**

```json
{
  "success": true
}
```

**Status Codes:**

- `200` - Success
- `401` - Not authenticated
- `403` - Not authorized (can only delete own history)
- `404` - History entry not found

**Example:**

```bash
curl -X DELETE http://localhost:3001/api/history/550e8400-e29b-41d4-a716-446655440200 \
  -H "Authorization: Bearer <session_token>"
```

---

### DELETE /api/history

Clear all watch history for the current user.

**Authentication:** Required

**Response:**

```json
{
  "success": true,
  "deletedCount": 15
}
```

**Status Codes:**

- `200` - Success
- `401` - Not authenticated

**Example:**

```bash
curl -X DELETE http://localhost:3001/api/history \
  -H "Authorization: Bearer <session_token>"
```

---

## Admin

Admin endpoints for system management. These may require additional admin privileges.

### GET /api/admin/fallback/status

Get the status of the API fallback service (circuit breaker and cache).

**Authentication:** Required (Admin)

**Response:**

```json
{
  "circuitBreaker": {
    "state": "closed",
    "failures": 0,
    "lastFailure": null,
    "nextRetry": null
  },
  "cache": {
    "size": 12,
    "maxSize": 100,
    "hitRate": 0.85
  },
  "primaryApi": {
    "url": "http://localhost:3001",
    "status": "healthy",
    "lastChecked": "2024-01-15T14:45:00Z"
  },
  "fallbackApi": {
    "url": "http://localhost:3002",
    "status": "standby"
  }
}
```

**Circuit Breaker States:**

- `closed` - Normal operation, requests go to primary API
- `open` - Primary API failing, using fallback API
- `half-open` - Testing if primary API has recovered

**Status Codes:**

- `200` - Success
- `401` - Not authenticated
- `403` - Not authorized (requires admin)

**Example:**

```bash
curl http://localhost:3001/api/admin/fallback/status \
  -H "Authorization: Bearer <session_token>"
```

---

### POST /api/admin/fallback/clear-cache

Clear the fallback service cache.

**Authentication:** Required (Admin)

**Response:**

```json
{
  "success": true,
  "clearedEntries": 12
}
```

**Status Codes:**

- `200` - Success
- `401` - Not authenticated
- `403` - Not authorized (requires admin)

**Example:**

```bash
curl -X POST http://localhost:3001/api/admin/fallback/clear-cache \
  -H "Authorization: Bearer <session_token>"
```

---

## Error Responses

All API errors follow a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

### Common Error Codes

| Code               | HTTP Status | Description                                            |
| ------------------ | ----------- | ------------------------------------------------------ |
| `UNAUTHORIZED`     | 401         | Authentication required or invalid credentials         |
| `FORBIDDEN`        | 403         | Authenticated but not authorized for this resource     |
| `NOT_FOUND`        | 404         | Resource not found                                     |
| `VALIDATION_ERROR` | 400         | Request validation failed                              |
| `CONFLICT`         | 409         | Resource already exists or conflict with current state |
| `RATE_LIMITED`     | 429         | Too many requests                                      |
| `INTERNAL_ERROR`   | 500         | Server internal error                                  |

### HTTP Status Codes Reference

| Status                      | Meaning                                 |
| --------------------------- | --------------------------------------- |
| `200 OK`                    | Request succeeded                       |
| `201 Created`               | Resource created successfully           |
| `204 No Content`            | Request succeeded, no content to return |
| `400 Bad Request`           | Invalid request syntax or parameters    |
| `401 Unauthorized`          | Authentication required                 |
| `403 Forbidden`             | Access denied                           |
| `404 Not Found`             | Resource not found                      |
| `409 Conflict`              | Resource conflict                       |
| `422 Unprocessable Entity`  | Validation error                        |
| `429 Too Many Requests`     | Rate limit exceeded                     |
| `500 Internal Server Error` | Server error                            |
| `502 Bad Gateway`           | Upstream service error                  |
| `503 Service Unavailable`   | Service temporarily unavailable         |

---

## Rate Limiting

API requests are rate-limited to ensure fair usage:

- **Authenticated users:** 1000 requests per hour
- **Anonymous users:** 100 requests per hour

Rate limit headers are included in all responses:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642249200
```

---

## Pagination

List endpoints support pagination using the following query parameters:

- `page` - Page number (1-indexed)
- `limit` - Items per page (default varies by endpoint, max 100)

Pagination information is included in the response:

```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Data Types

### UUID

Universally unique identifier in standard format: `550e8400-e29b-41d4-a716-446655440000`

### Timestamp

ISO 8601 formatted datetime: `2024-01-15T10:30:00Z`

### Duration

Duration in seconds (integer). For example, `4200` represents 1 hour and 10 minutes.

### Slug

URL-friendly string identifier. Lowercase, alphanumeric with hyphens. Example: `crash-landing-on-you`

---

## Changelog

### v1.0.0 (2024-01-15)

- Initial API release
- Authentication endpoints (Better-Auth)
- Drama browsing and search
- Episode playback
- Watchlist management
- Watch history tracking
- Admin fallback service endpoints
