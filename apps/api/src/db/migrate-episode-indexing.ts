#!/usr/bin/env node

/**
 * Migration script to convert existing 0-based episodes to 1-based numbering
 *
 * This script fixes episodes that were incorrectly stored with number = 0
 * by updating them to number = 1 (the correct 1-based numbering).
 *
 * Pattern from import-sql-data.ts:194 shows the correct mapping:
 * number: ep.episodeIndex + 1
 */

import { eq } from "drizzle-orm";
import { episodes } from "./schema.js";
import { db } from "./index.js";

async function migrateEpisodeIndexing() {
  console.log("🚀 Starting episode indexing migration...");
  console.log(
    "📊 This script converts episodes with number = 0 to number = 1 (1-based indexing)",
  );

  try {
    // Step 1: Query episodes with number = 0 (incorrect 0-based episodes)
    console.log("\n🔍 Step 1: Querying episodes with number = 0...");

    const zeroBasedEpisodes = await db
      .select({
        id: episodes.id,
        dramaId: episodes.dramaId,
        number: episodes.number,
        title: episodes.title,
      })
      .from(episodes)
      .where(eq(episodes.number, 0))
      .execute();

    console.log(
      `📋 Found ${zeroBasedEpisodes.length} episodes with number = 0`,
    );

    if (zeroBasedEpisodes.length === 0) {
      console.log("✅ No episodes with number = 0 found. Migration completed.");
      return;
    }

    // Log the episodes that will be updated
    console.log("\n📝 Episodes to be updated:");
    zeroBasedEpisodes.forEach((episode, index) => {
      console.log(
        `  ${index + 1}. Episode ID: ${episode.id}, Drama ID: ${episode.dramaId}, Title: ${episode.title || "Untitled"}`,
      );
    });

    // Step 2: Update episodes from 0-based to 1-based
    console.log("\n🔄 Step 2: Converting episodes to 1-based indexing...");

    const updateResults = await db
      .update(episodes)
      .set({
        number: 1, // Convert from 0-based to 1-based
      })
      .where(eq(episodes.number, 0))
      .returning({
        id: episodes.id,
        dramaId: episodes.dramaId,
        number: episodes.number,
        title: episodes.title,
      })
      .execute();

    console.log(`✅ Successfully updated ${updateResults.length} episodes`);
    console.log("🎯 Updated episodes:");
    updateResults.forEach((episode, index) => {
      console.log(
        `  ${index + 1}. Episode ID: ${episode.id}, Drama ID: ${episode.dramaId}, Title: ${episode.title || "Untitled"}, New Number: ${episode.number}`,
      );
    });

    // Step 3: Verify migration completed successfully
    console.log("\n✅ Step 3: Verifying migration results...");

    // Check if any episodes still have number = 0
    const remainingZeroBasedEpisodes = await db
      .select({ id: episodes.id })
      .from(episodes)
      .where(eq(episodes.number, 0))
      .execute();

    if (remainingZeroBasedEpisodes.length === 0) {
      console.log("🎉 Migration verification successful!");
      console.log("✅ All episodes now use correct 1-based numbering");
    } else {
      console.log(
        `⚠️  Migration incomplete! ${remainingZeroBasedEpisodes.length} episodes still have number = 0`,
      );
      console.log("Please investigate these episodes:");
      remainingZeroBasedEpisodes.forEach((episode, index) => {
        console.log(`  ${index + 1}. Episode ID: ${episode.id}`);
      });
    }

    // Show some statistics about the current state
    const allEpisodes = await db
      .select({
        total: episodes.id,
        dramaId: episodes.dramaId,
        number: episodes.number,
      })
      .from(episodes)
      .execute();

    const uniqueDramas = new Set(allEpisodes.map((ep) => ep.dramaId)).size;
    const episodeCounts = allEpisodes.reduce(
      (acc, ep) => {
        acc[ep.dramaId] = (acc[ep.dramaId] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    console.log("\n📊 Migration Statistics:");
    console.log(`  • Total dramas: ${uniqueDramas}`);
    console.log(`  • Total episodes: ${allEpisodes.length}`);
    console.log(
      `  • Episodes updated in this migration: ${updateResults.length}`,
    );

    const dramasWithMultipleEpisodes = Object.values(episodeCounts).filter(
      (count) => count > 1,
    ).length;
    console.log(
      `  • Dramas with multiple episodes: ${dramasWithMultipleEpisodes}`,
    );

    console.log("\n🎯 Migration completed successfully!");
    console.log(
      "All episodes now use correct 1-based numbering (1, 2, 3, ...)",
    );
  } catch (error) {
    console.error("❌ Migration failed with error:");
    console.error(error instanceof Error ? error.message : String(error));

    if (error instanceof Error && error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }

    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Run the migration
migrateEpisodeIndexing().catch((error) => {
  console.error("Migration script failed:", error);
  process.exit(1);
});
