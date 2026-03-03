import { z } from "zod";
import dotenv from "dotenv";

dotenv.config({ override: false });

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().default("3001"),
  DATABASE_URL: z.string().default("file:./.data/dracin.db"),
  DATABASE_AUTH_TOKEN: z.string().optional(),
  DATABASE_HOST: z.string().optional(),
  DATABASE_PORT: z.coerce.number().optional(),
  DATABASE_NAME: z.string().optional(),
  DATABASE_USER: z.string().optional(),
  DATABASE_PASSWORD: z.string().optional(),
  API_PROXY_URL: z.string().default("http://localhost:3002"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3001"),
  BETTER_AUTH_SECRET: z.string().min(32),
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z
    .string()
    .email()
    .default("noreply@dracin.mukhsin.web.id"),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Environment validation failed:");
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
