import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import * as schema from "../db/schema.js";
import { env } from "./env.js";

const client = createClient({
  url: env.DATABASE_URL,
  authToken: env.DATABASE_AUTH_TOKEN,
});

const db = drizzle(client, { schema });

async function sendVerificationEmail(params: {
  email: string;
  name?: string | null;
  verificationUrl: string;
}) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [params.email],
      subject: "Verify your email address",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 560px; margin: 0 auto; padding: 24px;">
          <h1 style="font-size: 24px; margin-bottom: 16px;">Welcome to Dracin</h1>
          <p style="margin-bottom: 16px;">Hi ${params.name?.trim() || "there"},</p>
          <p style="margin-bottom: 24px;">Please verify your email address to finish creating your account and unlock email/password sign-in.</p>
          <a href="${params.verificationUrl}" style="display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; margin-bottom: 24px;">Verify email</a>
          <p style="margin-bottom: 8px;">If the button does not work, copy and paste this link into your browser:</p>
          <p style="word-break: break-word; margin-bottom: 24px;"><a href="${params.verificationUrl}">${params.verificationUrl}</a></p>
          <p style="color: #6b7280; font-size: 14px;">If you did not create this account, you can safely ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();

    throw new Error(
      `Failed to send verification email via Resend: ${response.status} ${responseText}`,
    );
  }
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: schema,
    usePlural: true,
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,

  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },

  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail({
        email: user.email,
        name: user.name,
        verificationUrl: url,
      });
    },
  },

  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },

  advanced: {
    // Disable origin check in development for local testing
    disableOriginCheck: process.env.NODE_ENV === "development",
    trustedOrigins: ["http://localhost:3000", "https://dracin.mukhsin.web.id"],
    database: {
      generateId: false,
    },
    crossSubDomainCookies: {
      enabled: true,
    },
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      partitioned: false,
    },
  },

  rateLimit: {
    enabled: process.env.NODE_ENV === "production",
    window: 60,
    max: 10,
  },

  plugins: [tanstackStartCookies()],
});

export type Auth = typeof auth;
export type User = typeof auth.$Infer.Session.user;
export type Session = typeof auth.$Infer.Session.session;
