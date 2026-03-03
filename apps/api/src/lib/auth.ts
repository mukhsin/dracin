import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { emailOTP } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import * as schema from "../db/schema.js";
import { env } from "./env.js";

const client = createClient({
  url: env.DATABASE_URL,
  authToken: env.DATABASE_AUTH_TOKEN,
});

const db = drizzle(client, { schema });

async function sendResendEmail(params: {
  email: string;
  subject: string;
  bodyHtml: string;
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
      subject: params.subject,
      html: params.bodyHtml,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();

    throw new Error(
      `Failed to send email via Resend: ${response.status} ${responseText}`,
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

  plugins: [
    emailOTP({
      sendVerificationOnSignUp: true,
      overrideDefaultEmailVerification: true,
      expiresIn: 60 * 10,
      allowedAttempts: 5,
      sendVerificationOTP: async ({ email, otp, type }) => {
        const heading =
          type === "email-verification"
            ? "Verify your email"
            : type === "sign-in"
              ? "Your sign-in code"
              : "Your password reset code";

        const description =
          type === "email-verification"
            ? "Use this one-time code to verify your Dracin account."
            : type === "sign-in"
              ? "Use this one-time code to sign in to Dracin."
              : "Use this one-time code to reset your Dracin password.";

        await sendResendEmail({
          email,
          subject: heading,
          bodyHtml: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 560px; margin: 0 auto; padding: 24px;">
              <h1 style="font-size: 24px; margin-bottom: 16px;">${heading}</h1>
              <p style="margin-bottom: 16px;">${description}</p>
              <p style="margin-bottom: 12px;">Your verification code is:</p>
              <div style="display: inline-block; font-size: 32px; font-weight: 700; letter-spacing: 8px; background-color: #f3f4f6; color: #111827; padding: 12px 18px; border-radius: 12px; margin-bottom: 20px;">
                ${otp}
              </div>
              <p style="margin-bottom: 8px;">This code expires in 10 minutes.</p>
              <p style="color: #6b7280; font-size: 14px;">If you did not request this code, you can safely ignore this email.</p>
            </div>
          `,
        });
      },
    }),
    tanstackStartCookies(),
  ],
});

export type Auth = typeof auth;
export type User = typeof auth.$Infer.Session.user;
export type Session = typeof auth.$Infer.Session.session;
