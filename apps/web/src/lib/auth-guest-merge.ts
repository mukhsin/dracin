import { guestWatchStorage } from "./guest-watch-storage.js";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

function buildMergeEntriesPayload(payload: string): string {
  try {
    const parsed = JSON.parse(payload) as {
      episodeIds?: unknown;
    };

    const episodeIds = Array.isArray(parsed.episodeIds)
      ? parsed.episodeIds
      : [];

    return JSON.stringify({
      entries: episodeIds.map((episodeId) => ({
        episodeId,
        progress: 0,
        completed: false,
      })),
    });
  } catch {
    return JSON.stringify({ entries: [] });
  }
}

export async function mergeGuestHistoryAfterAuthSuccess(): Promise<void> {
  const payload = guestWatchStorage.serializeMergePayload();
  const body = buildMergeEntriesPayload(payload);

  try {
    const response = await fetch(`${API_BASE_URL}/api/history/merge-guest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body,
    });

    if (response.ok) {
      guestWatchStorage.clearAfterMerge();
    }
  } catch {}
}
