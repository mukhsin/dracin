import type { MiddlewareHandler } from "hono";
import {
  getFallbackService,
  resetFallbackService,
  type FallbackResult,
} from "../lib/fallback.js";

export interface FallbackVariables {
  fallbackResult?: FallbackResult<unknown>;
  videoData?: unknown;
}

export interface FallbackMiddlewareOptions {
  paths: string[];
  enableCache?: boolean;
  cacheTtlMs?: number;
}

class FallbackCache {
  private cache = new Map<string, { data: unknown; expiresAt: number }>();

  get(key: string): unknown | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.data;
  }

  set(key: string, data: unknown, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

const fallbackCache = new FallbackCache();

function matchesPathPatterns(path: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern === path) return true;

    if (pattern.includes("*")) {
      const regex = new RegExp("^" + pattern.replace(/\*/g, "[^/]+") + "$");
      return regex.test(path);
    }

    if (path.startsWith(pattern)) return true;

    return false;
  });
}

export function fallbackMiddleware(
  options: FallbackMiddlewareOptions,
): MiddlewareHandler {
  const { paths, enableCache = true, cacheTtlMs = 60000 } = options;

  return async (c, next) => {
    const requestPath = c.req.path;

    if (!matchesPathPatterns(requestPath, paths)) {
      return next();
    }

    const fallbackService = getFallbackService();
    const cacheKey = `${c.req.method}:${requestPath}`;

    if (enableCache) {
      const cached = fallbackCache.get(cacheKey);
      if (cached) {
        console.log(`[FallbackMiddleware] Cache hit for ${requestPath}`);
        c.set("videoData", cached);
        return next();
      }
    }

    const result = await fallbackService.execute<unknown>(requestPath, {
      method: c.req.method,
      headers: {
        "Content-Type": "application/json",
        ...(c.req.header("authorization")
          ? { Authorization: c.req.header("authorization") }
          : {}),
      },
    });

    console.log(
      `[FallbackMiddleware] ${requestPath} - Source: ${result.source}, ` +
        `Success: ${result.success}, Duration: ${result.durationMs}ms`,
    );

    c.set("fallbackResult", result);

    if (result.success && result.data) {
      if (enableCache) {
        fallbackCache.set(cacheKey, result.data, cacheTtlMs);
      }

      c.set("videoData", result.data);

      return next();
    }

    console.error(
      `[FallbackMiddleware] Both services failed for ${requestPath}: ${result.error}`,
    );

    return c.json(
      {
        success: false,
        error: "Service Unavailable",
        message: "Unable to retrieve video data from any available service",
        details: result.error,
      },
      503,
    );
  };
}

export function fallbackProxyMiddleware(
  options: FallbackMiddlewareOptions,
): MiddlewareHandler {
  const { paths, enableCache = true, cacheTtlMs = 60000 } = options;

  return async (c, next) => {
    const requestPath = c.req.path;

    if (!matchesPathPatterns(requestPath, paths)) {
      return next();
    }

    const fallbackService = getFallbackService();
    const cacheKey = `${c.req.method}:${requestPath}`;

    if (enableCache) {
      const cached = fallbackCache.get(cacheKey);
      if (cached) {
        console.log(`[FallbackProxyMiddleware] Cache hit for ${requestPath}`);
        return c.json(cached);
      }
    }

    const result = await fallbackService.execute<unknown>(requestPath, {
      method: c.req.method,
      headers: {
        "Content-Type": "application/json",
        ...(c.req.header("authorization")
          ? { Authorization: c.req.header("authorization") }
          : {}),
      },
    });

    console.log(
      `[FallbackProxyMiddleware] ${requestPath} - Source: ${result.source}, ` +
        `Success: ${result.success}, Duration: ${result.durationMs}ms`,
    );

    if (result.success && result.data) {
      if (enableCache) {
        fallbackCache.set(cacheKey, result.data, cacheTtlMs);
      }

      return c.json(result.data);
    }

    console.error(
      `[FallbackProxyMiddleware] Both services failed for ${requestPath}: ${result.error}`,
    );

    return c.json(
      {
        success: false,
        error: "Service Unavailable",
        message: "Unable to retrieve video data from any available service",
        details: result.error,
      },
      503,
    );
  };
}

export function getCircuitBreakerStatus() {
  const fallbackService = getFallbackService();
  return fallbackService.getCircuitStatus();
}

export function clearFallbackCache(): void {
  fallbackCache.clear();
  console.log("[FallbackMiddleware] Cache cleared");
}

export { resetFallbackService };
