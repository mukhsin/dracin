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

    FORWARDED_HEADERS.forEach((header) => {
      const value = upstream.headers.get(header);
      if (value) {
        responseHeaders.set(header, value);
      }
    });

    console.log(
      `[VideoProxy] ${c.req.method} ${c.req.path} -> ${upstreamUrl} ${upstream.status} ${duration}ms`,
    );

    return new Response(upstream.body, {
      status: upstream.status,
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
