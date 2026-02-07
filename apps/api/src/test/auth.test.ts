import { describe, it, expect, beforeAll } from "bun:test";
import { createApp } from "../app.js";

const app = createApp();

const TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  password: "TestPassword123!",
  name: "Test User",
};

describe("Authentication Flow", () => {
  let sessionCookie: string | null = null;

  describe("Registration", () => {
    it("should register a new user", async () => {
      const res = await app.request("/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: TEST_USER.email,
          password: TEST_USER.password,
          name: TEST_USER.name,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(TEST_USER.email);

      const cookies = res.headers.get("set-cookie");
      expect(cookies).toBeDefined();
      sessionCookie = cookies;
    });

    it("should reject duplicate email registration", async () => {
      const res = await app.request("/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: TEST_USER.email,
          password: TEST_USER.password,
          name: TEST_USER.name,
        }),
      });

      expect(res.status).toBe(422);
    });

    it("should reject invalid email format", async () => {
      const res = await app.request("/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "invalid-email",
          password: TEST_USER.password,
          name: TEST_USER.name,
        }),
      });

      expect(res.status).toBe(400);
    });

    it("should reject short password", async () => {
      const res = await app.request("/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: `test-${Date.now()}@example.com`,
          password: "123",
          name: TEST_USER.name,
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("Login", () => {
    it("should login with valid credentials", async () => {
      const res = await app.request("/api/auth/sign-in/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: TEST_USER.email,
          password: TEST_USER.password,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(TEST_USER.email);

      const cookies = res.headers.get("set-cookie");
      expect(cookies).toBeDefined();
      sessionCookie = cookies;
    });

    it("should reject invalid credentials", async () => {
      const res = await app.request("/api/auth/sign-in/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: TEST_USER.email,
          password: "wrongpassword",
        }),
      });

      expect(res.status).toBe(401);
    });

    it("should reject non-existent user", async () => {
      const res = await app.request("/api/auth/sign-in/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "nonexistent@example.com",
          password: TEST_USER.password,
        }),
      });

      expect(res.status).toBe(401);
    });
  });

  describe("Session Management", () => {
    it("should get current session when authenticated", async () => {
      const res = await app.request("/api/session", {
        headers: {
          Cookie: sessionCookie || "",
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.user).toBeDefined();
      expect(data.data.user.email).toBe(TEST_USER.email);
      expect(data.data.session).toBeDefined();
    });

    it("should reject session request without auth", async () => {
      const res = await app.request("/api/session");

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("Protected Routes", () => {
    it("should allow access to protected route with valid session", async () => {
      const res = await app.request("/api/protected", {
        headers: {
          Cookie: sessionCookie || "",
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.message).toBe("This is a protected route");
      expect(data.data.userEmail).toBe(TEST_USER.email);
    });

    it("should reject access to protected route without auth", async () => {
      const res = await app.request("/api/protected");

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("Logout", () => {
    it("should sign out successfully", async () => {
      const res = await app.request("/api/auth/sign-out", {
        method: "POST",
        headers: {
          Cookie: sessionCookie || "",
        },
      });

      expect(res.status).toBe(200);
    });

    it("should reject protected route after logout", async () => {
      const res = await app.request("/api/protected", {
        headers: {
          Cookie: sessionCookie || "",
        },
      });

      expect(res.status).toBe(401);
    });
  });
});
