import { db } from "../src/db/index.js";
import { dramas } from "../src/db/schema.js";
import { eq } from "drizzle-orm";

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

async function regenerateAllSlugs() {
  console.log("Starting slug regeneration...\n");

  const allDramas = await db.select().from(dramas);
  console.log(`Found ${allDramas.length} dramas to update\n`);

  let updated = 0;
  let skipped = 0;
  let conflicts = 0;

  for (const drama of allDramas) {
    const oldSlug = drama.slug;
    const newSlug = generateSlug(drama.title);

    if (oldSlug === newSlug) {
      skipped++;
      console.log(`✓ Skipped: "${drama.title}" (slug already correct)`);
      continue;
    }

    try {
      await db
        .update(dramas)
        .set({
          slug: newSlug,
          updatedAt: new Date(),
        })
        .where(eq(dramas.id, drama.id));

      updated++;
      console.log(`✓ Updated: "${drama.title}"`);
      console.log(`  Old: ${oldSlug}`);
      console.log(`  New: ${newSlug}\n`);
    } catch (error) {
      conflicts++;
      console.log(`✗ Conflict: "${drama.title}"`);
      console.log(`  Could not update slug to "${newSlug}" (likely duplicate)`);
      console.log(`  Keeping old slug: ${oldSlug}\n`);
    }
  }

  console.log("=".repeat(50));
  console.log("SUMMARY:");
  console.log(`  Updated:  ${updated}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Conflicts: ${conflicts}`);
  console.log(`  Total:    ${allDramas.length}`);
  console.log("=".repeat(50));
}

regenerateAllSlugs()
  .then(() => {
    console.log("\nSlug regeneration complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nError regenerating slugs:", error);
    process.exit(1);
  });
