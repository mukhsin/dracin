import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "bun:test";
import { createApp } from "../app.js";
import { db } from "../db/index.js";
import { dramas, episodes, watchHistory, users } from "../db/schema.js";
import { eq, and, sql } from "drizzle-orm";

const app = createApp();

const TEST_USER = {
  email: `history-merge-test-${Date.now()}@example.com`,
  password: "TestPassword123!",
  name: "History Merge Test User",
};

let sessionCookie: string;
let testUserId: string;
let testDramaId: string;
let testEpisodeId1: string;
let testEpisodeId2: string;

async function registerAndLoginUser(
  user: typeof TEST_USER,
): Promise<{ cookie: string; userId: string }> {
  const registerRes = await app.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });

  expect(registerRes.status).toBe(200);
  const registerData = await registerRes.json();
  const userId = registerData.user.id;

  const loginRes = await app.request("/api/auth/sign-in/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
    }),
  });

  expect(loginRes.status).toBe(200);
  const cookie = loginRes.headers.get("set-cookie");
  expect(cookie).toBeDefined();

  return { cookie: cookie!, userId };
}

async function createTestDrama(title: string, slug: string) {
  const [drama] = await db
    .insert(dramas)
    .values({
      title,
      slug,
      description: `Test description for ${title}`,
      posterUrl: "https://example.com/poster.jpg",
      status: "ongoing",
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

async function createTestEpisode(
  dramaId: string,
  number: number,
  duration = 3600,
) {
  const [episode] = await db
    .insert(episodes)
    .values({
      dramaId,
      number,
      title: `Episode ${number}`,
      description: `Test episode ${number}`,
      duration,
      videoUrls: { "720p": "https://example.com/video.mp4" },
    })
    .returning();

  return episode;
}

async function ensureWatchHistoryRefactorSchema() {
  await db.run(sql.raw(`PRAGMA foreign_keys = OFF;`));
  await db.run(sql.raw(`DROP TABLE IF EXISTS "auth_accounts";`));
  await db.run(sql.raw(`DROP TABLE IF EXISTS "auth_sessions";`));
  await db.run(sql.raw(`DROP TABLE IF EXISTS "auth_verifications";`));
  await db.run(sql.raw(`DROP TABLE IF EXISTS "watch_history";`));
  await db.run(sql.raw(`DROP TABLE IF EXISTS "episodes";`));
  await db.run(sql.raw(`DROP TABLE IF EXISTS "dramas";`));
  await db.run(sql.raw(`DROP TABLE IF EXISTS "users";`));
  await db.run(sql.raw(`PRAGMA foreign_keys = ON;`));

  await db.run(
    sql.raw(`
    CREATE TABLE "users" (
      "id" text PRIMARY KEY NOT NULL,
      "email" text NOT NULL,
      "email_verified" integer DEFAULT false NOT NULL,
      "name" text,
      "image" text,
      "avatar_url" text,
      "created_at" integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
      "updated_at" integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
    );
  `),
  );
  await db.run(
    sql.raw(`CREATE UNIQUE INDEX "users_email_unique" ON "users" ("email");`),
  );
  await db.run(
    sql.raw(`CREATE UNIQUE INDEX "users_email_idx" ON "users" ("email");`),
  );

  await db.run(
    sql.raw(`
    CREATE TABLE "auth_accounts" (
      "id" text PRIMARY KEY NOT NULL,
      "user_id" text NOT NULL,
      "account_id" text NOT NULL,
      "provider_id" text NOT NULL,
      "access_token" text,
      "refresh_token" text,
      "access_token_expires_at" integer,
      "refresh_token_expires_at" integer,
      "scope" text,
      "id_token" text,
      "password" text,
      "created_at" integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
      "updated_at" integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE cascade
    );
  `),
  );
  await db.run(
    sql.raw(
      `CREATE INDEX "auth_accounts_user_idx" ON "auth_accounts" ("user_id");`,
    ),
  );
  await db.run(
    sql.raw(
      `CREATE INDEX "auth_accounts_provider_idx" ON "auth_accounts" ("provider_id", "account_id");`,
    ),
  );

  await db.run(
    sql.raw(`
    CREATE TABLE "auth_sessions" (
      "id" text PRIMARY KEY NOT NULL,
      "user_id" text NOT NULL,
      "token" text NOT NULL,
      "expires_at" integer NOT NULL,
      "ip_address" text,
      "user_agent" text,
      "created_at" integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
      "updated_at" integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE cascade
    );
  `),
  );
  await db.run(
    sql.raw(
      `CREATE UNIQUE INDEX "auth_sessions_token_unique" ON "auth_sessions" ("token");`,
    ),
  );
  await db.run(
    sql.raw(
      `CREATE INDEX "auth_sessions_user_idx" ON "auth_sessions" ("user_id");`,
    ),
  );
  await db.run(
    sql.raw(
      `CREATE UNIQUE INDEX "auth_sessions_token_idx" ON "auth_sessions" ("token");`,
    ),
  );

  await db.run(
    sql.raw(`
    CREATE TABLE "auth_verifications" (
      "id" text PRIMARY KEY NOT NULL,
      "identifier" text NOT NULL,
      "value" text NOT NULL,
      "expires_at" integer NOT NULL,
      "created_at" integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
      "updated_at" integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
    );
  `),
  );
  await db.run(
    sql.raw(
      `CREATE INDEX "auth_verifications_identifier_idx" ON "auth_verifications" ("identifier");`,
    ),
  );

  await db.run(
    sql.raw(`
    CREATE TABLE "dramas" (
      "id" text PRIMARY KEY NOT NULL,
      "book_id" text,
      "title" text NOT NULL,
      "slug" text NOT NULL,
      "description" text,
      "poster_url" text,
      "status" text DEFAULT 'upcoming' NOT NULL,
      "language" text,
      "play_count" integer,
      "source_endpoint" text,
      "release_year" integer,
      "country" text,
      "rating" real,
      "total_episodes" integer,
      "genres" text,
      "metadata" text,
      "created_at" integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
      "updated_at" integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
    );
  `),
  );
  await db.run(
    sql.raw(
      `CREATE UNIQUE INDEX "dramas_book_id_unique" ON "dramas" ("book_id");`,
    ),
  );
  await db.run(
    sql.raw(`CREATE UNIQUE INDEX "dramas_slug_unique" ON "dramas" ("slug");`),
  );
  await db.run(
    sql.raw(`CREATE UNIQUE INDEX "dramas_slug_idx" ON "dramas" ("slug");`),
  );
  await db.run(
    sql.raw(
      `CREATE UNIQUE INDEX "dramas_book_id_idx" ON "dramas" ("book_id");`,
    ),
  );
  await db.run(
    sql.raw(`CREATE INDEX "dramas_status_idx" ON "dramas" ("status");`),
  );
  await db.run(
    sql.raw(`CREATE INDEX "dramas_title_idx" ON "dramas" ("title");`),
  );
  await db.run(
    sql.raw(`CREATE INDEX "dramas_language_idx" ON "dramas" ("language");`),
  );

  await db.run(
    sql.raw(`
    CREATE TABLE "episodes" (
      "id" text PRIMARY KEY NOT NULL,
      "drama_id" text NOT NULL,
      "book_id" text,
      "number" integer NOT NULL,
      "title" text,
      "description" text,
      "duration" integer,
      "video_urls" text,
      "source_url" text,
      "created_at" integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
      FOREIGN KEY ("drama_id") REFERENCES "dramas"("id") ON UPDATE no action ON DELETE cascade
    );
  `),
  );
  await db.run(
    sql.raw(
      `CREATE UNIQUE INDEX "episodes_drama_number_idx" ON "episodes" ("drama_id", "number");`,
    ),
  );
  await db.run(
    sql.raw(`CREATE INDEX "episodes_drama_idx" ON "episodes" ("drama_id");`),
  );
  await db.run(
    sql.raw(`CREATE INDEX "episodes_book_id_idx" ON "episodes" ("book_id");`),
  );

  await db.run(
    sql.raw(`
    CREATE TABLE "watch_history" (
      "id" text PRIMARY KEY NOT NULL,
      "user_id" text NOT NULL,
      "drama_slug" text NOT NULL,
      "episode_number" integer NOT NULL,
      "progress" integer DEFAULT 0 NOT NULL,
      "watched_at" integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
      "completed" integer DEFAULT false NOT NULL,
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE cascade
    );
  `),
  );
  await db.run(
    sql.raw(
      `CREATE UNIQUE INDEX "watch_history_user_drama_episode_idx" ON "watch_history" ("user_id", "drama_slug", "episode_number");`,
    ),
  );
  await db.run(
    sql.raw(
      `CREATE INDEX "watch_history_user_watched_at_idx" ON "watch_history" ("user_id", "watched_at");`,
    ),
  );
  await db.run(
    sql.raw(
      `CREATE INDEX "watch_history_user_idx" ON "watch_history" ("user_id");`,
    ),
  );
  await db.run(
    sql.raw(
      `CREATE INDEX "watch_history_drama_slug_idx" ON "watch_history" ("drama_slug");`,
    ),
  );
}

describe("History API Integration Tests - POST /api/history/merge-guest", () => {
  beforeAll(async () => {
    await ensureWatchHistoryRefactorSchema();

    const user = await registerAndLoginUser(TEST_USER);
    sessionCookie = user.cookie;
    testUserId = user.userId;

    const drama = await createTestDrama(
      `History Merge Test Drama ${Date.now()}`,
      `history-merge-test-${Date.now()}`,
    );
    testDramaId = drama.id;

    const episode1 = await createTestEpisode(testDramaId, 1, 3600);
    testEpisodeId1 = episode1.id;

    const episode2 = await createTestEpisode(testDramaId, 2, 3600);
    testEpisodeId2 = episode2.id;
  });

  afterAll(async () => {
    if (testUserId) {
      await db.delete(watchHistory).where(eq(watchHistory.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }

    if (testDramaId) {
      await db.delete(episodes).where(eq(episodes.dramaId, testDramaId));
      await db.delete(dramas).where(eq(dramas.id, testDramaId));
    }
  });

  beforeEach(async () => {
    if (testUserId) {
      await db.delete(watchHistory).where(eq(watchHistory.userId, testUserId));
    }
  });

  it("merges authenticated guest entries by inserting missing history rows", async () => {
    const res = await app.request("/api/history/merge-guest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        entries: [
          { episodeId: testEpisodeId1, progress: 120, completed: false },
          { episodeId: testEpisodeId2, progress: 240, completed: true },
        ],
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.data).toEqual({ merged: 2, skipped: 0, total: 2 });

    const stored = await db
      .select()
      .from(watchHistory)
      .where(eq(watchHistory.userId, testUserId));

    expect(stored).toHaveLength(2);
  });

  it("applies deterministic conflict rules: higher progress wins, equal progress prefers completed=true", async () => {
    await app.request("/api/history", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        episodeId: testEpisodeId1,
        progress: 100,
        completed: false,
      }),
    });

    const higherProgressRes = await app.request("/api/history/merge-guest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        entries: [
          { episodeId: testEpisodeId1, progress: 300, completed: false },
        ],
      }),
    });

    expect(higherProgressRes.status).toBe(200);
    let [stored] = await db
      .select()
      .from(watchHistory)
      .where(
        and(
          eq(watchHistory.userId, testUserId),
          eq(watchHistory.episodeNumber, 1),
        ),
      );

    expect(stored.progress).toBe(300);
    expect(stored.completed).toBe(false);

    const equalProgressCompletedRes = await app.request(
      "/api/history/merge-guest",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          entries: [
            { episodeId: testEpisodeId1, progress: 300, completed: true },
          ],
        }),
      },
    );

    expect(equalProgressCompletedRes.status).toBe(200);
    const equalProgressCompletedData = await equalProgressCompletedRes.json();
    expect(equalProgressCompletedData.data).toEqual({
      merged: 1,
      skipped: 0,
      total: 1,
    });

    [stored] = await db
      .select()
      .from(watchHistory)
      .where(
        and(
          eq(watchHistory.userId, testUserId),
          eq(watchHistory.episodeNumber, 1),
        ),
      );

    expect(stored.progress).toBe(300);
    expect(stored.completed).toBe(true);

    const lowerOrWeakerRes = await app.request("/api/history/merge-guest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        entries: [
          { episodeId: testEpisodeId1, progress: 250, completed: true },
          { episodeId: testEpisodeId1, progress: 300, completed: false },
        ],
      }),
    });

    expect(lowerOrWeakerRes.status).toBe(200);
    const lowerOrWeakerData = await lowerOrWeakerRes.json();
    expect(lowerOrWeakerData.data).toEqual({ merged: 0, skipped: 1, total: 1 });

    [stored] = await db
      .select()
      .from(watchHistory)
      .where(
        and(
          eq(watchHistory.userId, testUserId),
          eq(watchHistory.episodeNumber, 1),
        ),
      );

    expect(stored.progress).toBe(300);
    expect(stored.completed).toBe(true);
  });

  it("is idempotent when the same payload is repeated", async () => {
    const payload = {
      entries: [
        { episodeId: testEpisodeId1, progress: 450, completed: false },
        { episodeId: testEpisodeId2, progress: 900, completed: true },
      ],
    };

    const firstRes = await app.request("/api/history/merge-guest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify(payload),
    });

    expect(firstRes.status).toBe(200);
    const firstData = await firstRes.json();
    expect(firstData.data).toEqual({ merged: 2, skipped: 0, total: 2 });

    const secondRes = await app.request("/api/history/merge-guest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify(payload),
    });

    expect(secondRes.status).toBe(200);
    const secondData = await secondRes.json();
    expect(secondData.data).toEqual({ merged: 0, skipped: 2, total: 2 });

    const stored = await db
      .select()
      .from(watchHistory)
      .where(eq(watchHistory.userId, testUserId));

    expect(stored).toHaveLength(2);

    const episode1 = stored.find((item) => item.episodeNumber === 1);
    const episode2 = stored.find((item) => item.episodeNumber === 2);

    expect(episode1).toBeDefined();
    expect(episode1?.progress).toBe(450);
    expect(episode1?.completed).toBe(false);
    expect(episode2).toBeDefined();
    expect(episode2?.progress).toBe(900);
    expect(episode2?.completed).toBe(true);
  });

  it("returns 401 for unauthenticated callers", async () => {
    const res = await app.request("/api/history/merge-guest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        entries: [
          { episodeId: testEpisodeId1, progress: 100, completed: false },
        ],
      }),
    });

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });
});
