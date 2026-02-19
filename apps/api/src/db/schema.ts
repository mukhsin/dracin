import { relations, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { DramaMetadata, VideoQuality } from "@repo/shared/types";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const nowEpoch = () =>
  sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`;
const uuidDefault = () => randomUUID();

export const dramaStatusEnum = ["ongoing", "completed", "upcoming"] as const;

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey().$defaultFn(uuidDefault),
    email: text("email").notNull().unique(),
    emailVerified: integer("email_verified", { mode: "boolean" })
      .notNull()
      .default(false),
    name: text("name"),
    image: text("image"),
    avatarUrl: text("avatar_url"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowEpoch()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowEpoch()),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
  }),
);

export const dramas = sqliteTable(
  "dramas",
  {
    id: text("id").primaryKey().$defaultFn(uuidDefault),
    bookId: text("book_id").$type<string | null>().unique(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    posterUrl: text("poster_url"),
    status: text("status", { enum: dramaStatusEnum })
      .notNull()
      .default("upcoming"),
    language: text("language"),
    playCount: text("play_count"),
    sourceEndpoint: text("source_endpoint"),
    releaseYear: integer("release_year").$type<number | null>(),
    country: text("country").$type<string | null>(),
    rating: real("rating").$type<number | null>(),
    totalEpisodes: integer("total_episodes").$type<number | null>(),
    genres: text("genres", { mode: "json" }).$type<string[] | null>(),
    metadata: text("metadata", { mode: "json" }).$type<DramaMetadata | null>(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowEpoch()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowEpoch()),
  },
  (table) => ({
    slugIdx: uniqueIndex("dramas_slug_idx").on(table.slug),
    bookIdIdx: uniqueIndex("dramas_book_id_idx").on(table.bookId),
    statusIdx: index("dramas_status_idx").on(table.status),
    titleIdx: index("dramas_title_idx").on(table.title),
    languageIdx: index("dramas_language_idx").on(table.language),
  }),
);

export const episodes = sqliteTable(
  "episodes",
  {
    id: text("id").primaryKey().$defaultFn(uuidDefault),
    dramaId: text("drama_id")
      .notNull()
      .references(() => dramas.id, { onDelete: "cascade" }),
    bookId: text("book_id"),
    number: integer("number").notNull(),
    title: text("title"),
    description: text("description"),
    duration: integer("duration"),
    videoUrls: text("video_urls", { mode: "json" }).$type<Partial<
      Record<VideoQuality, string>
    > | null>(),
    sourceUrl: text("source_url"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowEpoch()),
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

export const watchlist = sqliteTable(
  "watchlist",
  {
    id: text("id").primaryKey().$defaultFn(uuidDefault),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dramaId: text("drama_id")
      .notNull()
      .references(() => dramas.id, { onDelete: "cascade" }),
    addedAt: integer("added_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowEpoch()),
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

export const watchHistory = sqliteTable(
  "watch_history",
  {
    id: text("id").primaryKey().$defaultFn(uuidDefault),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    episodeId: text("episode_id")
      .notNull()
      .references(() => episodes.id, { onDelete: "cascade" }),
    progress: integer("progress").notNull().default(0),
    watchedAt: integer("watched_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowEpoch()),
    completed: integer("completed", { mode: "boolean" })
      .notNull()
      .default(false),
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

export const accounts = sqliteTable(
  "auth_accounts",
  {
    id: text("id").primaryKey().$defaultFn(uuidDefault),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowEpoch()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowEpoch()),
  },
  (table) => ({
    userIdx: index("auth_accounts_user_idx").on(table.userId),
    providerIdx: index("auth_accounts_provider_idx").on(
      table.providerId,
      table.accountId,
    ),
  }),
);

export const sessions = sqliteTable(
  "auth_sessions",
  {
    id: text("id").primaryKey().$defaultFn(uuidDefault),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowEpoch()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowEpoch()),
  },
  (table) => ({
    userIdx: index("auth_sessions_user_idx").on(table.userId),
    tokenIdx: uniqueIndex("auth_sessions_token_idx").on(table.token),
  }),
);

export const verifications = sqliteTable(
  "auth_verifications",
  {
    id: text("id").primaryKey().$defaultFn(uuidDefault),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowEpoch()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowEpoch()),
  },
  (table) => ({
    identifierIdx: index("auth_verifications_identifier_idx").on(
      table.identifier,
    ),
  }),
);

export const latest_dramas = sqliteTable(
  "latest_dramas",
  {
    id: text("id").primaryKey().$defaultFn(uuidDefault),
    bookId: text("book_id").notNull().unique(),
    position: integer("position").notNull(),
    syncedAt: integer("synced_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowEpoch()),
  },
  (table) => ({
    bookIdIdx: uniqueIndex("latest_dramas_book_id_idx").on(table.bookId),
    positionIdx: index("latest_dramas_position_idx").on(table.position),
  }),
);

export const featured_dramas = sqliteTable(
  "featured_dramas",
  {
    id: text("id").primaryKey().$defaultFn(uuidDefault),
    bookId: text("book_id").notNull().unique(),
    position: integer("position").notNull(),
    syncedAt: integer("synced_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowEpoch()),
  },
  (table) => ({
    bookIdIdx: uniqueIndex("featured_dramas_book_id_idx").on(table.bookId),
    positionIdx: index("featured_dramas_position_idx").on(table.position),
  }),
);

export const usersRelations = relations(users, ({ many }) => ({
  watchlist: many(watchlist),
  watchHistory: many(watchHistory),
}));

export const dramasRelations = relations(dramas, ({ many }) => ({
  episodes: many(episodes),
  watchlist: many(watchlist),
}));

export const episodesRelations = relations(episodes, ({ one, many }) => ({
  drama: one(dramas, {
    fields: [episodes.dramaId],
    references: [dramas.id],
  }),
  watchHistory: many(watchHistory),
}));

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

export type LatestDrama = typeof latest_dramas.$inferSelect;
export type NewLatestDrama = typeof latest_dramas.$inferInsert;

export type FeaturedDrama = typeof featured_dramas.$inferSelect;
export type NewFeaturedDrama = typeof featured_dramas.$inferInsert;
