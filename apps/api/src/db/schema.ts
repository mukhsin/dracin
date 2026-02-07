import { relations } from "drizzle-orm";
import {
  bigint,
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ============================================
// Users Table (Extended for Better-Auth)
// ============================================
// Note: Better-Auth will create the base users table
// This schema extends it with additional profile fields
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    name: text("name"),
    image: text("image"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
  }),
);

export const usersRelations = relations(users, ({ many }) => ({
  watchlist: many(watchlist),
  watchHistory: many(watchHistory),
}));

// ============================================
// Dramas Table
// ============================================
export const dramaStatusEnum = ["ongoing", "completed", "upcoming"] as const;

export const dramas = pgTable(
  "dramas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // External book ID from SQL data for correlation
    bookId: bigint("book_id", { mode: "number" }).unique(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    posterUrl: text("poster_url"),
    status: text("status", { enum: dramaStatusEnum })
      .notNull()
      .default("upcoming"),
    // Language from SQL data (en, id, es, pt)
    language: text("language"),
    // Play count from SQL data (stored as string, e.g., "14M", "317K")
    playCount: text("play_count"),
    // Source endpoint from SQL data
    sourceEndpoint: text("source_endpoint"),
    // Flexible metadata for future extensibility
    metadata: jsonb("metadata").$type<{
      releaseYear?: number;
      country?: string;
      genre?: string[];
      rating?: number;
      totalEpisodes?: number;
    }>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    slugIdx: uniqueIndex("dramas_slug_idx").on(table.slug),
    bookIdIdx: uniqueIndex("dramas_book_id_idx").on(table.bookId),
    statusIdx: index("dramas_status_idx").on(table.status),
    titleIdx: index("dramas_title_idx").on(table.title),
    languageIdx: index("dramas_language_idx").on(table.language),
  }),
);

export const dramasRelations = relations(dramas, ({ many }) => ({
  episodes: many(episodes),
  watchlist: many(watchlist),
}));

// ============================================
// Episodes Table
// ============================================
export const episodes = pgTable(
  "episodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Reference to drama directly (no seasons)
    dramaId: uuid("drama_id")
      .notNull()
      .references(() => dramas.id, { onDelete: "cascade" }),
    // External book ID from SQL data for correlation
    bookId: bigint("book_id", { mode: "number" }),
    number: integer("number").notNull(),
    title: text("title"),
    description: text("description"),
    duration: integer("duration"), // in seconds
    // Video URLs - mapped from SQL 'url' field
    videoUrls:
      jsonb("video_urls").$type<
        Partial<
          Record<"240p" | "360p" | "480p" | "720p" | "1080p" | "4k", string>
        >
      >(),
    // Source URL from SQL data
    sourceUrl: text("source_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    dramaNumberIdx: uniqueIndex("episodes_drama_number_idx").on(
      table.dramaId,
      table.number,
    ),
    dramaIdx: index("episodes_drama_idx").on(table.dramaId),
    bookIdIdx: index("episodes_book_id_idx").on(table.bookId),
  }),
);

export const episodesRelations = relations(episodes, ({ one, many }) => ({
  drama: one(dramas, {
    fields: [episodes.dramaId],
    references: [dramas.id],
  }),
  watchHistory: many(watchHistory),
}));

// ============================================
// Watchlist Table
// ============================================
export const watchlist = pgTable(
  "watchlist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dramaId: uuid("drama_id")
      .notNull()
      .references(() => dramas.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userDramaIdx: uniqueIndex("watchlist_user_drama_idx").on(
      table.userId,
      table.dramaId,
    ),
    userAddedAtIdx: index("watchlist_user_added_at_idx").on(
      table.userId,
      table.addedAt,
    ),
    userIdx: index("watchlist_user_idx").on(table.userId),
    dramaIdx: index("watchlist_drama_idx").on(table.dramaId),
  }),
);

export const watchlistRelations = relations(watchlist, ({ one }) => ({
  user: one(users, {
    fields: [watchlist.userId],
    references: [users.id],
  }),
  drama: one(dramas, {
    fields: [watchlist.dramaId],
    references: [dramas.id],
  }),
}));

// ============================================
// Watch History Table
// ============================================
export const watchHistory = pgTable(
  "watch_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    episodeId: uuid("episode_id")
      .notNull()
      .references(() => episodes.id, { onDelete: "cascade" }),
    progress: integer("progress").notNull().default(0), // in seconds
    watchedAt: timestamp("watched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completed: boolean("completed").notNull().default(false),
  },
  (table) => ({
    userEpisodeIdx: uniqueIndex("watch_history_user_episode_idx").on(
      table.userId,
      table.episodeId,
    ),
    userWatchedAtIdx: index("watch_history_user_watched_at_idx").on(
      table.userId,
      table.watchedAt,
    ),
    userIdx: index("watch_history_user_idx").on(table.userId),
    episodeIdx: index("watch_history_episode_idx").on(table.episodeId),
  }),
);

export const watchHistoryRelations = relations(watchHistory, ({ one }) => ({
  user: one(users, {
    fields: [watchHistory.userId],
    references: [users.id],
  }),
  episode: one(episodes, {
    fields: [watchHistory.episodeId],
    references: [episodes.id],
  }),
}));

// ============================================
// Better-Auth Tables
// ============================================
// These tables are required by Better-Auth for authentication

export const accounts = pgTable(
  "auth_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdx: index("auth_accounts_user_idx").on(table.userId),
    providerIdx: index("auth_accounts_provider_idx").on(
      table.providerId,
      table.accountId,
    ),
  }),
);

export const sessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdx: index("auth_sessions_user_idx").on(table.userId),
    tokenIdx: uniqueIndex("auth_sessions_token_idx").on(table.token),
  }),
);

export const verifications = pgTable(
  "auth_verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    identifierIdx: index("auth_verifications_identifier_idx").on(
      table.identifier,
    ),
  }),
);

// ============================================
// Type Exports
// ============================================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Drama = typeof dramas.$inferSelect;
export type NewDrama = typeof dramas.$inferInsert;

export type Episode = typeof episodes.$inferSelect;
export type NewEpisode = typeof episodes.$inferInsert;

export type WatchlistItem = typeof watchlist.$inferSelect;
export type NewWatchlistItem = typeof watchlist.$inferInsert;

export type WatchHistoryItem = typeof watchHistory.$inferSelect;
export type NewWatchHistoryItem = typeof watchHistory.$inferInsert;
