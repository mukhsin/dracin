import type { MiddlewareHandler } from "hono";

export const requireAdminAuth: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Bearer token required",
        },
      },
      401,
    );
  }

  const token = authHeader.slice(7);
  const adminAuthSecret = process.env.ADMIN_AUTH_SECRET;

  if (!adminAuthSecret) {
    return c.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Admin authentication not configured",
        },
      },
      401,
    );
  }

  if (token !== adminAuthSecret) {
    return c.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid admin token",
        },
      },
      401,
    );
  }

  await next();
};
