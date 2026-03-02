import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface HistoryItem {
  id: string;
  userId: string;
  episodeId: string;
  progress: number;
  watchedAt: string;
  completed: boolean;
  episode: {
    id: string;
    dramaId: string;
    number: number;
    title: string | null;
    description: string | null;
    duration: number | null;
    videoUrls: Record<string, string> | null;
    drama?: {
      id: string;
      title: string;
      slug: string;
      posterUrl: string | null;
    };
  };
}

interface ContinueWatchingItem {
  historyId: string;
  episodeId: string;
  dramaId: string;
  dramaTitle: string;
  dramaSlug: string;
  posterUrl: string | null;
  episodeNumber: number;
  episodeTitle: string | null;
  progress: number;
  duration: number | null;
  progressPercent: number;
  watchedAt: string;
  completed: boolean;
}

async function fetchHistory(): Promise<HistoryItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/history`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch history");
  }
  const data = await res.json();
  return data.data.items;
}

async function fetchContinueWatching(): Promise<ContinueWatchingItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/history/continue`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch continue watching");
  }
  const data = await res.json();
  return data.data;
}

async function recordProgress(
  episodeId: string,
  progress: number,
  completed: boolean = false,
): Promise<HistoryItem> {
  const res = await fetch(`${API_BASE_URL}/api/history`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ episodeId, progress, completed }),
  });
  if (!res.ok) {
    throw new Error("Failed to record progress");
  }
  const data = await res.json();
  return data.data;
}

async function fetchEpisodeProgress(
  episodeId: string,
): Promise<HistoryItem | null> {
  const res = await fetch(`${API_BASE_URL}/api/history/episodes/${episodeId}`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch episode progress");
  }
  const data = await res.json();
  return data.data;
}

async function deleteHistoryEntry(historyId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/history/${historyId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Failed to delete history entry");
  }
}

async function clearHistory(): Promise<number> {
  const res = await fetch(`${API_BASE_URL}/api/history`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Failed to clear history");
  }
  const data = await res.json();
  return data.data.deletedCount;
}

export function useHistory() {
  return useQuery({
    queryKey: ["history"],
    queryFn: fetchHistory,
  });
}

export function useContinueWatching(isAuthenticated = true) {
  return useQuery({
    queryKey: ["history", "continue"],
    queryFn: fetchContinueWatching,
    enabled: isAuthenticated,
  });
}

export function useEpisodeProgress(episodeId: string) {
  return useQuery({
    queryKey: ["history", "episode", episodeId],
    queryFn: () => fetchEpisodeProgress(episodeId),
    enabled: !!episodeId,
  });
}

export function useRecordProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      episodeId,
      progress,
      completed,
    }: {
      episodeId: string;
      progress: number;
      completed?: boolean;
    }) => recordProgress(episodeId, progress, completed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
      queryClient.invalidateQueries({ queryKey: ["history", "continue"] });
    },
  });
}

export function useDeleteHistoryEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteHistoryEntry,
    onMutate: async (historyId) => {
      await queryClient.cancelQueries({ queryKey: ["history"] });
      await queryClient.cancelQueries({ queryKey: ["history", "continue"] });

      const previousHistory = queryClient.getQueryData<HistoryItem[]>([
        "history",
      ]);
      const previousContinue = queryClient.getQueryData<ContinueWatchingItem[]>(
        ["history", "continue"],
      );

      queryClient.setQueryData<HistoryItem[]>(["history"], (old) =>
        old?.filter((item) => item.id !== historyId),
      );
      queryClient.setQueryData<ContinueWatchingItem[]>(
        ["history", "continue"],
        (old) => old?.filter((item) => item.historyId !== historyId),
      );

      return { previousHistory, previousContinue };
    },
    onError: (_err, _historyId, context) => {
      if (context?.previousHistory) {
        queryClient.setQueryData(["history"], context.previousHistory);
      }
      if (context?.previousContinue) {
        queryClient.setQueryData(
          ["history", "continue"],
          context.previousContinue,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
      queryClient.invalidateQueries({ queryKey: ["history", "continue"] });
    },
  });
}

export function useClearHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clearHistory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
      queryClient.invalidateQueries({ queryKey: ["history", "continue"] });
    },
  });
}
