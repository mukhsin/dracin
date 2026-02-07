import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { users, dramas, episodes, watchlist, watchHistory } from "./schema.js";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || "postgresql://localhost:5432/dracin",
});

const db = drizzle(pool);

async function seed() {
  console.log("Seeding database...");

  const [user1, user2] = await db
    .insert(users)
    .values([
      {
        email: "alice@example.com",
        name: "Alice Johnson",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=alice",
      },
      {
        email: "bob@example.com",
        name: "Bob Smith",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=bob",
      },
    ])
    .returning();

  console.log(`Created users: ${user1.name}, ${user2.name}`);

  const [drama1, drama2] = await db
    .insert(dramas)
    .values([
      {
        title: "The Silent Echo",
        slug: "the-silent-echo",
        description:
          "A gripping mystery thriller about a detective who discovers she can hear echoes from the past.",
        posterUrl: "https://picsum.photos/seed/silent-echo/300/450",
        status: "ongoing",
        language: "en",
        metadata: {
          releaseYear: 2024,
          country: "South Korea",
          genre: ["Mystery", "Thriller", "Supernatural"],
          rating: 8.5,
          totalEpisodes: 16,
        },
      },
      {
        title: "Summer Dreams",
        slug: "summer-dreams",
        description:
          "A heartwarming romance set in a small coastal town during the summer of 1998.",
        posterUrl: "https://picsum.photos/seed/summer-dreams/300/450",
        status: "completed",
        language: "en",
        metadata: {
          releaseYear: 2023,
          country: "Japan",
          genre: ["Romance", "Drama", "Slice of Life"],
          rating: 9.0,
          totalEpisodes: 12,
        },
      },
    ])
    .returning();

  console.log(`Created dramas: ${drama1.title}, ${drama2.title}`);

  const eps1 = await db
    .insert(episodes)
    .values([
      {
        dramaId: drama1.id,
        number: 1,
        title: "The First Echo",
        description: "Detective Kim hears her first echo from the past.",
        duration: 3600,
        videoUrls: {
          "720p": "https://example.com/videos/silent-echo-s1e1-720p.mp4",
          "1080p": "https://example.com/videos/silent-echo-s1e1-1080p.mp4",
        },
      },
      {
        dramaId: drama1.id,
        number: 2,
        title: "Whispers in the Dark",
        description: "The echoes grow louder and more disturbing.",
        duration: 3540,
        videoUrls: {
          "720p": "https://example.com/videos/silent-echo-s1e2-720p.mp4",
          "1080p": "https://example.com/videos/silent-echo-s1e2-1080p.mp4",
        },
      },
      {
        dramaId: drama1.id,
        number: 3,
        title: "Echoes of Truth",
        description: "Kim discovers the source of the echoes.",
        duration: 3480,
        videoUrls: {
          "720p": "https://example.com/videos/silent-echo-s1e3-720p.mp4",
          "1080p": "https://example.com/videos/silent-echo-s1e3-1080p.mp4",
        },
      },
    ])
    .returning();

  const eps2 = await db
    .insert(episodes)
    .values([
      {
        dramaId: drama2.id,
        number: 1,
        title: "The Encounter",
        description: "Two strangers meet on the beach.",
        duration: 2700,
        videoUrls: {
          "720p": "https://example.com/videos/summer-dreams-s1e1-720p.mp4",
          "1080p": "https://example.com/videos/summer-dreams-s1e1-1080p.mp4",
        },
      },
      {
        dramaId: drama2.id,
        number: 2,
        title: "First Date",
        description: "Their first date at the lighthouse.",
        duration: 2640,
        videoUrls: {
          "720p": "https://example.com/videos/summer-dreams-s1e2-720p.mp4",
          "1080p": "https://example.com/videos/summer-dreams-s1e2-1080p.mp4",
        },
      },
    ])
    .returning();

  console.log(
    `Created ${eps1.length} episodes for drama 1, ${eps2.length} episodes for drama 2`,
  );

  await db.insert(watchlist).values([
    {
      userId: user1.id,
      dramaId: drama1.id,
    },
    {
      userId: user1.id,
      dramaId: drama2.id,
    },
    {
      userId: user2.id,
      dramaId: drama1.id,
    },
  ]);

  console.log("Added dramas to user watchlists");

  await db.insert(watchHistory).values([
    {
      userId: user1.id,
      episodeId: eps1[0].id,
      progress: 3600,
      completed: true,
      watchedAt: new Date(Date.now() - 86400000),
    },
    {
      userId: user1.id,
      episodeId: eps1[1].id,
      progress: 1800,
      completed: false,
    },
    {
      userId: user2.id,
      episodeId: eps2[0].id,
      progress: 2700,
      completed: true,
      watchedAt: new Date(Date.now() - 172800000),
    },
  ]);

  console.log("Added watch history entries");

  console.log("Seeding completed successfully!");
  await pool.end();
}

seed().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
