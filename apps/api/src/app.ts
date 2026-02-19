import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "./middleware/logger.js";
import { healthRoutes } from "./routes/health.js";
import { dramaRoutes } from "./routes/dramas.js";
import { watchlistRoutes } from "./routes/watchlist.js";
import { historyRoutes } from "./routes/history.js";
import { videoRoutes, fallbackAdminRoutes } from "./routes/videos.js";
import { videoProxyRoutes } from "./routes/video-proxy.js";
import { searchRoutes } from "./routes/search.js";
import { catalogRoutes } from "./routes/catalog.js";
import { adminDramasRouter } from "./routes/admin-dramas.js";
import { authMiddleware } from "./middleware/auth.js";
import { auth } from "./lib/auth.js";

export function createApp() {
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin:
        process.env.NODE_ENV === "production"
          ? ["https://dracin.mukhsin.web.id"]
          : ["http://localhost:3000"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    }),
  );

  app.use("*", logger);

  app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

  app.use("*", authMiddleware);

  app.route("/health", healthRoutes);
  app.route("/api/dramas", dramaRoutes);
  app.route("/api/search", searchRoutes);
  app.route("/api/catalog", catalogRoutes);
  app.route("/api/watchlist", watchlistRoutes);
  app.route("/api/history", historyRoutes);
  app.route("/api", videoProxyRoutes);
  app.route("/api", videoRoutes);
  app.route("/api", fallbackAdminRoutes);
  app.route("/api/admin/dramas", adminDramasRouter);

  app.notFound((c) => {
    return c.json(
      {
        success: false,
        error: "Not Found",
        message: `Route ${c.req.method} ${c.req.path} not found`,
      },
      404,
    );
  });

  app.onError((err, c) => {
    console.error("Error:", err);

    if (err instanceof HTTPException) {
      return c.json(
        {
          success: false,
          error: {
            message: err.message,
            code: err.status,
          },
        },
        err.status,
      );
    }

    return c.json(
      {
        success: false,
        error: "Internal Server Error",
        message:
          process.env.NODE_ENV === "production"
            ? "Something went wrong"
            : err.message,
      },
      500,
    );
  });

  return app;
}

export type App = ReturnType<typeof createApp>;
export type AppType = App;
