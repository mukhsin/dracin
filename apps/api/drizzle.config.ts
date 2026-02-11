import { defineConfig } from "drizzle-kit";

declare const process: { env?: Record<string, string | undefined> } | undefined;

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url:
      (process?.env?.DATABASE_URL?.startsWith("postgres")
        ? undefined
        : process?.env?.DATABASE_URL) || "file:/data/dracin.sqlite",
  },
  verbose: true,
  strict: true,
});
