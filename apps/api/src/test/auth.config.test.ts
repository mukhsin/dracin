import { beforeAll, describe, it, expect } from "bun:test";
import type { auth as authInstance } from "../lib/auth.js";

let auth: typeof authInstance;

type SocialProvidersOptions = {
  google?: {
    clientId?: string;
    clientSecret?: string;
  };
};

beforeAll(async () => {
  process.env.NODE_ENV = "production";
  process.env.DATABASE_URL = "file:./.data/auth-config-test.sqlite";
  process.env.BETTER_AUTH_URL = "http://localhost:3001";
  process.env.BETTER_AUTH_SECRET =
    "test-secret-key-0123456789-abcdefghijklmnopqrstuvwxyz";
  process.env.RESEND_API_KEY = "test-resend-api-key";
  process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";

  ({ auth } = await import("../lib/auth.js"));
});

describe("Better-Auth Configuration", () => {
  it("should have auth instance defined", () => {
    expect(auth).toBeDefined();
  });

  it("should have email/password authentication enabled", () => {
    expect(auth.options.emailAndPassword?.enabled).toBe(true);
  });

  it("should have auto sign-in enabled", () => {
    expect(auth.options.emailAndPassword?.autoSignIn).toBe(true);
  });

  it("should require email verification for email/password sign up", () => {
    expect(auth.options.emailAndPassword?.requireEmailVerification).toBe(true);
  });

  it("should send verification emails on sign up and sign in", () => {
    expect(auth.options.emailVerification?.sendOnSignUp).toBe(true);
    expect(auth.options.emailVerification?.sendOnSignIn).toBe(true);
    expect(auth.options.emailVerification?.autoSignInAfterVerification).toBe(
      true,
    );
  });

  it("should have minimum password length of 8", () => {
    expect(auth.options.emailAndPassword?.minPasswordLength).toBe(8);
  });

  it("should have maximum password length of 128", () => {
    expect(auth.options.emailAndPassword?.maxPasswordLength).toBe(128);
  });

  it("should configure Google social provider", () => {
    const socialProviders = (
      auth.options as typeof auth.options & {
        socialProviders?: SocialProvidersOptions;
      }
    ).socialProviders;

    expect(socialProviders?.google).toBeDefined();
    expect(socialProviders?.google?.clientId).toBeTruthy();
    expect(socialProviders?.google?.clientSecret).toBeTruthy();
  });

  it("should have session expiration of 7 days", () => {
    expect(auth.options.session?.expiresIn).toBe(60 * 60 * 24 * 7);
  });

  it("should have session update age of 1 day", () => {
    expect(auth.options.session?.updateAge).toBe(60 * 60 * 24);
  });

  it("should have cookie cache enabled", () => {
    expect(auth.options.session?.cookieCache?.enabled).toBe(true);
  });

  it("should have cross-subdomain cookies enabled", () => {
    expect(auth.options.advanced?.crossSubDomainCookies?.enabled).toBe(true);
  });

  it("should have rate limiting enabled", () => {
    expect(auth.options.rateLimit?.enabled).toBe(true);
  });

  it("should have rate limit window of 60 seconds", () => {
    expect(auth.options.rateLimit?.window).toBe(60);
  });

  it("should have rate limit max of 10 requests", () => {
    expect(auth.options.rateLimit?.max).toBe(10);
  });

  it("should have tanstackStartCookies plugin", () => {
    expect(auth.options.plugins).toBeDefined();
    expect(auth.options.plugins?.length).toBeGreaterThan(0);
  });

  it("should export auth types from lib/auth.ts", () => {
    expect(typeof auth).toBe("object");
  });
});
