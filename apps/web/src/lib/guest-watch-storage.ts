const STORAGE_KEY = "guest-watch-history";
const LIMIT_REACHED_KEY = "guest-watch-limit-reached";
const STORAGE_VERSION = 1;
const DEFAULT_MAX_EPISODES = 10;

export interface GuestWatchStorageState {
  version: typeof STORAGE_VERSION;
  episodeIds: string[];
}

type LegacyGuestWatchStorage = string[];

type ParsedGuestWatchStorage =
  | GuestWatchStorageState
  | LegacyGuestWatchStorage
  | null;

function createEmptyState(): GuestWatchStorageState {
  return {
    version: STORAGE_VERSION,
    episodeIds: [],
  };
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function normalizeEpisodeIds(
  episodeIds: unknown[],
  max = DEFAULT_MAX_EPISODES,
): string[] {
  const normalized: string[] = [];

  for (const value of episodeIds) {
    if (typeof value !== "string") {
      continue;
    }

    const episodeId = value.trim();

    if (!episodeId) {
      continue;
    }

    const existingIndex = normalized.indexOf(episodeId);

    if (existingIndex >= 0) {
      normalized.splice(existingIndex, 1);
    }

    normalized.push(episodeId);
  }

  if (normalized.length <= max) {
    return normalized;
  }

  return normalized.slice(normalized.length - max);
}

function createStateFromParsedValue(
  parsedValue: ParsedGuestWatchStorage,
): GuestWatchStorageState {
  if (Array.isArray(parsedValue)) {
    return {
      version: STORAGE_VERSION,
      episodeIds: normalizeEpisodeIds(parsedValue),
    };
  }

  if (
    parsedValue &&
    typeof parsedValue === "object" &&
    parsedValue.version === STORAGE_VERSION &&
    Array.isArray(parsedValue.episodeIds)
  ) {
    return {
      version: STORAGE_VERSION,
      episodeIds: normalizeEpisodeIds(parsedValue.episodeIds),
    };
  }

  return createEmptyState();
}

function persistState(state: GuestWatchStorageState): void {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Failed to save guest watch history:", error);
  }
}

export function readSafe(): GuestWatchStorageState {
  const storage = getStorage();

  if (!storage) {
    return createEmptyState();
  }

  try {
    const storedValue = storage.getItem(STORAGE_KEY);

    if (!storedValue) {
      return createEmptyState();
    }

    const parsedValue = JSON.parse(storedValue) as ParsedGuestWatchStorage;

    return createStateFromParsedValue(parsedValue);
  } catch {
    return createEmptyState();
  }
}

export function recordEpisodePlaybackStart(
  episodeId: string,
): GuestWatchStorageState {
  const trimmedEpisodeId = episodeId.trim();

  if (!trimmedEpisodeId) {
    return readSafe();
  }

  const currentState = readSafe();
  const nextState: GuestWatchStorageState = {
    version: STORAGE_VERSION,
    episodeIds: normalizeEpisodeIds([
      ...currentState.episodeIds,
      trimmedEpisodeId,
    ]),
  };

  persistState(nextState);

  return nextState;
}

export function isEpisodeTracked(episodeId: string): boolean {
  const trimmedEpisodeId = episodeId.trim();

  if (!trimmedEpisodeId) {
    return false;
  }

  return readSafe().episodeIds.includes(trimmedEpisodeId);
}

export function canTrackNewEpisode(max = DEFAULT_MAX_EPISODES): boolean {
  if (max <= 0) {
    return false;
  }

  return readSafe().episodeIds.length < max;
}

export function serializeMergePayload(): string {
  return JSON.stringify(readSafe());
}

export function clearAfterMerge(): void {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  try {
    storage.removeItem(STORAGE_KEY);
    storage.removeItem(LIMIT_REACHED_KEY);
  } catch (error) {
    console.warn("Failed to clear guest watch history:", error);
  }
}

export const guestWatchStorage = {
  readSafe,
  recordEpisodePlaybackStart,
  isEpisodeTracked,
  canTrackNewEpisode,
  serializeMergePayload,
  clearAfterMerge,
};
