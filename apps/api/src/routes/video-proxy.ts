import { Hono } from "hono";
import type { Context } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { dramas, episodes } from "../db/schema.js";
import type { VideoQuality } from "@repo/shared/types";
import { getEpisodes } from "../services/api-proxy.service.js";
import {
  decodeHtmlEntities,
  getHighestQualityUrl,
} from "../lib/url-validator.js";

const VIDEO_ORIGIN = "https://hwztvideo.dramaboxdb.com";

const FORWARDED_HEADERS = [
  "Content-Type",
  "Content-Length",
  "Accept-Ranges",
  "Content-Range",
  "ETag",
  "Last-Modified",
] as const;

const CORS_HEADERS: Array<[string, string]> = [
  ["Access-Control-Allow-Origin", "*"],
  ["Access-Control-Allow-Methods", "GET, OPTIONS"],
  ["Access-Control-Allow-Headers", "Range, Content-Type"],
  [
    "Access-Control-Expose-Headers",
    "Accept-Ranges, Content-Range, Content-Length, Content-Type, ETag, Last-Modified",
  ],
];

const app = new Hono();

const VideoQualitySchema = z.enum([
  "240p",
  "360p",
  "480p",
  "720p",
  "1080p",
  "4k",
]);

const ShortVideoParamsSchema = z.object({
  dramaId: z.string().uuid(),
  episodeKey: z.string().min(1),
});

const EPISODE_KEY_PATTERN = /^(\d+)\.(240p|360p|480p|720p|1080p|4k)\.mp4$/i;

const applyCors = (headers: Headers) => {
  for (const [key, value] of CORS_HEADERS) {
    headers.set(key, value);
  }
};

app.options("/video/*", (c) => {
  const headers = new Headers();
  applyCors(headers);

  return new Response(null, {
    status: 204,
    headers,
  });
});

async function proxyUpstream(
  c: Context,
  upstreamUrl: string,
): Promise<Response> {
  const rangeHeader = c.req.header("Range") ?? c.req.header("range");
  const userAgentHeader =
    c.req.header("User-Agent") ??
    c.req.header("user-agent") ??
    "DramaStreamVideoProxy/1.0";
  const refererHeader =
    c.req.header("Referer") ??
    c.req.header("referer") ??
    "https://dramaboxdb.com/";

  // Debug: Log all headers to see what's being received
  console.log(`[VideoProxy] Headers received:`, {
    range: rangeHeader,
    userAgent: userAgentHeader?.substring(0, 50),
    referer: refererHeader,
    url: c.req.url,
  });

  // Validate Range header if present
  let requestedRange: { start: number; end: number | null; isSuffix: boolean } | null = null;
  if (rangeHeader) {
    const rangeValidation = validateRangeHeader(rangeHeader);
    if (!rangeValidation.valid) {
      const headers = new Headers();
      applyCors(headers);
      headers.set("Accept-Ranges", "bytes");
      return new Response(`Invalid Range: ${rangeValidation.error}`, {
        status: 416, // Range Not Satisfiable
        headers,
      });
    }
    requestedRange = rangeValidation.range;
  }

  const requestHeaders = new Headers();
  requestHeaders.set("User-Agent", userAgentHeader);
  requestHeaders.set("Referer", refererHeader);

  if (rangeHeader) {
    requestHeaders.set("Range", rangeHeader);
  }

  const start = Date.now();

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: requestHeaders,
    });

    const duration = Date.now() - start;
    const responseHeaders = new Headers();
    applyCors(responseHeaders);
    responseHeaders.set("Accept-Ranges", "bytes");

    // Determine the response status and Content-Range header
    let responseStatus = upstream.status;
    let contentRangeValue = upstream.headers.get("Content-Range");
    const upstreamContentLength = upstream.headers.get("Content-Length");
    const contentType = upstream.headers.get("Content-Type");

    // Handle Range request responses
    // Skip Content-Range synthesis for suffix ranges (bytes=-N) - we need upstream to provide it
    const isSuffixRange = requestedRange?.isSuffix ?? false;
    
    if (rangeHeader && responseStatus === 200 && !isSuffixRange) {
      // Upstream returned 200 instead of 206 for Range request
      // Try to convert to 206 if we have Content-Length information
      let totalLength = upstreamContentLength ? parseInt(upstreamContentLength, 10) : null;
      
      // If no Content-Length from upstream (chunked encoding), try HEAD request to get size
      if (!totalLength && requestedRange) {
        try {
          const headResponse = await fetch(upstreamUrl, {
            method: "HEAD",
            headers: {
              "User-Agent": userAgentHeader,
              "Referer": refererHeader,
            },
          });
          const headContentLength = headResponse.headers.get("Content-Length");
          if (headContentLength) {
            totalLength = parseInt(headContentLength, 10);
          }
        } catch (headError) {
          // HEAD request failed, log but continue - we'll return 200 without Content-Range
          console.warn(`[VideoProxy] HEAD request failed for ${upstreamUrl}:`, headError);
        }
      }
      
      if (totalLength && requestedRange) {
        const start = requestedRange.start;
        const end = requestedRange.end ?? totalLength - 1;
        contentRangeValue = `bytes ${start}-${end}/${totalLength}`;
        responseStatus = 206;

        // Also update Content-Length to reflect the actual range size
        const rangeSize = end - start + 1;
        responseHeaders.set("Content-Length", String(rangeSize));
      }
    } else if (rangeHeader && responseStatus === 206 && !contentRangeValue && !isSuffixRange) {
      // Upstream returned 206 but didn't include Content-Range header
      // Construct it from the request and upstream Content-Length
      let totalLength = upstreamContentLength ? parseInt(upstreamContentLength, 10) : null;
      
      // If no Content-Length from upstream, try HEAD request to get size
      if (!totalLength && requestedRange) {
        try {
          const headResponse = await fetch(upstreamUrl, {
            method: "HEAD",
            headers: {
              "User-Agent": userAgentHeader,
              "Referer": refererHeader,
            },
          });
          const headContentLength = headResponse.headers.get("Content-Length");
          if (headContentLength) {
            totalLength = parseInt(headContentLength, 10);
          }
        } catch (headError) {
          // HEAD request failed, log but continue
          console.warn(`[VideoProxy] HEAD request failed for ${upstreamUrl}:`, headError);
        }
      }
      
      if (totalLength && requestedRange) {
        const start = requestedRange.start;
        const end = requestedRange.end ?? totalLength - 1;
        contentRangeValue = `bytes ${start}-${end}/${totalLength}`;
      }
    }
    // Forward upstream headers (skip if we set them during range conversion)
    FORWARDED_HEADERS.forEach((header) => {
      const value = upstream.headers.get(header);
      if (value) {
        // Skip Content-Length if we already set it for range conversion
        if (header === "Content-Length" && responseHeaders.has("Content-Length")) {
          return;
        }
        responseHeaders.set(header, value);
      }
    });
    
    // Set Content-Range header from upstream or our synthesized value
    if (contentRangeValue) {
      responseHeaders.set("Content-Range", contentRangeValue);
    }
    
    // Set cache control headers for Range requests to prevent CloudFlare caching
    if (rangeHeader) {
      responseHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");
      responseHeaders.set("Pragma", "no-cache");
    }
    console.log(
      `[VideoProxy] ${c.req.method} ${c.req.path} -> ${upstreamUrl} ${responseStatus} ${duration}ms`,
    );

    return new Response(upstream.body, {
      status: responseStatus,
      headers: responseHeaders,
    });
  } catch (error) {
    const duration = Date.now() - start;
    const headers = new Headers();
    applyCors(headers);

    console.error(
      `[VideoProxy] ${c.req.method} ${c.req.path} -> ${upstreamUrl} failed after ${duration}ms`,
      error,
    );

    return new Response("Upstream fetch failed", {
      status: 502,
      headers,
    });
  }
}

/**
 * Validates a Range header value according to RFC 7233
 * Supports only "bytes" unit (required for video seeking)
 * 
 * @returns Object with valid flag, optional error message, and parsed range
 */
function validateRangeHeader(rangeHeader: string):
  | { valid: true; range: { start: number; end: number | null; isSuffix: boolean } }
  | { valid: false; error: string } {
  // Range header format: bytes=start-end or bytes=start- or bytes=-suffix
  const rangePattern = /^bytes=(\d*)-(\d*)$/;
  const match = rangeHeader.trim().match(rangePattern);

  if (!match) {
    return { valid: false, error: "Invalid range format. Expected: bytes=start-end" };
  }

  const [, startStr, endStr] = match;
  const hasStart = startStr !== "";
  const hasEnd = endStr !== "";

  // Case 1: bytes=start-end (both start and end specified)
  if (hasStart && hasEnd) {
    const start = parseInt(startStr, 10);
    const end = parseInt(endStr, 10);

    if (Number.isNaN(start) || Number.isNaN(end)) {
      return { valid: false, error: "Invalid range values" };
    }

    if (start < 0 || end < 0) {
      return { valid: false, error: "Range values must be non-negative" };
    }

    if (start > end) {
      return { valid: false, error: "Range start must not exceed end" };
    }

    return { valid: true, range: { start, end, isSuffix: false } };
  }

  // Case 2: bytes=start- (suffix range - start to end of file)
  if (hasStart && !hasEnd) {
    const start = parseInt(startStr, 10);

    if (Number.isNaN(start) || start < 0) {
      return { valid: false, error: "Invalid start value" };
    }

    return { valid: true, range: { start, end: null, isSuffix: false } };
  }

  // Case 3: bytes=-suffix (last N bytes) - not commonly used for video
  // We accept it but mark as suffix so Content-Range synthesis is skipped
  if (!hasStart && hasEnd) {
    const suffixLength = parseInt(endStr, 10);
    
    if (Number.isNaN(suffixLength) || suffixLength <= 0) {
      return { valid: false, error: "Invalid suffix length" };
    }

    // Suffix ranges use negative start as placeholder; isSuffix flag prevents invalid Content-Range synthesis
    return { valid: true, range: { start: -suffixLength, end: null, isSuffix: true } };
  }

  return { valid: false, error: "Empty range specification" };
}

function transformApiProxyUrlToVideoUrls(
  url: string,
): Partial<Record<VideoQuality, string>> {
  const decodedUrl = decodeHtmlEntities(url);
  const videoUrls: Partial<Record<VideoQuality, string>> = {};
  const qualityMatch = decodedUrl.match(/\.(\d+p|4k)\./i);

  if (qualityMatch) {
    const detected = qualityMatch[1].toLowerCase() as VideoQuality;
    if (VideoQualitySchema.safeParse(detected).success) {
      videoUrls[detected] = decodedUrl;
      return videoUrls;
    }
  }

  videoUrls["1080p"] = decodedUrl;
  return videoUrls;
}

async function resolveShortVideoUrl(
  dramaId: string,
  episodeNumber: number,
  quality: VideoQuality,
): Promise<string | null> {
  const episode = await db.query.episodes.findFirst({
    where: and(
      eq(episodes.dramaId, dramaId),
      eq(episodes.number, episodeNumber),
    ),
    columns: {
      videoUrls: true,
    },
  });

  if (episode) {
    const url = episode.videoUrls?.[quality];
    if (url && url.trim() !== "") {
      return url;
    }

    const fallbackUrl = getHighestQualityUrl(episode.videoUrls);
    if (fallbackUrl) {
      return fallbackUrl;
    }
  }

  const drama = await db.query.dramas.findFirst({
    where: eq(dramas.id, dramaId),
    columns: {
      bookId: true,
    },
  });

  if (!drama?.bookId) {
    return null;
  }

  const apiProxyResult = await getEpisodes(drama.bookId.toString());
  if (!apiProxyResult.success || apiProxyResult.data.episodes.length === 0) {
    return null;
  }

  const apiEpisode = apiProxyResult.data.episodes.find(
    (ep) => ep.index + 1 === episodeNumber,
  );

  if (!apiEpisode?.url) {
    return null;
  }

  const transformed = transformApiProxyUrlToVideoUrls(apiEpisode.url);
  const url = transformed[quality] ?? getHighestQualityUrl(transformed);
  return url ?? null;
}

app.get(
  "/video/:dramaId/:episodeKey",
  zValidator("param", ShortVideoParamsSchema),
  async (c) => {
    const { dramaId, episodeKey } = c.req.valid("param");
    const match = episodeKey.match(EPISODE_KEY_PATTERN);

    if (!match) {
      const headers = new Headers();
      applyCors(headers);

      return new Response("Invalid episode key", {
        status: 400,
        headers,
      });
    }

    const episodeNumber = Number.parseInt(match[1], 10);
    const qualityParse = VideoQualitySchema.safeParse(match[2].toLowerCase());

    if (
      !Number.isFinite(episodeNumber) ||
      episodeNumber <= 0 ||
      !qualityParse.success
    ) {
      const headers = new Headers();
      applyCors(headers);

      return new Response("Invalid episode key", {
        status: 400,
        headers,
      });
    }

    const target = await resolveShortVideoUrl(
      dramaId,
      episodeNumber,
      qualityParse.data,
    );

    if (!target) {
      const headers = new Headers();
      applyCors(headers);

      return new Response("Video not found", {
        status: 404,
        headers,
      });
    }

    return proxyUpstream(c, target);
  },
);

app.get("/video/*", async (c) => {
  const requestUrl = new URL(c.req.url);
  const pathname = requestUrl.pathname;
  const basePrefixes = ["/api/video", "/video"];
  let pathAfterPrefix = pathname;

  for (const prefix of basePrefixes) {
    if (pathname.startsWith(prefix)) {
      pathAfterPrefix = pathname.slice(prefix.length);
      break;
    }
  }

  const normalizedPath = pathAfterPrefix.replace(/^\/+/, "");

  // Backwards-compatible support for the dot-separated short URL format:
  // /api/video/{dramaId}.{episodeNumber}.{quality}.mp4
  const dotMatch = normalizedPath.match(
    /^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\.(\d+)\.(240p|360p|480p|720p|1080p|4k)\.mp4$/i,
  );
  if (dotMatch) {
    const dramaId = dotMatch[1];
    const episodeNumber = Number.parseInt(dotMatch[2], 10);
    const qualityParse = VideoQualitySchema.safeParse(
      dotMatch[3].toLowerCase(),
    );

    if (
      Number.isFinite(episodeNumber) &&
      episodeNumber > 0 &&
      qualityParse.success
    ) {
      const target = await resolveShortVideoUrl(
        dramaId,
        episodeNumber,
        qualityParse.data,
      );
      if (target) {
        return proxyUpstream(c, target);
      }
    }
  }

  if (!normalizedPath) {
    const headers = new Headers();
    applyCors(headers);

    // Return 404 to let other routes handle non-video paths
    return new Response(null, {
      status: 404,
      headers,
    });
  }

  const upstreamUrlObject = new URL(`/${normalizedPath}`, VIDEO_ORIGIN);
  upstreamUrlObject.search = requestUrl.search;
  const upstreamUrl = upstreamUrlObject.toString();

  return proxyUpstream(c, upstreamUrl);
});

export const videoProxyRoutes = app;
export type VideoProxyRoutes = typeof app;
export default app;
