#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "fs";
import * as path from "path";

function generateSlug(title: string, bookId: string, language: string): string {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80);
  return `${baseSlug}-${bookId}-${language}`;
}

function extractValues(
  line: string,
): { bookId: string; title: string; language: string } | null {
  const match = line.match(
    /INSERT INTO dramas \([^)]+\) VALUES \((\d+),\s*'((?:[^']|'')*)',\s*'[^']*',\s*'[^']*',\s*\d+,\s*(?:NULL|\d+),\s*'([^']+)'/,
  );
  if (!match) return null;

  return {
    bookId: match[1],
    title: match[2].replace(/''/g, "'"),
    language: match[3],
  };
}

async function fixSlugs() {
  const sqlPath = path.join(
    process.cwd(),
    "apps",
    "api",
    "drizzle",
    "dml",
    "insert_data.sql",
  );
  const outputPath = path.join(
    process.cwd(),
    "apps",
    "api",
    "drizzle",
    "dml",
    "insert_data_fixed.sql",
  );

  console.log(`Reading: ${sqlPath}`);
  const content = readFileSync(sqlPath, "utf-8");
  const lines = content.split("\n");

  const seenSlugs = new Map<string, number>();
  const output: string[] = [];
  let fixedCount = 0;
  let totalCount = 0;

  for (const line of lines) {
    if (!line.trim().startsWith("INSERT INTO dramas")) {
      output.push(line);
      continue;
    }

    totalCount++;
    const values = extractValues(line);
    if (!values) {
      output.push(line);
      continue;
    }

    let baseSlug = generateSlug(values.title, values.bookId, values.language);
    let finalSlug = baseSlug;
    let counter = 1;

    while (seenSlugs.has(finalSlug)) {
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
      fixedCount++;
    }

    seenSlugs.set(finalSlug, 1);

    const modifiedLine = line.replace(
      /INSERT INTO dramas \(([^)]+)\) VALUES \((.+)\)/,
      (match, cols, vals) => {
        const newCols = cols.replace("bookId,", "bookId, slug,");
        const newVals = vals.replace(/^(\d+,)/, `$1 '${finalSlug}',`);
        return `INSERT INTO dramas (${newCols}) VALUES (${newVals})`;
      },
    );

    output.push(modifiedLine);
  }

  writeFileSync(outputPath, output.join("\n"));

  console.log(`\nProcessed ${totalCount} INSERT statements`);
  console.log(`Fixed ${fixedCount} duplicate slugs`);
  console.log(`Unique slugs generated: ${seenSlugs.size}`);
  console.log(`\nOutput: ${outputPath}`);
}

fixSlugs().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
