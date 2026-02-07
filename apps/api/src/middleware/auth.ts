import type { MiddlewareHandler } from "hono";
import { auth, type User, type Session } from "../lib/auth.js";

export interface AuthContext {
  user: User | null;
  session: Session | null;
}

export const authMiddleware: MiddlewareHandler<{
  Variables: AuthContext;
}> = async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    c.set("user", null);
    c.set("session", null);
  } else {
    c.set("user", session.user);
    c.set("session", session.session);
  }

  await next();
};

export const requireAuth: MiddlewareHandler<{
  Variables: AuthContext;
}> = async (c, next) => {
  const user = c.get("user");

  if (!user) {
    return c.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      },
      401
    );
  }

  await next();
};
