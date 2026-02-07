import { useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiType = Record<string, unknown>;

export function useVideoProgress({
  episodeId,
  syncIntervalMs = 10000,
  enabled = true,
}: UseVideoProgressOptions) {
  const queryClient = useQueryClient();
  const lastSyncTimeRef = useRef<number>(0);
  const currentTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);

  const progressQuery = useQuery({
    queryKey: ["video-progress", episodeId],
    queryFn: async () => {
      const apiTyped = api.api as ApiType;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (apiTyped.history as any).episodes[episodeId].$get();

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error("Failed to fetch progress");
      }

      const data = (await response.json()) as ProgressResponse;
      return data.data || null;
    },
    enabled: enabled && !!episodeId,
    staleTime: 5 * 60 * 1000,
  });

  const syncMutation = useMutation({
    mutationFn: async (progress: VideoProgress) => {
      const apiTyped = api.api as ApiType;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (apiTyped.history as any).$post({
        json: {
          episodeId: progress.episodeId,
          progress: progress.currentTime,
          completed: progress.completed,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to sync progress");
      }

      return response.json();
    },
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
      if (!enabled || !episodeId) return;

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
      } catch {
        // Silently fail - progress sync is not critical
      }
    },
    [episodeId, enabled, syncIntervalMs, syncMutation]
  );

  useEffect(() => {
    if (!enabled || !episodeId) return;

    const intervalId = setInterval(() => {
      syncProgress();
    }, syncIntervalMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [episodeId, enabled, syncIntervalMs, syncProgress]);

  useEffect(() => {
    if (!enabled || !episodeId) return;

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
  }, [episodeId, enabled]);

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
