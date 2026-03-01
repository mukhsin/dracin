# DramaStream Architecture

This document provides a comprehensive overview of the DramaStream architecture, explaining the design decisions, system components, and how they work together to deliver a modern drama streaming experience.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Monorepo Structure](#monorepo-structure)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Database Schema](#database-schema)
7. [Authentication Flow](#authentication-flow)
8. [Video Delivery](#video-delivery)
9. [API-Proxy Fallback](#api-proxy-fallback)
10. [State Management](#state-management)
11. [Testing Strategy](#testing-strategy)
12. [Deployment](#deployment)
13. [Key Design Decisions](#key-design-decisions)
14. [Performance Considerations](#performance-considerations)
15. [Security Considerations](#security-considerations)

---

## Overview

DramaStream is a full-stack drama streaming platform built with modern web technologies. The architecture follows a clean separation of concerns with a React-based frontend, Hono-powered API backend, PostgreSQL database, and an intelligent fallback system for high availability.

### Core Principles

- **Type Safety**: Full TypeScript coverage across the entire stack
- **Developer Experience**: Fast feedback loops with hot reloading and type-safe APIs
- **Performance**: Optimized for streaming with intelligent caching and CDN integration
- **Resilience**: Circuit breaker pattern ensures service availability during failures
- **Scalability**: Stateless services designed for horizontal scaling

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Docker Compose Environment                        │
│                           SQLite Embedded Database Environment                 │
│                                                                             │
│  ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐   │
│  │                  │      │                  │      │                  │   │
│   Web Frontend   │◄────►│   API Service    │◄────►│   **Data Layer**  │   │
│  │   Port 3000      │      │   Port 3001      │      │
│  │                  │      │                  │      │                  │   │
│  │  TanStack Start  │      │  Hono Framework  │      │  Drizzle ORM     │   │
│  │  React 19        │      │  Better-Auth     │      │  Schema-First    │   │
│  │  shadcn/ui       │      │  Zod Validation  │      │  Relations       │   │
│  │  Tailwind v4     │      │  Service Layer   │      │  Indexes         │   │
│  │                  │      │                  │      │                  │   │
│  └──────────────────┘      └────────┬─────────┘      └──────────────────┘   │
│                                     │                                       │
│                                     │ Fallback (on failure)                 │
│                                     ▼                                       │
│                          ┌──────────────────┐                               │
│                          │  API-Proxy       │                               │
│                          │  Port 3002       │                               │
│                          │                  │                               │
│                          │  Express Server  │                               │
│                          │  Circuit Breaker │                               │
│                          │  In-Memory Cache │                               │
│                          └──────────────────┘                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow
```
User Request
     │
     ▼
┌─────────────┐
│  Browser    │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  TanStack Start     │
│  - SSR/Streaming    │
│  - File Routing     │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐     ┌──────────────────┐
│  TanStack Query     │◄────│  Query Cache     │
│  - Server State     │     └──────────────────┘
│  - Optimistic UI    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Hono API           │
│  - Validation       │
│  - Auth Middleware  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Service Layer      │
│  - Business Logic   │
│  - Data Access      │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Drizzle ORM        │
│  - Type-Safe SQL    │
│  - Migrations       │
└──────┬──────────────┘
       │
       │  **SQLite**         │
┌─────────────────────┐
│  PostgreSQL         │
└─────────────────────┘
```

---

## Monorepo Structure

DramaStream uses **Turborepo** with **Bun workspaces** for efficient monorepo management.

### Workspace Layout

```
drama-stream/
├── apps/
│   ├── api/                    # Hono API server (Port 3001)
│   │   ├── src/
│   │   │   ├── routes/         # API route handlers
│   │   │   ├── services/       # Business logic layer
│   │   │   ├── db/             # Database schema & migrations
│   │   │   ├── lib/            # Utilities & middleware
│   │   │   └── middleware/     # Express/Hono middleware
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── web/                    # TanStack Start frontend (Port 3000)
│       ├── src/
│       │   ├── routes/         # File-based routes
│       │   ├── components/     # React components
│       │   ├── hooks/          # Custom TanStack Query hooks
│       │   └── lib/            # Utilities
│       ├── Dockerfile
│       └── package.json
│
├── packages/
│   └── shared/                 # Shared types & utilities
│       ├── src/
│       │   ├── types/          # TypeScript interfaces
│       │   ├── schemas/        # Zod validation schemas
│       │   └── utils/          # Shared utilities
│       └── package.json
│
├── e2e/                        # Playwright E2E tests
├── docker-compose.yml          # Service orchestration
├── turbo.json                  # Turborepo configuration
└── package.json                # Root workspace config
```

### Turborepo Pipeline

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### Why Turborepo + Bun?

- **Fast builds**: Turborepo's remote caching and parallelization
- **Workspace linking**: Bun's native workspace support
- **TypeScript**: Shared types across packages without publishing
- **Dependency management**: Single lockfile for all packages

---

## Frontend Architecture

The frontend is built with **TanStack Start**, a modern full-stack React framework that provides type-safe routing, server-side rendering, and streaming.

### Technology Stack

| Layer      | Technology     | Purpose                             |
| ---------- | -------------- | ----------------------------------- |
| Framework  | TanStack Start | File-based routing, SSR, streaming  |
| UI Library | React 19       | Component-based UI                  |
| Styling    | TailwindCSS v4 | Utility-first CSS                   |
| Components | shadcn/ui      | Accessible, customizable components |
| State      | TanStack Query | Server state management             |
| Icons      | Lucide React   | Consistent iconography              |

### File-Based Routing

TanStack Start uses a file-based routing convention:

```
apps/web/src/routes/
├── __root.tsx              # Root layout with providers
├── index.tsx               # Home page (/)
├── watchlist.tsx           # Watchlist page (/watchlist)
├── history.tsx             # History page (/history)
└── dramas.$dramaSlug.$episodeNumber.tsx  # Episode player (/dramas/:slug/:number)
```

#### Route Configuration Example

```typescript
// apps/web/src/routes/dramas.$dramaSlug.$episodeNumber.tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dramas/$dramaSlug/$episodeNumber")({
  component: WatchPage,
  loader: async ({ params }) => {
    // Server-side data fetching
    return { dramaSlug: params.dramaSlug, episodeNumber: params.episodeNumber };
  },
});
```

### Component Architecture

```
┌─────────────────────────────────────┐
│         Page Components             │
│  (Routes: index, watchlist, etc.)   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│       Feature Components            │
│  (VideoPlayer, WatchlistButton)     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│        UI Components (shadcn)       │
│  (Button, Card, Dialog, etc.)       │
└─────────────────────────────────────┘
```

### TailwindCSS v4 Configuration

Uses the new `@theme inline` pattern with CSS variables:

```css
/* apps/web/src/styles.css */
@import "tailwindcss";

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  /* ... */
}

:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  /* ... */
}

.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  /* ... */
}
```

---

## Backend Architecture

The API is built with **Hono**, a lightweight, fast web framework designed for edge runtimes.

### Application Structure

```
apps/api/src/
├── app.ts                    # Hono app factory
├── index.ts                  # Server entry point
├── routes/                   # Route handlers
│   ├── health.ts
│   ├── dramas.ts
│   ├── episodes.ts
│   ├── watchlist.ts
│   ├── history.ts
│   └── videos.ts
├── services/                 # Business logic
│   ├── drama.service.ts
│   ├── watchlist.service.ts
│   └── history.service.ts
├── db/                       # Database
│   ├── index.ts              # Connection
│   ├── schema.ts             # Table definitions
│   └── seed.ts               # Seed data
├── lib/                      # Utilities
│   ├── auth.ts               # Better-Auth config
│   ├── env.ts                # Environment validation
│   └── fallback.ts           # Circuit breaker
└── middleware/               # Hono middleware
    ├── auth.ts
    ├── logger.ts
    └── fallback.ts
```

### Hono App Factory Pattern

```typescript
// apps/api/src/app.ts
import { Hono } from "hono";
import { cors } from "hono/cors";

export function createApp() {
  const app = new Hono();

  // Global middleware
  app.use(
    "*",
    cors({
      origin: ["http://localhost:3000"],
      credentials: true,
    }),
  );
  app.use("*", logger);
  app.use("*", authMiddleware);

  // Route registration
  app.route("/api/dramas", dramaRoutes);
  app.route("/api/watchlist", watchlistRoutes);
  app.route("/api/history", historyRoutes);

  // Error handling
  app.onError((err, c) => {
    return c.json(
      {
        success: false,
        error: "Internal Server Error",
        message: err.message,
      },
      500,
    );
  });

  return app;
}
```

### Service Layer Pattern

Business logic is encapsulated in service classes:

```typescript
// apps/api/src/services/drama.service.ts
export const dramaService = {
  async list(page: number, pageSize: number, filters?: DramaFilters) {
    // Query building with Drizzle
    const query = db.query.dramas.findMany({
      where: filters?.status ? eq(dramas.status, filters.status) : undefined,
      orderBy: desc(dramas.createdAt),
      limit: pageSize,
      offset: (page - 1) * pageSize,
      with: {
        seasons: true,
      },
    });

    return query;
  },

  async getBySlug(slug: string) {
    return db.query.dramas.findFirst({
      where: eq(dramas.slug, slug),
      with: {
        seasons: {
          with: {
            episodes: true,
          },
        },
      },
    });
  },
};
```

### Validation with Zod

Input validation using `@hono/zod-validator`:

```typescript
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const ListDramasQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  q: z.string().optional(),
  status: z.enum(["ongoing", "completed", "upcoming"]).optional(),
});

app.get("/", zValidator("query", ListDramasQuerySchema), async (c) => {
  const { page, pageSize, q, status } = c.req.valid("query");
  // Validated data is type-safe
});
```

---

## Database Schema

The database uses **PostgreSQL** with **Drizzle ORM** for type-safe database operations.

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Database Schema                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐         │
│  │    users     │         │   dramas     │         │   seasons    │         │
│  ├──────────────┤         ├──────────────┤         ├──────────────┤         │
│  │ id (PK)      │         │ id (PK)      │         │ id (PK)      │         │
│  │ email (UQ)   │◄────────┤              │◄────────┤ dramaId (FK) │         │
│  │ name         │   1:M   │ title        │   1:M   │ number       │         │
│  │ avatarUrl    │         │ slug (UQ)    │         │ title        │         │
│  │ createdAt    │         │ description  │         │ description  │         │
│  │ updatedAt    │         │ posterUrl    │         │ createdAt    │         │
│  └──────┬───────┘         │ status       │         └──────┬───────┘         │
│         │                 │ metadata     │                │                 │
│         │                 │ createdAt    │                │                 │
│         │                 │ updatedAt    │                │                 │
│         │                 └──────┬───────┘                │                 │
│         │                        │                        │                 │
│         │                        │                        ▼                 │
│         │                        │                 ┌──────────────┐         │
│         │                        │                 │   episodes   │         │
│         │                        │                 ├──────────────┤         │
│         │                        │                 │ id (PK)      │         │
│         │                        │                 │ seasonId(FK) │         │
│         │                        │                 │ number       │         │
│         │                        │                 │ title        │         │
│         │                        │                 │ description  │         │
│         │                        │                 │ duration     │         │
│         │                        │                 │ videoUrls    │         │
│         │                        │                 │ createdAt    │         │
│         │                        │                 └──────┬───────┘         │
│         │                        │                        │                 │
│         ▼                        ▼                        ▼                 │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐         │
│  │  watchlist   │         │watch_history │         │              │         │
│  ├──────────────┤         ├──────────────┤         │              │         │
│  │ id (PK)      │         │ id (PK)      │         │              │         │
│  │ userId (FK)  │         │ userId (FK)  │         │              │         │
│  │ dramaId (FK) │         │ episodeId(FK)│         │              │         │
│  │ addedAt      │         │ progress     │         │              │         │
│  └──────────────┘         │ watchedAt    │         │              │         │
│                           │ completed    │         │              │         │
│                           └──────────────┘         │              │         │
│                                                    └──────────────┘         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Table Definitions

#### Users

```typescript
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    name: text("name"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
  }),
);
```

#### Dramas

```typescript
export const dramas = pgTable(
  "dramas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    posterUrl: text("poster_url"),
    status: text("status", { enum: ["ongoing", "completed", "upcoming"] })
      .notNull()
      .default("upcoming"),
    metadata: jsonb("metadata").$type<{
      releaseYear?: number;
      country?: string;
      genre?: string[];
      rating?: number;
      totalEpisodes?: number;
    }>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    slugIdx: uniqueIndex("dramas_slug_idx").on(table.slug),
    statusIdx: index("dramas_status_idx").on(table.status),
    titleIdx: index("dramas_title_idx").on(table.title),
  }),
);
```

#### Episodes with Multi-Quality Videos

```typescript
export const episodes = pgTable(
  "episodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    title: text("title"),
    description: text("description"),
    duration: integer("duration"), // in seconds
    videoUrls:
      jsonb("video_urls").$type<
        Partial<
          Record<"240p" | "360p" | "480p" | "720p" | "1080p" | "4k", string>
        >
      >(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    seasonNumberIdx: uniqueIndex("episodes_season_number_idx").on(
      table.seasonId,
      table.number,
    ),
    seasonIdx: index("episodes_season_idx").on(table.seasonId),
  }),
);
```

### Relations

```typescript
export const dramasRelations = relations(dramas, ({ many }) => ({
  seasons: many(seasons),
  watchlist: many(watchlist),
}));

export const seasonsRelations = relations(seasons, ({ one, many }) => ({
  drama: one(dramas, {
    fields: [seasons.dramaId],
    references: [dramas.id],
  }),
  episodes: many(episodes),
}));

export const episodesRelations = relations(episodes, ({ one, many }) => ({
  season: one(seasons, {
    fields: [episodes.seasonId],
    references: [seasons.id],
  }),
  watchHistory: many(watchHistory),
}));
```

### Indexes

Strategic indexes for query performance:

| Index                               | Table        | Columns           | Purpose                   |
| ----------------------------------- | ------------ | ----------------- | ------------------------- |
| `users_email_idx`                   | users        | email             | Login lookups             |
| `dramas_slug_idx`                   | dramas       | slug              | Drama detail pages        |
| `dramas_status_idx`                 | dramas       | status            | Filter by status          |
| `dramas_title_idx`                  | dramas       | title             | Search queries            |
| `seasons_drama_number_idx`          | seasons      | dramaId, number   | Unique season constraint  |
| `episodes_season_number_idx`        | episodes     | seasonId, number  | Unique episode constraint |
| `watchlist_user_drama_idx`          | watchlist    | userId, dramaId   | Prevent duplicates        |
| `watchlist_user_added_at_idx`       | watchlist    | userId, addedAt   | Sort watchlist            |
| `watch_history_user_episode_idx`    | watchHistory | userId, episodeId | Progress tracking         |
| `watch_history_user_watched_at_idx` | watchHistory | userId, watchedAt | Continue watching         |

---

## Authentication Flow

Authentication is handled by **Better-Auth**, a modern authentication library with session management.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Authentication Flow                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐ │
│  │    Client    │     │  Better-Auth │     │  Database    │ │
│  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘ │
│         │                    │                    │         │
│         │ 1. POST /register  │                    │         │
│         │───────────────────►│                    │         │
│         │                    │ 2. Create user     │         │
│         │                    │───────────────────►│         │
│         │                    │                    │         │
│         │ 3. Set session     │                    │         │
│         │    cookie          │                    │         │
│         │◄───────────────────│                    │         │
│         │                    │                    │         │
│         │ 4. Subsequent      │                    │         │
│         │    requests with   │                    │         │
│         │    cookie          │                    │         │
│         │────────────────────────────────────────►│         │
│         │                    │                    │         │
│         │ 5. Validate        │                    │         │
│         │    session         │                    │         │
│         │◄────────────────────────────────────────│         │
│         │                    │                    │         │
└─────────┼────────────────────┼────────────────────┼─────────┘
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    Session Configuration                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  • Expires: 7 days                                          │
│  • Update Age: 24 hours (refresh session)                   │
│  • Cookie Cache: 5 minutes (reduce DB hits)                 │
│  • SameSite: lax                                            │
│  • HttpOnly: true                                           │
│  • Secure: true in production                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Better-Auth Configuration

```typescript
// apps/api/src/lib/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",

  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },

  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    },
  },

  rateLimit: {
    enabled: true,
    window: 60,
    max: 10,
  },

  plugins: [tanstackStartCookies()],
});
```

### Protected Routes

```typescript
// apps/api/src/middleware/auth.ts
import { auth } from "../lib/auth.js";

export const authMiddleware = async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (session) {
    c.set("user", session.user);
    c.set("session", session.session);
  }

  await next();
};

// Require auth for specific routes
export const requireAuth = async (c, next) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  await next();
};
```

### Frontend Integration

```typescript
// apps/web/src/lib/auth.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL,
});

// Usage in components
const { data: session } = authClient.useSession();

const handleLogin = async (email: string, password: string) => {
  const result = await authClient.signIn.email({
    email,
    password,
  });

  if (result.error) {
    console.error(result.error);
  }
};
```

---

## Video Delivery

The video player is a custom React component with support for multiple quality levels and progress tracking.

### Video Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Video Delivery Architecture                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        Video Player Component                       │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │                                                                     │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │    │
│  │  │   HTML5      │  │   Custom     │  │   Quality    │               │    │
│  │  │   Video      │  │   Controls   │  │   Selector   │               │    │
│  │  │   Element    │  │              │  │              │               │    │
│  │  └──────┬───────┘  └──────────────┘  └──────────────┘               │    │
│  │         │                                                           │    │
│  │         │ crossOrigin="anonymous"                                   │    │
│  │         │ (Required for Safari/iOS Range Requests)                  │    │
│  │         ▼                                                           │    │
│  │  ┌──────────────────────────────────────────────────────────────┐   │    │
│  │  │                     Video Sources                            │   │    │
│  │  ├──────────────────────────────────────────────────────────────┤   │    │
│  │  │  240p  │  360p  │  480p  │  720p  │  1080p  │  4K            │   │    │
│  │  │  (Low) │ (Med)  │ (High) │  (HD)  │  (FHD)  │ (UHD)          │   │    │
│  │  └──────────────────────────────────────────────────────────────┘   │    │
│  │                              │                                      │    │
│  │                              ▼                                      │    │
│  │  ┌──────────────────────────────────────────────────────────────┐   │    │
│  │  │                   Progress Tracking                          │   │    │
│  │  │  • Sync every 10 seconds                                     │   │    │
│  │  │  • Sync on pause                                             │   │    │
│  │  │  • Sync on page unload (sendBeacon)                          │   │    │
│  │  │  • Mark complete at 90%                                      │   │    │
│  │  └──────────────────────────────────────────────────────────────┘   │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Quality Selection

```typescript
// apps/web/src/components/quality-selector.tsx
type VideoQuality = "240p" | "360p" | "480p" | "720p" | "1080p" | "4k";

type VideoUrls = Partial<Record<VideoQuality, string>>;

const qualityLabels: Record<VideoQuality, string> = {
  "240p": "240p (Low)",
  "360p": "360p (Medium)",
  "480p": "480p (High)",
  "720p": "720p (HD)",
  "1080p": "1080p (Full HD)",
  "4k": "4K (Ultra HD)",
};

// Default quality selection (best available)
function getDefaultQuality(videoUrls: VideoUrls): VideoQuality {
  const qualities: VideoQuality[] = ["1080p", "720p", "480p", "360p", "240p"];
  for (const quality of qualities) {
    if (videoUrls[quality]) return quality;
  }
  return "720p";
}
```

### HTTP Range Requests

Critical for Safari/iOS support:

```typescript
<video
  ref={videoRef}
  src={currentVideoUrl}
  crossOrigin="anonymous"  // Required for Range Requests
  preload="metadata"
  playsInline              // Required for iOS
  // ...
/>
```

### Progress Tracking Hook

```typescript
// apps/web/src/hooks/use-video-progress.ts
export function useVideoProgress({
  episodeId,
  enabled,
}: UseVideoProgressOptions) {
  const [resumeTime, setResumeTime] = useState(0);

  // Sync progress to server
  const syncProgress = useCallback(
    async (immediate = false) => {
      if (!currentTimeRef.current || !durationRef.current) return;

      const progress = Math.floor(currentTimeRef.current);
      const completed = progress / durationRef.current >= 0.9;

      await fetch(`${API_BASE_URL}/api/history`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeId,
          progress,
          completed,
        }),
      });
    },
    [episodeId],
  );

  // Sync every 10 seconds
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => syncProgress(), 10000);
    return () => clearInterval(interval);
  }, [enabled, syncProgress]);

  // Sync on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const data = JSON.stringify({
        episodeId,
        progress: currentTimeRef.current,
      });
      navigator.sendBeacon(`${API_BASE_URL}/api/history`, data);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [episodeId]);

  return { resumeTime, syncProgress };
}
```

---

## API-Proxy Fallback

The fallback system ensures high availability using a **circuit breaker pattern**.

### Circuit Breaker States

```
┌─────────────────────────────────────────────────────────────┐
│                     CIRCUIT BREAKER STATES                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────┐         ┌──────────┐         ┌──────────┐    │
│   │  CLOSED  │◄────────│ HALF_OPEN│◄────────│   OPEN   │    │
│   │  (Normal)│         │ (Testing)│         │(Blocked) │    │
│   └────┬─────┘         └────┬─────┘         └────┬─────┘    │
│        │                    │                    │          │
│        │ Success            │ Success            │          │
│        │                    │                    │          │
│        ▼                    │                    │          │
│   Requests pass             │                    │          │
│   through normally          │                    │          │
│                             │                    │          │
│        Failure ─────────────┼────────────────────►          │
│        (3 failures)         │ Failure            │          │
│                             │ (1 failure)        │          │
│                             │                    │          │
│                             ▼                    │          │
│                        Test 1 request            │          │
│                        after 30s timeout         │          │
│                                                  │          │
│                        Block all requests        │          │
│                        for 30 seconds            │          │
│                                                  │          │
└─────────────────────────────────────────────────────────────┘
```

### Fallback Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLIENT REQUEST FLOW                                 │
│                    GET /api/episodes/:id/videos                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FALLBACK MIDDLEWARE                                 │
│              (apps/api/src/middleware/fallback.ts)                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   Check Circuit Breaker State │
                    └───────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              ┌─────────┐    ┌──────────┐    ┌──────────┐
              │  CLOSED │    │HALF_OPEN │    │   OPEN   │
              │(Normal) │    │(Testing) │    │(Blocked) │
              └────┬────┘    └────┬─────┘    └────┬─────┘
                   │              │               │
                   ▼              ▼               ▼
         ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
         │Try Primary   │  │Try 1 Request │  │Skip Primary  │
         │Service First │  │to Test       │  │Go to Fallback│
         │              │  │              │  │Immediately   │
         └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
                │                 │                 │
                └─────────────────┼─────────────────┘
                                  ▼
                    ┌───────────────────────────────┐
                    │    FALLBACK SERVICE EXECUTE   │
                    │   (apps/api/src/lib/fallback) │
                    └───────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
         ┌──────────────────┐        ┌──────────────────┐
         │  TRY PRIMARY     │        │  TRY FALLBACK    │
         │  (Hono API)      │        │  (API-Proxy)     │
         │  localhost:3001  │        │  localhost:3002  │
         └────────┬─────────┘        └────────┬─────────┘
                  │                           │
         ┌────────┴────────┐         ┌────────┴────────┐
         ▼                 ▼         ▼                 ▼
    ┌─────────┐      ┌─────────┐ ┌─────────┐      ┌─────────┐
    │ SUCCESS │      │ FAILURE │ │ SUCCESS │      │ FAILURE │
    └────┬────┘      └────┬────┘ └────┬────┘      └────┬────┘
         │                │           │                │
         ▼                ▼           ▼                ▼
    ┌─────────┐     ┌─────────┐  ┌─────────┐     ┌─────────┐
    │Record   │     │Record   │  │Return   │     │Return   │
    │Success  │     │Failure  │  │Fallback │     │Error    │
    │State:   │     │Count++  │  │Data     │     │503      │
    │CLOSED   │     │         │  │         │     │         │
    └────┬────┘     └────┬────┘  └────┬────┘     └────┬────┘
         │               │            │               │
         │    ┌──────────┘            │               │
         │    ▼                       │               │
         │ ┌────────────────────┐     │               │
         │ │Failure Count >= 3? │     │               │
         │ └────────────────────┘     │               │
         │    │                       │               │
         │    ▼                       │               │
         │ ┌──────────────┐           │               │
         └─┤   NO         │           │               │
           │ Stay CLOSED  │◄──────────┘               │
           └──────────────┘                           │
                    │                                 │
                    ▼                                 │
           ┌──────────────┐                           │
           │   YES        │                           │
           │ Open Circuit │                           │
           │ State: OPEN  │                           │
           │ Wait 30s     │                           │
           └──────────────┘                           │
                                                      │
    ┌─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              RESPONSE TO CLIENT                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SUCCESS (from Primary):                                                    │
│  {                                                                          │
│    success: true,                                                           │
│    data: { episodeId, videoUrls, qualities, source: "primary" }             │
│  }                                                                          │
│                                                                             │
│  SUCCESS (from Fallback):                                                   │
│  {                                                                          │
│    success: true,                                                           │
│    data: { episodeId, videoUrls, qualities, source: "fallback" }            │
│  }                                                                          │
│                                                                             │
│  FAILURE (Both services down):                                              │
│  {                                                                          │
│    success: false,                                                          │
│    error: "Service Unavailable",                                            │
│    message: "Unable to retrieve video data from any available service",     │
│    details: "Both primary and fallback failed..."                           │
│  }                                                                          │
│  Status: 503                                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

### Drama Service Fallback

In addition to the circuit breaker pattern for video URLs, the drama listing endpoint also implements fallback behavior:

#### Fallback Triggers

1. **Empty Database**: When `GET /api/dramas` is called and the database has no dramas
2. **Empty Search**: When `GET /api/dramas?q={query}` returns no results

#### Fallback Flow

```
┌───────────────────────────────────────────────┐
│           DRAMA SERVICE – FALLBACK FLOW       │
└───────────────────────────────────────────────┘

┌───────────────────────────────────────────────┐
│ Client Request                                │
│ GET /api/dramas?q=romance                     │
└───────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────┐
│ DramaService.list()                           │
└───────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────┐
│ Query Database                                │
└───────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────┐
│ Results Found?                                │
└───────────────────────────────────────────────┘
          │ YES                         │ NO
          ▼                             ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│ Return from DB           │   │ Has search query?        │
│ source: "db"             │   └──────────────────────────┘
└──────────────────────────┘              │
                                          │ YES        │ NO
                                          ▼            ▼
                               ┌────────────────┐  ┌────────────────┐
                               │ api-proxy      │  │ api-proxy      │
                               │ /drama/search  │  │ /drama/latest  │
                               └────────────────┘  └────────────────┘
                                          │
                                          ▼
                               ┌──────────────────────────┐
                               │ Transform Response       │
                               │ Return to Client         │
                               │ source: "api-proxy"      │
                               └──────────────────────────┘
                                          │
                                          ▼
                               ┌──────────────────────────┐
                               │ Fire-and-Forget          │
                               │ Cache to DB (background) │
                               └──────────────────────────┘
```

### Fire-and-Forget Caching

When dramas are fetched from the api-proxy, they are automatically cached to the local database using a fire-and-forget pattern:

#### Why Fire-and-Forget?

- **Non-blocking**: The API response returns immediately without waiting for DB insertion
- **Fast**: Client gets data quickly while caching happens in background
- **Resilient**: Caching failures don't affect the API response

#### Caching Process

1. **Transform**: Api-proxy drama format → Database drama format
2. **Insert/Update**: Uses `ON CONFLICT(bookId) DO UPDATE` to handle duplicates
3. **Update Fields**: On conflict, updates title, description, posterUrl, status, updatedAt
4. **Logging**: Comprehensive logs for monitoring cache operations

#### Progressive Enhancement

Over time, the database populates itself:
- First request: DB empty → fallback to api-proxy → cache to DB
- Second request: Data in DB → serve from DB (fast)
- Popular dramas get cached naturally through usage

This approach ensures:
- Zero cold start problems
- Improved performance over time
- Reduced dependency on external api-proxy
- Better user experience
```

### Episode Validation & Synchronous Fetching

For drama detail endpoints (`GET /api/dramas/:slug`), episode freshness is handled differently than the list endpoint:

#### Validation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EPISODE VALIDATION FLOW                                  │
│                                                                             │
│  Request: GET /api/dramas/:slug                                             │
│                                                                             │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │              DramaService.getBySlugWithValidation()                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│       │                                                                     │
│       ▼                                                                     │
│  ┌──────────────────┐                                                       │
│  │ Get drama &      │                                                       │
│  │ episodes from DB │                                                       │
│  └────────┬─────────┘                                                       │
│           │                                                                 │
│           ▼                                                                 │
│  ┌─────────────────────────────────────────┐                                │
│  │ Check: Has episodes with valid URLs?    │                                │
│  └─────────────┬───────────────────────────┘                                │
│                │                                                            │
│      ┌─────────┴──────────┐                                                 │
│      ▼                    ▼                                                 │
│ ┌──────────┐      ┌──────────────┐                                          │
│ │   YES    │      │     NO       │                                          │
│ └────┬─────┘      └──────┬───────┘                                          │
│      │                   │                                                  │
│      ▼                   ▼                                                  │
│ Validate URL    Synchronous Fetch                                           │
│ (sample one)    from api-proxy                                              │
│      │                   │                                                  │
│      ▼                   ▼                                                  │
│ ┌──────────┐      ┌──────────────┐                                          │
│ │ Valid?   │      │ Await fresh  │                                          │
│ └────┬─────┘      │ episodes     │                                          │
│      │            └──────┬───────┘                                          │
│  ┌───┴───┐               │                                                  │
│  ▼       ▼               ▼                                                  │
│ YES      NO         Return fresh                                            │
│ │        │          data to client                                          │
│ │        │          source: "fresh"                                         │
│ ▼        ▼               │                                                  │
│ Return   Synchronous     │                                                  │
│ cache    fetch (await)   │                                                  │
│ source:  source:         │                                                  │
│ "cache"  "fresh"         │                                                  │
│                          │                                                  │
│                          ▼                                                  │
│                   ┌──────────────┐                                          │
│                   │ Cache to DB  │                                          │
│                   │ (background) │                                          │
│                   └──────────────┘                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Synchronous vs Fire-and-Forget

The system uses two different strategies depending on the use case:

| Strategy            | Use Case                       | Behavior                                        |
| ------------------- | ------------------------------ | ----------------------------------------------- |
| **Synchronous**     | Drama detail (`/dramas/:slug`) | Wait for api-proxy, return fresh data to client |
| **Fire-and-Forget** | Drama list (`/dramas`)         | Return data immediately, cache in background    |

**Why the difference?**

- **Detail endpoint**: User expects to watch episodes immediately. Stale data would result in broken video URLs. Synchronous fetch ensures working videos.
- **List endpoint**: User is browsing. Fast response is more important than fresh data. Fire-and-forget allows immediate response while data populates in background.

#### Implementation

```typescript
// Synchronous fetch for detail endpoint
private async fetchEpisodesSynchronously(
  bookId: string,
  dramaId: string,
): Promise<Episode[] | null> {
  const result = await getEpisodes(bookId);

  if (!result.success) return null;

  const freshEpisodes = result.data.episodes.map(apiEpisode => ({
    // Transform api-proxy format to DB format
    ...
  }));

  // Cache to DB (fire-and-forget)
  this.cacheEpisodesToDb(bookId, dramaId, result.data.episodes);

  return freshEpisodes;
}
```

The synchronous approach ensures users always get working video URLs when viewing a drama detail page.

### Implementation

```typescript
// apps/api/src/lib/fallback.ts
export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount = 0;
  private nextAttempt: number = 0;

  constructor(private config: CircuitBreakerConfig) {}

  canExecute(): boolean {
    if (this.state === "CLOSED") return true;

    if (this.state === "OPEN") {
      if (Date.now() >= this.nextAttempt) {
        this.state = "HALF_OPEN";
        return true;
      }
      return false;
    }

    return true; // HALF_OPEN
  }

  recordSuccess(): void {
    this.failureCount = 0;
    if (this.state === "HALF_OPEN") {
      this.state = "CLOSED";
    }
  }

  recordFailure(): void {
    this.failureCount++;

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = "OPEN";
      this.nextAttempt = Date.now() + this.config.resetTimeoutMs;
    }
  }
}

export class FallbackService {
  async execute<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<FallbackResult<T>> {
    // Try primary first
    if (this.circuitBreaker.canExecute()) {
      try {
        const result = await this.tryPrimary<T>(path, options);
        this.circuitBreaker.recordSuccess();
        return { success: true, data: result, source: "primary" };
      } catch (error) {
        this.circuitBreaker.recordFailure();
      }
    }

    // Fallback
    try {
      const result = await this.tryFallback<T>(path, options);
      return { success: true, data: result, source: "fallback" };
    } catch (error) {
      return { success: false, error: error.message, source: "none" };
    }
  }
}
```

### Configuration

```typescript
const defaultFallbackConfig: FallbackConfig = {
  primaryUrl: process.env.PRIMARY_API_URL || "http://localhost:3001",
  fallbackUrl: process.env.API_PROXY_URL || "http://localhost:3002",
  timeoutMs: 5000,
  circuitBreaker: {
    failureThreshold: 3,
    resetTimeoutMs: 30000, // 30 seconds
    name: "video-fallback",
  },
};
```

---

## State Management

DramaStream uses **TanStack Query** for server state management with optimistic updates.

### Data Flow Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                    State Management                           │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                   Component Layer                       │  │
│  │  useWatchlist()  │  useHistory()  │  useDramas()        │  │
│  └────────────────────┬────────────────────────────────────┘  │
│                       │                                       │
│                       ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                 TanStack Query                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │  │
│  │  │   Cache     │  │   Mutations │  │  Background │      │  │
│  │  │   (Query)   │  │(useMutation)│  │   Refetch   │      │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │  │
│  └────────────────────┬────────────────────────────────────┘  │
│                       │                                       │
│                       ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                    API Layer                            │  │
│  │              HTTP Requests to Hono API                  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Optimistic Updates Pattern

```typescript
// apps/web/src/hooks/use-watchlist.ts
export function useAddToWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addToWatchlist,

    // Optimistic update
    onMutate: async (dramaId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["watchlist"] });

      // Snapshot previous value
      const previousWatchlist = queryClient.getQueryData<WatchlistItem[]>([
        "watchlist",
      ]);

      // Optimistically update
      queryClient.setQueryData(["watchlist", "status", dramaId], true);

      // Return context for rollback
      return { previousWatchlist };
    },

    // Rollback on error
    onError: (err, dramaId, context) => {
      if (context?.previousWatchlist) {
        queryClient.setQueryData(["watchlist"], context.previousWatchlist);
      }
    },

    // Refetch after settle
    onSettled: (data, error, dramaId) => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      queryClient.invalidateQueries({
        queryKey: ["watchlist", "status", dramaId],
      });
    },
  });
}
```

### Query Client Configuration

```typescript
// apps/web/src/routes/__root.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false, // Don't refetch on tab focus
      retry: 2, // Retry failed requests
    },
    mutations: {
      retry: 1,
    },
  },
});
```

### Custom Hooks Pattern

```typescript
// Server state hooks
export function useWatchlist() {
  return useQuery({
    queryKey: ["watchlist"],
    queryFn: fetchWatchlist,
  });
}

export function useWatchlistStatus(dramaId: string) {
  return useQuery({
    queryKey: ["watchlist", "status", dramaId],
    queryFn: () => checkWatchlistStatus(dramaId),
    enabled: !!dramaId,
  });
}

// Mutation hooks
export function useAddToWatchlist() {
  // ... optimistic update implementation
}

export function useRemoveFromWatchlist() {
  // ... optimistic update implementation
}
```

---

## Testing Strategy

Comprehensive testing at multiple levels ensures reliability.

### Testing Pyramid

```
                      ▲
                    ╱   ╲
                   ╱     ╲
                  ╱  E2E  ╲       Playwright
                 ╱         ╲      (User flows)
                ╱───────────╲
               ╱ Integration ╲    API + DB
              ╱               ╲   (Route testing)
             ╱─────────────────╲
            ╱      Unit         ╲ Bun:test
           ╱                     ╲(Services, Utils)
          ╱───────────────────────╲
```

### Unit Tests (Bun:test)

```typescript
// apps/api/src/test/drama.service.test.ts
import { describe, it, expect, beforeEach } from "bun:test";
import { dramaService } from "../services/drama.service";

describe("DramaService", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should list dramas with pagination", async () => {
    const result = await dramaService.list(1, 10);

    expect(result.items).toBeArray();
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.pageSize).toBe(10);
  });

  it("should get drama by slug", async () => {
    const drama = await dramaService.getBySlug("test-drama");

    expect(drama).toBeDefined();
    expect(drama.slug).toBe("test-drama");
  });
});
```

### Integration Tests

```typescript
// apps/api/src/test/watchlist.test.ts
describe("Watchlist Routes", () => {
  it("should add item to watchlist", async () => {
    const response = await fetch("http://localhost:3001/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dramaId: "123" }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
```

### E2E Tests (Playwright)

```typescript
// e2e/watchlist.spec.ts
import { test, expect } from "@playwright/test";

test("user can add drama to watchlist", async ({ page }) => {
  // Login
  await page.goto("/login");
  await page.fill("[name=email]", "test@example.com");
  await page.fill("[name=password]", "password");
  await page.click("button[type=submit]");

  // Navigate to drama
  await page.goto("/dramas/test-drama");

  // Add to watchlist
  await page.click("[data-testid=add-to-watchlist]");

  // Verify
  await expect(page.locator("[data-testid=watchlist-added]")).toBeVisible();
});
```

### Test Configuration

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "bun run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Deployment

The application is containerized with Docker for consistent deployments.

### Docker Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                    Docker Compose Stack                       │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Web Service (TanStack Start)                           │  │
│  │  ─────────────────────────────                          │  │
│  │  Port: 3000                                             │  │
│  │  Build: Multi-stage (Node + Bun)                        │  │
│  │  Resources: 0.25 CPU, 256MB RAM                         │  │
│  │  Health: HTTP check on /health                          │  │
│  └─────────────────────────────────────────────────────────┘  │
│                              │                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  API Service (Hono)                                     │  │
│  │  ─────────────────                                      │  │
│  │  Port: 3001                                             │  │
│  │  Build: Multi-stage (Node + Bun)                        │  │
│  │  Resources: 0.5 CPU, 512MB RAM                          │  │
│  │  Health: HTTP check on /health                          │  │
│  │  Depends: PostgreSQL                                    │  │
│  └─────────────────────────────────────────────────────────┘  │
│                              │                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  API-Proxy Service (Fallback)                           │  │
│  │  ───────────────────────────                            │  │
│  │  Port: 3002                                             │  │
│  │  Profile: fallback, full                                │  │
│  │  Resources: 0.25 CPU, 256MB RAM                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                              │                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database                                    │  │
│  │  ───────────────────                                    │  │
│  │  Port: 5432                                             │  │
│  │  Image: postgres:15-alpine                              │  │
│  │  Volume: postgres_data (persistent)                     │  │
│  │  Health: pg_isready                                     │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Multi-Stage Dockerfile

```dockerfile
# apps/api/Dockerfile
FROM oven/bun:1.1-alpine AS builder

WORKDIR /app
COPY package.json bun.lockb turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

RUN bun install --frozen-lockfile

COPY . .
RUN bun run build --filter=api

# Production stage
FROM oven/bun:1.1-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./

EXPOSE 3001
CMD ["bun", "run", "start"]
```

### Environment Configuration

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${DATABASE_USER:-drama}
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD:-drama123}
      POSTGRES_DB: ${DATABASE_NAME:-dracin}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DATABASE_USER:-drama}"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    environment:
      DATABASE_URL: postgresql://${DATABASE_USER:-drama}:${DATABASE_PASSWORD:-drama123}@db:5432/${DATABASE_NAME:-dracin}
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    environment:
      VITE_API_URL: http://api:3001
    depends_on:
      api:
        condition: service_healthy
```

### Deployment Commands

```bash
# Development
docker-compose up -d

# With fallback service
docker-compose --profile fallback up -d

# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f

# Scale API
docker-compose up -d --scale api=3
```

---

## Key Design Decisions

### Why TanStack Start (Alpha) over Next.js?

| Factor            | TanStack Start                  | Next.js                      |
| ----------------- | ------------------------------- | ---------------------------- |
| **Type Safety**   | End-to-end type-safe routing    | Limited type safety          |
| **SSR Model**     | Streaming SSR with fine control | App Router complexity        |
| **Data Fetching** | TanStack Query integration      | Server Components complexity |
| **Bundle Size**   | Smaller, tree-shakeable         | Larger runtime               |
| **Flexibility**   | Framework-agnostic patterns     | Vercel-centric               |

**Decision**: TanStack Start provides better type safety and a simpler mental model for full-stack React applications.

### Why Hono over Express?

| Factor          | Hono                        | Express                 |
| --------------- | --------------------------- | ----------------------- |
| **Performance** | Faster, lighter             | Established but heavier |
| **Type Safety** | Native TypeScript support   | Requires @types/express |
| **Middleware**  | Composable, type-safe       | Callback-based          |
| **Edge Ready**  | Works on Cloudflare Workers | Node.js only            |
| **Bundle Size** | ~10KB                       | ~50KB+                  |

**Decision**: Hono's type safety and performance characteristics align with modern TypeScript development.

### Why Drizzle ORM over Prisma?

| Factor          | Drizzle ORM             | Prisma                |
| --------------- | ----------------------- | --------------------- |
| **Query Style** | SQL-like, explicit      | DSL, abstracted       |
| **Bundle Size** | Smaller                 | Larger                |
| **Performance** | Zero runtime overhead   | Query engine overhead |
| **Migrations**  | SQL-based, transparent  | Prisma Migrate        |
| **Type Safety** | Infer types from schema | Generated types       |

**Decision**: Drizzle provides better performance and more control over SQL queries while maintaining type safety.

### Why PostgreSQL over SQLite?

| Factor           | PostgreSQL          | SQLite               |
| ---------------- | ------------------- | -------------------- |
| **Concurrency**  | Excellent           | Limited (file-based) |
| **Scalability**  | Horizontal scaling  | Single file          |
| **Features**     | Full SQL compliance | Limited feature set  |
| **Production**   | Battle-tested       | Best for embedded    |
| **JSON Support** | Native JSONB        | Limited              |

**Decision**: PostgreSQL provides the reliability and feature set needed for a production streaming platform.

---

## Performance Considerations

### Database Optimization

#### Indexing Strategy

```typescript
// Composite indexes for common queries
export const watchlist = pgTable(
  "watchlist",
  {
    // ... columns
  },
  (table) => ({
    // Unique constraint + lookup
    userDramaIdx: uniqueIndex("watchlist_user_drama_idx").on(
      table.userId,
      table.dramaId,
    ),

    // Sort by added date
    userAddedAtIdx: index("watchlist_user_added_at_idx").on(
      table.userId,
      table.addedAt,
    ),
  }),
);
```

#### Query Optimization

```typescript
// Use relations for efficient joins
const drama = await db.query.dramas.findFirst({
  where: eq(dramas.slug, slug),
  with: {
    seasons: {
      with: {
        episodes: true, // Nested relations in single query
      },
    },
  },
});
```

### API Response Caching

```typescript
// Cache drama lists for 5 minutes
app.get("/api/dramas", async (c) => {
  const result = await dramaService.list(page, pageSize);
  c.header("Cache-Control", "public, max-age=300");
  return c.json({ success: true, data: result });
});

// Cache individual drama for 1 minute
app.get("/api/dramas/:slug", async (c) => {
  const drama = await dramaService.getBySlug(slug);
  c.header("Cache-Control", "public, max-age=60");
  return c.json({ success: true, data: drama });
});
```

### Video Streaming Optimization

```typescript
// Lazy load video metadata
<video
  preload="metadata"      // Don't preload entire video
  playsInline             // iOS optimization
  crossOrigin="anonymous" // Enable range requests
/>

// Progressive quality switching
const qualities = ["240p", "360p", "480p", "720p", "1080p", "4k"];
const currentQuality = selectQualityBasedOnBandwidth();
```

### Bundle Optimization

```typescript
// TanStack Query tree-shaking
import { useQuery } from "@tanstack/react-query";

// Route-based code splitting
const WatchlistPage = lazy(() => import("./routes/watchlist"));
const HistoryPage = lazy(() => import("./routes/history"));
```

---

## Security Considerations

### Authentication & Authorization

```typescript
// Middleware validates session
app.use("*", authMiddleware);

// Protected routes check user
app.post("/api/watchlist", requireAuth, async (c) => {
  const user = c.get("user");
  // Only access user's own data
  const result = await watchlistService.add(user.id, dramaId);
});
```

### SQL Injection Prevention

Drizzle ORM uses parameterized queries by default:

```typescript
// Safe - uses parameterized query
await db.query.dramas.findFirst({
  where: eq(dramas.slug, userInput), // Automatically escaped
});

// Safe - explicit parameterization
await db.execute(sql`SELECT * FROM dramas WHERE slug = ${userInput}`);
```

### XSS Protection

```typescript
// React escapes content by default
function DramaCard({ drama }: { drama: Drama }) {
  return (
    <div>
      {/* Automatically escaped */}
      <h2>{drama.title}</h2>
      <p>{drama.description}</p>
    </div>
  );
}

// Dangerous - only use when content is trusted
function HtmlDescription({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: sanitize(html) }} />;
}
```

### CORS Configuration

```typescript
app.use(
  "*",
  cors({
    origin: [
      "http://localhost:3000", // Development
      "https://app.dramastream.com", // Production
    ],
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true, // Required for cookies
    maxAge: 86400, // 24 hours
  }),
);
```

### Rate Limiting

```typescript
// Better-Auth built-in rate limiting
rateLimit: {
  enabled: true,
  window: 60,     // 1 minute window
  max: 10,        // 10 requests per window
}

// Custom middleware for API routes
app.use("/api/*", rateLimiter({
  limit: 100,
  window: 60000,
}));
```

### Security Headers

```typescript
app.use("*", async (c, next) => {
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("X-XSS-Protection", "1; mode=block");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  await next();
});
```

---

## Related Documentation

- [API Documentation](./API_DOCS.md) - Detailed API endpoint reference
- [README.md](../README.md) - Quick start and general information
- [Contributing Guide](../CONTRIBUTING.md) - Development workflow

---

## Architecture Evolution

This architecture is designed to evolve:

1. **CDN Integration**: Video URLs can be switched to CDN endpoints
2. **Microservices**: Service layer can be extracted to separate services
3. **Caching Layer**: Redis can be added for session and API caching
4. **Queue System**: Background jobs for video processing
5. **Analytics**: ClickHouse or similar for viewing analytics

---

_Last updated: February 2026_
