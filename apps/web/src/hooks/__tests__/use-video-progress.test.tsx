import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { useVideoProgress } from "../use-video-progress.js";
import {
  createTestQueryClient,
  renderWithProviders,
} from "../../test/utils.js";

type MockApiResponse = {
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
};

type HistoryApi = {
  $get: () => Promise<MockApiResponse>;
  $post: (args: { json: Record<string, unknown> }) => Promise<MockApiResponse>;
  episodes: Record<string, { $get: () => Promise<MockApiResponse> }>;
};

const mockHistoryApi: HistoryApi = {
  $get: vi.fn(),
  $post: vi.fn(),
  episodes: {},
};

vi.mock("@/lib/api", () => ({
  api: {
    api: {
      get history(): HistoryApi {
        return mockHistoryApi;
      },
    },
  },
}));

describe("useVideoProgress", () => {
  const episodeId = "test-episode-123";
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    queryClient = createTestQueryClient();

    const sendBeaconMock = navigator.sendBeacon as ReturnType<typeof vi.fn>;
    sendBeaconMock.mockClear();

    mockHistoryApi.episodes = {};
    mockHistoryApi.$get = vi.fn();
    mockHistoryApi.$post = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) =>
      renderWithProviders(children as React.ReactElement, { queryClient })
        .container.parentElement as unknown as React.ReactElement;
  };

  const setupEpisodeMock = () => {
    mockHistoryApi.episodes[episodeId] = { $get: vi.fn() };
    return mockHistoryApi.episodes[episodeId];
  };

  describe("initialization", () => {
    it("initializes with correct default values", () => {
      const episodeMock = setupEpisodeMock();
      episodeMock.$get = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: null,
        }),
      });

      const { result } = renderHook(
        () => useVideoProgress({ episodeId, enabled: true }),
        { wrapper: createWrapper() },
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.resumeTime).toBe(0);
      expect(result.current.wasCompleted).toBe(false);
      expect(result.current.isSyncing).toBe(false);
    });

    it("does not fetch when enabled is false", () => {
      const mockGet = vi.fn();
      mockHistoryApi.episodes[episodeId] = { $get: mockGet };

      renderHook(() => useVideoProgress({ episodeId, enabled: false }), {
        wrapper: createWrapper(),
      });

      expect(mockGet).not.toHaveBeenCalled();
    });

    it("does not fetch when episodeId is empty", () => {
      const mockGet = vi.fn();
      mockHistoryApi.episodes[""] = { $get: mockGet };

      renderHook(() => useVideoProgress({ episodeId: "", enabled: true }), {
        wrapper: createWrapper(),
      });

      expect(mockGet).not.toHaveBeenCalled();
    });
  });

  describe("progress tracking", () => {
    it("fetches existing progress on mount", async () => {
      const episodeMock = setupEpisodeMock();
      episodeMock.$get = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: {
            episodeId,
            progress: 300,
            duration: 1200,
            completed: false,
            watchedAt: "2024-01-01T00:00:00Z",
          },
        }),
      });

      const { result } = renderHook(
        () => useVideoProgress({ episodeId, enabled: true }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.resumeTime).toBe(300);
      expect(result.current.wasCompleted).toBe(false);
    });

    it("handles 404 response gracefully", async () => {
      const episodeMock = setupEpisodeMock();
      episodeMock.$get = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: vi.fn(),
      });

      const { result } = renderHook(
        () => useVideoProgress({ episodeId, enabled: true }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.resumeTime).toBe(0);
      expect(result.current.isError).toBe(false);
    });

    it("handles fetch error", async () => {
      const episodeMock = setupEpisodeMock();
      episodeMock.$get = vi.fn().mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(
        () => useVideoProgress({ episodeId, enabled: true }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe("progress sync", () => {
    it("syncs progress to API", async () => {
      const episodeMock = setupEpisodeMock();
      episodeMock.$get = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: null,
        }),
      });

      mockHistoryApi.$post = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      });

      const { result } = renderHook(
        () => useVideoProgress({ episodeId, enabled: true }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.updateCurrentTime(100);
      result.current.updateDuration(1000);

      await result.current.syncProgress(true);

      await waitFor(() => {
        expect(mockHistoryApi.$post).toHaveBeenCalledWith({
          json: {
            episodeId,
            progress: 100,
            completed: false,
          },
        });
      });
    });

    it("marks episode as completed at 90% threshold", async () => {
      const episodeMock = setupEpisodeMock();
      episodeMock.$get = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: null,
        }),
      });

      mockHistoryApi.$post = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      });

      const { result } = renderHook(
        () => useVideoProgress({ episodeId, enabled: true }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.updateCurrentTime(900);
      result.current.updateDuration(1000);

      await result.current.syncProgress(true);

      await waitFor(() => {
        expect(mockHistoryApi.$post).toHaveBeenCalledWith({
          json: expect.objectContaining({
            completed: true,
          }),
        });
      });
    });

    it("does not mark as completed below 90% threshold", async () => {
      const episodeMock = setupEpisodeMock();
      episodeMock.$get = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: null,
        }),
      });

      mockHistoryApi.$post = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      });

      const { result } = renderHook(
        () => useVideoProgress({ episodeId, enabled: true }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.updateCurrentTime(890);
      result.current.updateDuration(1000);

      await result.current.syncProgress(true);

      await waitFor(() => {
        expect(mockHistoryApi.$post).toHaveBeenCalledWith({
          json: expect.objectContaining({
            completed: false,
          }),
        });
      });
    });

    it("does not sync when duration is 0 or negative", async () => {
      const episodeMock = setupEpisodeMock();
      episodeMock.$get = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: null,
        }),
      });

      const { result } = renderHook(
        () => useVideoProgress({ episodeId, enabled: true }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.updateCurrentTime(100);
      result.current.updateDuration(0);

      await result.current.syncProgress(true);

      expect(mockHistoryApi.$post).not.toHaveBeenCalled();
    });

    it("does not sync when disabled", async () => {
      const { result } = renderHook(
        () => useVideoProgress({ episodeId, enabled: false }),
        { wrapper: createWrapper() },
      );

      result.current.updateCurrentTime(100);
      result.current.updateDuration(1000);

      await result.current.syncProgress(true);

      expect(mockHistoryApi.$post).not.toHaveBeenCalled();
    });

    it("handles sync error gracefully", async () => {
      const episodeMock = setupEpisodeMock();
      episodeMock.$get = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: null,
        }),
      });

      mockHistoryApi.$post = vi
        .fn()
        .mockRejectedValue(new Error("Sync failed"));

      const { result } = renderHook(
        () => useVideoProgress({ episodeId, enabled: true }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.updateCurrentTime(100);
      result.current.updateDuration(1000);

      await expect(result.current.syncProgress(true)).resolves.not.toThrow();
    });
  });

  describe("throttling", () => {
    it("throttles sync to every 10 seconds by default", async () => {
      const episodeMock = setupEpisodeMock();
      episodeMock.$get = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: null,
        }),
      });

      mockHistoryApi.$post = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      });

      const { result } = renderHook(
        () =>
          useVideoProgress({ episodeId, enabled: true, syncIntervalMs: 10000 }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.updateCurrentTime(100);
      result.current.updateDuration(1000);

      await result.current.syncProgress();
      expect(mockHistoryApi.$post).toHaveBeenCalledTimes(1);

      await result.current.syncProgress();
      expect(mockHistoryApi.$post).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(10000);
      await result.current.syncProgress();

      await waitFor(() => {
        expect(mockHistoryApi.$post).toHaveBeenCalledTimes(2);
      });
    });

    it("allows force sync to bypass throttling", async () => {
      const episodeMock = setupEpisodeMock();
      episodeMock.$get = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: null,
        }),
      });

      mockHistoryApi.$post = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      });

      const { result } = renderHook(
        () => useVideoProgress({ episodeId, enabled: true }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.updateCurrentTime(100);
      result.current.updateDuration(1000);

      await result.current.syncProgress();
      expect(mockHistoryApi.$post).toHaveBeenCalledTimes(1);

      await result.current.syncProgress(true);
      expect(mockHistoryApi.$post).toHaveBeenCalledTimes(2);
    });

    it("respects custom sync interval", async () => {
      const episodeMock = setupEpisodeMock();
      episodeMock.$get = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: null,
        }),
      });

      mockHistoryApi.$post = vi
        .fn()
        .mockResolvedValue({ ok: true, json: vi.fn() });

      const { result } = renderHook(
        () =>
          useVideoProgress({ episodeId, enabled: true, syncIntervalMs: 5000 }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.updateCurrentTime(100);
      result.current.updateDuration(1000);

      await result.current.syncProgress();
      expect(mockHistoryApi.$post).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(4000);
      await result.current.syncProgress();
      expect(mockHistoryApi.$post).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1000);
      await result.current.syncProgress();

      await waitFor(() => {
        expect(mockHistoryApi.$post).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("sendBeacon on unload", () => {
    it("calls sendBeacon on beforeunload when duration > 0", async () => {
      const episodeMock = setupEpisodeMock();
      episodeMock.$get = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: null,
        }),
      });

      const { result } = renderHook(
        () => useVideoProgress({ episodeId, enabled: true }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.updateCurrentTime(500);
      result.current.updateDuration(1000);

      const beforeUnloadEvent = new Event("beforeunload");
      window.dispatchEvent(beforeUnloadEvent);

      expect(navigator.sendBeacon).toHaveBeenCalledWith(
        "/api/history",
        JSON.stringify({
          episodeId,
          progress: 500,
          completed: false,
        }),
      );
    });

    it("marks as completed in sendBeacon when at 90%", async () => {
      const episodeMock = setupEpisodeMock();
      episodeMock.$get = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: null,
        }),
      });

      const { result } = renderHook(
        () => useVideoProgress({ episodeId, enabled: true }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.updateCurrentTime(900);
      result.current.updateDuration(1000);

      const beforeUnloadEvent = new Event("beforeunload");
      window.dispatchEvent(beforeUnloadEvent);

      expect(navigator.sendBeacon).toHaveBeenCalledWith(
        "/api/history",
        JSON.stringify({
          episodeId,
          progress: 900,
          completed: true,
        }),
      );
    });

    it("does not call sendBeacon when duration is 0", async () => {
      const episodeMock = setupEpisodeMock();
      episodeMock.$get = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: null,
        }),
      });

      const { result } = renderHook(
        () => useVideoProgress({ episodeId, enabled: true }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.updateCurrentTime(100);
      result.current.updateDuration(0);

      const beforeUnloadEvent = new Event("beforeunload");
      window.dispatchEvent(beforeUnloadEvent);

      expect(navigator.sendBeacon).not.toHaveBeenCalled();
    });

    it("does not set up beforeunload listener when disabled", () => {
      const addEventListenerSpy = vi.spyOn(window, "addEventListener");

      renderHook(() => useVideoProgress({ episodeId, enabled: false }), {
        wrapper: createWrapper(),
      });

      const beforeUnloadCalls = addEventListenerSpy.mock.calls.filter(
        (call) => call[0] === "beforeunload",
      );

      expect(beforeUnloadCalls).toHaveLength(0);
    });

    it("cleans up beforeunload listener on unmount", async () => {
      const episodeMock = setupEpisodeMock();
      episodeMock.$get = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: null,
        }),
      });

      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

      const { unmount } = renderHook(
        () => useVideoProgress({ episodeId, enabled: true }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(mockHistoryApi.episodes[episodeId].$get).toHaveBeenCalled();
      });

      unmount();

      const beforeUnloadRemovals = removeEventListenerSpy.mock.calls.filter(
        (call) => call[0] === "beforeunload",
      );

      expect(beforeUnloadRemovals.length).toBeGreaterThan(0);
    });

    it("handles sendBeacon not being available", async () => {
      const originalSendBeacon = navigator.sendBeacon;
      Object.defineProperty(navigator, "sendBeacon", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const episodeMock = setupEpisodeMock();
      episodeMock.$get = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: null,
        }),
      });

      const { result } = renderHook(
        () => useVideoProgress({ episodeId, enabled: true }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.updateCurrentTime(500);
      result.current.updateDuration(1000);

      const beforeUnloadEvent = new Event("beforeunload");
      expect(() => window.dispatchEvent(beforeUnloadEvent)).not.toThrow();

      Object.defineProperty(navigator, "sendBeacon", {
        value: originalSendBeacon,
        writable: true,
        configurable: true,
      });
    });
  });

  describe("auto-sync interval", () => {
    it("sets up interval for auto-sync", async () => {
      const episodeMock = setupEpisodeMock();
      episodeMock.$get = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: null,
        }),
      });

      mockHistoryApi.$post = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      });

      const { result } = renderHook(
        () =>
          useVideoProgress({ episodeId, enabled: true, syncIntervalMs: 5000 }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.updateCurrentTime(100);
      result.current.updateDuration(1000);

      expect(mockHistoryApi.$post).not.toHaveBeenCalled();

      vi.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(mockHistoryApi.$post).toHaveBeenCalledTimes(1);
      });
    });

    it("cleans up interval on unmount", async () => {
      const episodeMock = setupEpisodeMock();
      episodeMock.$get = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: null,
        }),
      });

      const clearIntervalSpy = vi.spyOn(global, "clearInterval");

      const { unmount, result } = renderHook(
        () => useVideoProgress({ episodeId, enabled: true }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe("updateCurrentTime and updateDuration", () => {
    it("updates current time via ref", async () => {
      const episodeMock = setupEpisodeMock();
      episodeMock.$get = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: null,
        }),
      });

      const { result } = renderHook(
        () => useVideoProgress({ episodeId, enabled: true }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.updateCurrentTime(150);

      expect(result.current.currentTimeRef.current).toBe(150);
    });

    it("updates duration via ref", async () => {
      const episodeMock = setupEpisodeMock();
      episodeMock.$get = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: null,
        }),
      });

      const { result } = renderHook(
        () => useVideoProgress({ episodeId, enabled: true }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.updateDuration(1800);

      expect(result.current.durationRef.current).toBe(1800);
    });
  });

  describe("isSyncing state", () => {
    it("reflects mutation pending state", async () => {
      const episodeMock = setupEpisodeMock();
      episodeMock.$get = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: null,
        }),
      });

      let resolvePost: ((value: unknown) => void) | undefined;
      const postPromise = new Promise((resolve) => {
        resolvePost = resolve;
      });

      mockHistoryApi.$post = vi.fn().mockReturnValue(postPromise);

      const { result } = renderHook(
        () => useVideoProgress({ episodeId, enabled: true }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.updateCurrentTime(100);
      result.current.updateDuration(1000);

      const syncPromise = result.current.syncProgress(true);

      await waitFor(() => {
        expect(result.current.isSyncing).toBe(true);
      });

      resolvePost!({ ok: true });
      await syncPromise;

      await waitFor(() => {
        expect(result.current.isSyncing).toBe(false);
      });
    });
  });
});
