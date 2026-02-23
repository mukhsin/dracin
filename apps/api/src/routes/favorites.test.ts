import "./test-setup.js";

import { describe, it, expect, beforeAll, afterAll, afterEach } from "bun:test";
import { Hono } from "hono";
import { favoritesRoutes } from "./favorites.js";
import { db } from "../db/index.js";
import { migrate } from "drizzle-orm/libsql/migrator";
import { favorites, dramas, users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import type { AuthContext } from "../middleware/auth.js";

const mockUser = {
  id: "user-001",
  email: "test@example.com",
  name: "Test User",
  emailVerified: true,
  createdAt: new Date("2024-01-15T10:00:00Z"),
  updatedAt: new Date("2024-02-15T12:00:00Z"),
};

const mockDrama = {
  id: "d69b4a0f-3c7d-4e8f-a4b1-5e9b1c2d3e4f",
  title: "Test Drama",
  slug: "test-drama",
  description: "A test drama",
  status: "ongoing" as const,
};

describe("Favorites Routes", () => {
  const app = new Hono<{ Variables: AuthContext }>();
  app.route("/api/favorites", favoritesRoutes);

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "./apps/api/drizzle/migrations" });
    await db.insert(users).values(mockUser);
    await db.insert(dramas).values(mockDrama);
  });

  afterEach(async () => {
    await db.delete(favorites).where(eq(favorites.userId, mockUser.id));
  });

  afterAll(async () => {
    await db.delete(favorites).where(eq(favorites.userId, mockUser.id));
    await db.delete(dramas).where(eq(dramas.id, mockDrama.id));
    await db.delete(users).where(eq(users.id, mockUser.id));
  });

  describe("GET /api/favorites", () => {
    it("should return 401 for unauthenticated request", async () => {
      const res = await app.request("/api/favorites");

      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("UNAUTHORIZED");
    });

    it("should return empty list when user has no favorites", async () => {
      const res = await app.request("/api/favorites", {
        headers: {
          "x-test-user-id": mockUser.id,
        },
      });

      expect(res.status).toBe(401);
    });

    it("should return user's favorites when authenticated", async () => {
      await db.insert(favorites).values({
        userId: mockUser.id,
        dramaId: mockDrama.id,
      });

      const testApp = new Hono<{ Variables: AuthContext }>();
      testApp.use("/api/favorites/*", async (c, next) => {
        c.set("user", mockUser);
        await next();
      });
      testApp.route("/api/favorites", favoritesRoutes);

      const res = await testApp.request("/api/favorites");

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(json.data.items).toBeInstanceOf(Array);
      expect(json.data.items.length).toBe(1);
      expect(json.data.total).toBe(1);
      expect(json.data.items[0].dramaId).toBe(mockDrama.id);
      expect(json.data.items[0].drama).toBeDefined();
      expect(json.data.items[0].drama.title).toBe(mockDrama.title);
    });

    it("should return favorites ordered by addedAt (descending)", async () => {
      await db.insert(favorites).values([
        {
          userId: mockUser.id,
          dramaId: mockDrama.id,
          addedAt: new Date("2024-01-15T10:00:00Z"),
        },
      ]);

      const testApp = new Hono<{ Variables: AuthContext }>();
      testApp.use("/api/favorites/*", async (c, next) => {
        c.set("user", mockUser);
        await next();
      });
      testApp.route("/api/favorites", favoritesRoutes);

      const res = await testApp.request("/api/favorites");

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.items).toBeInstanceOf(Array);
    });
  });

  describe("POST /api/favorites", () => {
    it("should return 401 for unauthenticated request", async () => {
      const res = await app.request("/api/favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dramaId: mockDrama.id }),
      });

      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("UNAUTHORIZED");
    });

    it("should add drama to favorites when authenticated", async () => {
      const testApp = new Hono<{ Variables: AuthContext }>();
      testApp.use("/api/favorites/*", async (c, next) => {
        c.set("user", mockUser);
        await next();
      });
      testApp.route("/api/favorites", favoritesRoutes);

      const res = await testApp.request("/api/favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dramaId: mockDrama.id }),
      });

      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(json.data.dramaId).toBe(mockDrama.id);
      expect(json.data.drama).toBeDefined();
      expect(json.data.drama.title).toBe(mockDrama.title);
      expect(json.message).toBe("Added to favorites");
    });

    it("should return 409 when drama is already in favorites", async () => {
      await db.insert(favorites).values({
        userId: mockUser.id,
        dramaId: mockDrama.id,
      });

      const testApp = new Hono<{ Variables: AuthContext }>();
      testApp.use("/api/favorites/*", async (c, next) => {
        c.set("user", mockUser);
        await next();
      });
      testApp.route("/api/favorites", favoritesRoutes);

      const res = await testApp.request("/api/favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dramaId: mockDrama.id }),
      });

      expect(res.status).toBe(409);

      const text = await res.text();
      expect(text).toContain("Drama is already in favorites");
    });

    it("should return 400 for invalid dramaId format", async () => {
      const testApp = new Hono<{ Variables: AuthContext }>();
      testApp.use("/api/favorites/*", async (c, next) => {
        c.set("user", mockUser);
        await next();
      });
      testApp.route("/api/favorites", favoritesRoutes);

      const res = await testApp.request("/api/favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dramaId: "not-a-uuid" }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/favorites/:dramaId", () => {
    it("should return 401 for unauthenticated request", async () => {
      const res = await app.request(`/api/favorites/${mockDrama.id}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("UNAUTHORIZED");
    });

    it("should remove drama from favorites when authenticated", async () => {
      await db.insert(favorites).values({
        userId: mockUser.id,
        dramaId: mockDrama.id,
      });

      const testApp = new Hono<{ Variables: AuthContext }>();
      testApp.use("/api/favorites/*", async (c, next) => {
        c.set("user", mockUser);
        await next();
      });
      testApp.route("/api/favorites", favoritesRoutes);

      const res = await testApp.request(`/api/favorites/${mockDrama.id}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toBe("Removed from favorites");

      const remaining = await db
        .select()
        .from(favorites)
        .where(eq(favorites.userId, mockUser.id));
      expect(remaining.length).toBe(0);
    });

    it("should return 404 when drama is not in favorites", async () => {
      const testApp = new Hono<{ Variables: AuthContext }>();
      testApp.use("/api/favorites/*", async (c, next) => {
        c.set("user", mockUser);
        await next();
      });
      testApp.route("/api/favorites", favoritesRoutes);

      const res = await testApp.request(`/api/favorites/${mockDrama.id}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(404);

      const text = await res.text();
      expect(text).toContain("Drama not found in favorites");
    });

    it("should return 400 for invalid dramaId format", async () => {
      const testApp = new Hono<{ Variables: AuthContext }>();
      testApp.use("/api/favorites/*", async (c, next) => {
        c.set("user", mockUser);
        await next();
      });
      testApp.route("/api/favorites", favoritesRoutes);

      const res = await testApp.request("/api/favorites/not-a-uuid", {
        method: "DELETE",
      });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/favorites/check/:dramaId", () => {
    it("should return 401 for unauthenticated request", async () => {
      const res = await app.request(`/api/favorites/check/${mockDrama.id}`);

      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("UNAUTHORIZED");
    });

    it("should return true when drama is in favorites", async () => {
      await db.insert(favorites).values({
        userId: mockUser.id,
        dramaId: mockDrama.id,
      });

      const testApp = new Hono<{ Variables: AuthContext }>();
      testApp.use("/api/favorites/*", async (c, next) => {
        c.set("user", mockUser);
        await next();
      });
      testApp.route("/api/favorites", favoritesRoutes);

      const res = await testApp.request(`/api/favorites/check/${mockDrama.id}`);

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(json.data.isInFavorites).toBe(true);
    });

    it("should return false when drama is not in favorites", async () => {
      const testApp = new Hono<{ Variables: AuthContext }>();
      testApp.use("/api/favorites/*", async (c, next) => {
        c.set("user", mockUser);
        await next();
      });
      testApp.route("/api/favorites", favoritesRoutes);

      const res = await testApp.request(`/api/favorites/check/${mockDrama.id}`);

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(json.data.isInFavorites).toBe(false);
    });
  });
});
