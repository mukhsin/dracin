import { db } from "./index.js";
import { dramas, episodes } from "./schema.js";
import { and, eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

interface DramaData {
  bookId: string;
  title: string;
  cover: string;
  intro: string;
  chapterCount: number;
  playCount: string | null;
  language: string;
}

interface EpisodeData {
  bookId: string;
  episodeIndex: number;
  title: string;
  url: string;
}

function parsePlayCount(playCountStr: string | null): number | null {
  if (!playCountStr) return null;

  const str = playCountStr.toString().trim().toUpperCase();
  const match = str.match(/^([\d.]+)([MK])$/);

  if (!match) return null;

  const value = parseFloat(match[1]);
  const suffix = match[2];

  if (suffix === "M") return Math.round(value * 1_000_000);
  if (suffix === "K") return Math.round(value * 1_000);

  return null;
}

function parseDramas(sqlContent: string): DramaData[] {
  const dramas: DramaData[] = [];
  const dramaRegex =
    /INSERT INTO dramas \(bookId, title, cover, intro, chapterCount, playCount, language, source_endpoint\) VALUES \((\d+), '((?:[^']|'')*)', '((?:[^']|'')*)', '((?:[^']|'')*)', (\d+), (NULL|\d+), '((?:[^']|'')*)', (NULL|'(?:[^']|'')*')\)/g;

  let match: RegExpExecArray | null;
  while (true) {
    match = dramaRegex.exec(sqlContent);
    if (!match) break;
    dramas.push({
      bookId: match[1],
      title: match[2].replace(/''/g, "'"),
      cover: match[3],
      intro: match[4].replace(/''/g, "'"),
      chapterCount: parseInt(match[5], 10),
      playCount: match[6] === "NULL" ? null : match[6],
      language: match[7],
    });
  }

  return dramas;
}

function parseEpisodes(sqlContent: string): EpisodeData[] {
  const episodes: EpisodeData[] = [];
  const episodeRegex =
    /INSERT INTO episodes \(bookId, episode_index, title, url\) VALUES \((\d+), (\d+), '([^']+)', '([^']+)'\)/g;

  let match: RegExpExecArray | null;
  while (true) {
    match = episodeRegex.exec(sqlContent);
    if (!match) break;
    episodes.push({
      bookId: match[1],
      episodeIndex: parseInt(match[2], 10),
      title: match[3],
      url: match[4],
    });
  }

  return episodes;
}

function generateSlug(title: string, bookId: string, language: string): string {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80);
  return `${baseSlug}-${bookId}-${language}`;
}

async function importLanguageData(
  language: string,
  sqlFile: string,
  jsonData: DramaData[],
) {
  console.log(`\nImporting ${language.toUpperCase()} data...`);

  const sqlPath = path.join(process.cwd(), "drizzle", "dml", sqlFile);
  const sqlContent = fs.readFileSync(sqlPath, "utf-8");

  const episodeData = parseEpisodes(sqlContent);

  const playCountMap = new Map<string, string | null>();
  for (const drama of jsonData) {
    if (drama.language === language) {
      playCountMap.set(drama.bookId, drama.playCount);
    }
  }

  const dramaData = parseDramas(sqlContent).map((drama) => ({
    ...drama,
    playCount: playCountMap.get(drama.bookId) ?? null,
  }));

  console.log(
    `  Found ${dramaData.length} dramas and ${episodeData.length} episodes`,
  );

  for (const drama of dramaData) {
    const existing = await db
      .select({ id: dramas.id })
      .from(dramas)
      .where(eq(dramas.bookId, drama.bookId))
      .limit(1);

    if (existing.length === 0) {
      try {
        await db.insert(dramas).values({
          bookId: drama.bookId,
          title: drama.title,
          slug: generateSlug(drama.title, drama.bookId, drama.language),
          description: drama.intro,
          posterUrl: drama.cover,
          status: "completed",
          language: drama.language,
          playCount: drama.playCount,
          sourceEndpoint: null,
          totalEpisodes: drama.chapterCount,
          metadata: {
            totalEpisodes: drama.chapterCount,
          },
        });
      } catch (error) {
        console.error(`  Failed to insert drama ${drama.bookId}: ${error}`);
      }
    }
  }

  console.log(`  Inserted ${dramaData.length} dramas`);

  let insertedEpisodes = 0;
  for (const ep of episodeData) {
    const drama = await db
      .select({ id: dramas.id })
      .from(dramas)
      .where(and(eq(dramas.bookId, ep.bookId), eq(dramas.language, language)))
      .limit(1);

    if (drama.length > 0) {
      const existing = await db
        .select({ id: episodes.id })
        .from(episodes)
        .where(
          and(
            eq(episodes.dramaId, drama[0].id),
            eq(episodes.number, ep.episodeIndex + 1),
          ),
        )
        .limit(1);

      if (existing.length === 0) {
        await db.insert(episodes).values({
          dramaId: drama[0].id,
          bookId: ep.bookId,
          number: ep.episodeIndex + 1,
          title: ep.title,
          sourceUrl: ep.url,
          videoUrls: {},
        });
        insertedEpisodes++;
      }
    }
  }

  console.log(`  Inserted ${insertedEpisodes} episodes`);
}

async function seed() {
  console.log("Starting SQL data import...");

  const jsonPath = path.join(process.cwd(), "drizzle", "dml", "data.json");
  const jsonContent = fs.readFileSync(jsonPath, "utf-8");
  const jsonData = JSON.parse(jsonContent).data as DramaData[];

  console.log(`Loaded ${jsonData.length} dramas from JSON data file`);

  const languages = [
    { code: "en", file: "en.sql" },
    { code: "id", file: "id.sql" },
    { code: "es", file: "es.sql" },
    { code: "pt", file: "pt.sql" },
  ];

  for (const { code, file } of languages) {
    await importLanguageData(code, file, jsonData);
  }

  console.log("\n✅ Data import completed!");
}

seed().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});
