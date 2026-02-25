import { useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface VideoProgress {
  episodeId: string;
  currentTime: number;
  duration: number;
  completed: boolean;
}

interface UseVideoProgressOptions {
  episodeId: string;
  syncIntervalMs?: number;
  enabled?: boolean;
  isAuthenticated?: boolean; // Only make API calls if user is logged in
}

interface ProgressData {
  episodeId: string;
  progress: number;
  duration: number;
  completed: boolean;
  watchedAt: string;
}

interface ProgressResponse {
  success: boolean;
  data?: ProgressData;
}

async function fetchEpisodeProgress(
  episodeId: string,
): Promise<ProgressData | null> {
  const response = await fetch(
    `${API_BASE_URL}/api/history/episodes/${episodeId}`,
    {
      credentials: "include",
    },
  );

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error("Failed to fetch progress");
  }

  const data = (await response.json()) as ProgressResponse;
  return data.data || null;
}

async function syncProgressToApi(progress: VideoProgress): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/history`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      episodeId: progress.episodeId,
      progress: progress.currentTime,
      completed: progress.completed,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to sync progress");
  }
}

export function useVideoProgress({
  episodeId,
  syncIntervalMs = 10000,
  enabled = true,
  isAuthenticated = false,
}: UseVideoProgressOptions) {
  const queryClient = useQueryClient();
  const lastSyncTimeRef = useRef<number>(0);
  const currentTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);

  const progressQuery = useQuery({
    queryKey: ["video-progress", episodeId],
    queryFn: () => fetchEpisodeProgress(episodeId),
    enabled: enabled && !!episodeId && isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const syncMutation = useMutation({
    mutationFn: syncProgressToApi,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["video-progress", episodeId],
      });
    },
  });

  const updateCurrentTime = useCallback((time: number) => {
    currentTimeRef.current = time;
  }, []);

  const updateDuration = useCallback((duration: number) => {
    durationRef.current = duration;
  }, []);

  const syncProgress = useCallback(
    async (force = false) => {
      if (!enabled || !episodeId || !isAuthenticated) return;

      const now = Date.now();
      const timeSinceLastSync = now - lastSyncTimeRef.current;

      if (!force && timeSinceLastSync < syncIntervalMs) {
        return;
      }

      const currentTime = currentTimeRef.current;
      const duration = durationRef.current;

      if (duration <= 0) return;

      const completed = currentTime / duration >= 0.9;

      const progress: VideoProgress = {
        episodeId,
        currentTime,
        duration,
        completed,
      };

      try {
        await syncMutation.mutateAsync(progress);
        lastSyncTimeRef.current = now;
      } catch (error) {
        console.error("Failed to sync progress:", error);
      }
    },
    [episodeId, enabled, isAuthenticated, syncIntervalMs, syncMutation],
  );

  useEffect(() => {
    if (!enabled || !episodeId || !isAuthenticated) return;

    const intervalId = setInterval(() => {
      syncProgress();
    }, syncIntervalMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [episodeId, enabled, isAuthenticated, syncIntervalMs, syncProgress]);

  useEffect(() => {
    if (!enabled || !episodeId || !isAuthenticated) return;

    const handleBeforeUnload = () => {
      const currentTime = currentTimeRef.current;
      const duration = durationRef.current;

      if (duration > 0) {
        const completed = currentTime / duration >= 0.9;
        const data = JSON.stringify({
          episodeId,
          progress: currentTime,
          completed,
        });
        navigator.sendBeacon?.("/api/history", data);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [episodeId, enabled, isAuthenticated]);

  const resumeTime = progressQuery.data?.progress || 0;
  const wasCompleted = progressQuery.data?.completed || false;

  return {
    resumeTime,
    wasCompleted,
    isLoading: progressQuery.isLoading,
    isError: progressQuery.isError,
    error: progressQuery.error,
    isSyncing: syncMutation.isPending,
    updateCurrentTime,
    updateDuration,
    syncProgress,
    currentTimeRef,
    durationRef,
  };
}

export default useVideoProgress;
