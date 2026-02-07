import { HTTPException } from "hono/http-exception";

const API_PROXY_URL = process.env.API_PROXY_URL || "http://localhost:3002";

const DEFAULT_TIMEOUT_MS = 5000;
const EPISODES_TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 2000, 4000];

interface ApiProxyResponse<T> {
  status: boolean;
  message: string;
  data: T;
  total?: number;
  metadata?: unknown;
  stats?: unknown;
  totalFetched?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

class ApiProxyError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public cause?: Error,
  ) {
    super(message);
    this.name = "ApiProxyError";
  }
}

async function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function formatParams(
  params: Record<string, string | number | undefined>,
): string {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

function logApiCall(
  endpoint: string,
  params: Record<string, string | number | undefined>,
  durationMs: number,
  success: boolean,
  error?: string,
): void {
  const timestamp = new Date().toISOString();
  const status = success ? "SUCCESS" : "ERROR";
  const paramsStr = formatParams(params);
  const baseMessage = `[${timestamp}] API-Proxy ${status} | ${endpoint}${paramsStr ? `?${paramsStr}` : ""} | ${durationMs}ms`;
  const logMessage = error ? `${baseMessage} | Error: ${error}` : baseMessage;

  if (success) {
    console.log(logMessage);
  } else {
    console.error(logMessage);
  }
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildUrl(
  endpoint: string,
  params: Record<string, string | number | undefined>,
): string {
  const queryString = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join("&");

  return `${API_PROXY_URL}${endpoint}${queryString ? `?${queryString}` : ""}`;
}

function isClientError(statusCode: number): boolean {
  return statusCode >= 400 && statusCode < 500;
}

async function fetchWithRetry<T>(
  endpoint: string,
  params: Record<string, string | number | undefined>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<ApiProxyResponse<T>> {
  const url = buildUrl(endpoint, params);
  let lastError: Error | undefined;
  const startTime = Date.now();

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(url, timeoutMs);
      const durationMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        throw new ApiProxyError(
          `HTTP ${response.status}: ${errorText}`,
          response.status,
        );
      }

      const result = (await response.json()) as ApiProxyResponse<T>;

      if (!result.status) {
        throw new ApiProxyError(result.message || "API returned false status");
      }

      logApiCall(endpoint, params, durationMs, true);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (error instanceof ApiProxyError && isClientError(error.statusCode)) {
        break;
      }

      const isLastAttempt = attempt === MAX_RETRIES - 1;
      if (!isLastAttempt) {
        const delayMs =
          RETRY_DELAYS_MS[attempt] ??
          RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
        console.log(
          `[API-Proxy] Retry ${attempt + 1}/${MAX_RETRIES - 1} for ${endpoint} after ${delayMs}ms`,
        );
        await sleep(delayMs);
      }
    }
  }

  const durationMs = Date.now() - startTime;
  const errorMessage = lastError?.message || "Unknown error";
  logApiCall(endpoint, params, durationMs, false, errorMessage);

  throw new HTTPException(500, {
    message: `API-Proxy request failed after ${MAX_RETRIES} attempts: ${errorMessage}`,
  });
}

function transformResponse<T>(response: ApiProxyResponse<T>): ApiResponse<T> {
  return {
    success: response.status,
    data: response.data,
    message: response.message !== "Success" ? response.message : undefined,
  };
}

export interface Drama {
  id: string;
  title: string;
  cover: string;
  intro: string;
  book_id?: string;
  source?: string;
}

export interface Episode {
  id: string;
  title: string;
  index: number;
  url?: string;
  cover?: string;
}

export interface EpisodeMetadata {
  title: string;
  cover: string;
  intro: string;
}

export interface EpisodesResponse {
  id: string;
  title: string;
  cover: string;
  intro: string;
  totalEpisodes: number;
  episodes: Episode[];
}

export interface RankItem {
  rank: number;
  drama: Drama;
}

export interface ChannelDrama extends Drama {
  channelId: number;
  channelName: string;
}

export async function getFeatured(
  page: number = 1,
  size: number = 20,
): Promise<ApiResponse<Drama[]>> {
  const response = await fetchWithRetry<Drama[]>("/drama/featured", {
    page,
    size,
  });
  return transformResponse(response);
}

export async function getLatest(
  page: number = 1,
  size: number = 20,
): Promise<ApiResponse<Drama[]>> {
  const response = await fetchWithRetry<Drama[]>("/drama/latest", {
    page,
    size,
  });
  return transformResponse(response);
}

export async function getRank(
  type: number = 1,
): Promise<ApiResponse<RankItem[]>> {
  const response = await fetchWithRetry<RankItem[]>("/drama/rank", { type });
  return transformResponse(response);
}

export async function getChannel(
  id: number,
  page: number = 1,
  size: number = 20,
): Promise<ApiResponse<ChannelDrama[]>> {
  const response = await fetchWithRetry<ChannelDrama[]>(
    `/drama/channel/${id}`,
    { page, size },
  );
  return transformResponse(response);
}

export async function getIndo(
  page: number = 1,
  size: number = 20,
): Promise<ApiResponse<Drama[]>> {
  const response = await fetchWithRetry<Drama[]>("/drama/indo", { page, size });
  return transformResponse(response);
}

export async function search(
  q: string,
  page: number = 1,
  size: number = 20,
): Promise<ApiResponse<Drama[]>> {
  const response = await fetchWithRetry<Drama[]>("/drama/search", {
    q,
    page,
    size,
  });
  return transformResponse(response);
}

export async function suggest(q: string): Promise<ApiResponse<Drama[]>> {
  const response = await fetchWithRetry<Drama[]>("/drama/suggest", { q });
  return transformResponse(response);
}

export async function getEpisodes(
  bookId: string,
): Promise<ApiResponse<EpisodesResponse>> {
  const response = await fetchWithRetry<Episode[]>(
    `/drama/episodes/${bookId}`,
    {},
    EPISODES_TIMEOUT_MS,
  );

  const metadata = response.metadata as EpisodeMetadata | undefined;
  const transformedData: EpisodesResponse = {
    id: bookId,
    title: metadata?.title ?? "",
    cover: metadata?.cover ?? "",
    intro: metadata?.intro ?? "",
    totalEpisodes: response.total ?? response.data.length,
    episodes: response.data,
  };

  return {
    success: response.status,
    data: transformedData,
  };
}

export async function getDetail(
  bookId: string,
): Promise<ApiResponse<EpisodesResponse>> {
  const response = await fetchWithRetry<EpisodesResponse>(
    `/drama/detail/${bookId}`,
    {},
    EPISODES_TIMEOUT_MS,
  );
  return transformResponse(response);
}
