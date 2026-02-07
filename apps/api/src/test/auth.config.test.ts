import { describe, it, expect } from "bun:test";
import { auth } from "../lib/auth.js";

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

  it("should have email verification disabled", () => {
    expect(auth.options.emailAndPassword?.requireEmailVerification).toBe(false);
  });

  it("should have minimum password length of 8", () => {
    expect(auth.options.emailAndPassword?.minPasswordLength).toBe(8);
  });

  it("should have maximum password length of 128", () => {
    expect(auth.options.emailAndPassword?.maxPasswordLength).toBe(128);
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
