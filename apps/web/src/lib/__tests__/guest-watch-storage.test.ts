import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  canTrackNewEpisode,
  clearAfterMerge,
  isEpisodeTracked,
  readSafe,
  recordEpisodePlaybackStart,
  serializeMergePayload,
} from "../guest-watch-storage.js";

type LocalStorageMock = Storage & {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
};

const STORAGE_KEY = "guest-watch-history";

describe("guest-watch-storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores a versioned schema capped at 10 unique episode ids", () => {
    const localStorageMock = window.localStorage as LocalStorageMock;

    for (let index = 1; index <= 11; index += 1) {
      localStorageMock.getItem.mockReturnValueOnce(
        JSON.stringify({
          version: 1,
          episodeIds: Array.from(
            { length: index - 1 },
            (_, offset) => `episode-${offset + 1}`,
          ),
        }),
      );

      recordEpisodePlaybackStart(`episode-${index}`);
    }

    expect(localStorageMock.setItem).toHaveBeenLastCalledWith(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        episodeIds: Array.from(
          { length: 10 },
          (_, index) => `episode-${index + 2}`,
        ),
      }),
    );
  });

  it("dedupes replayed episodes and moves them to most-recent position without growing", () => {
    const localStorageMock = window.localStorage as LocalStorageMock;

    localStorageMock.getItem.mockReturnValue(
      JSON.stringify({
        version: 1,
        episodeIds: ["episode-1", "episode-2", "episode-3"],
      }),
    );

    const nextState = recordEpisodePlaybackStart("episode-2");

    expect(nextState).toEqual({
      version: 1,
      episodeIds: ["episode-1", "episode-3", "episode-2"],
    });
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify(nextState),
    );
    expect(isEpisodeTracked("episode-2")).toBe(true);
    expect(canTrackNewEpisode(3)).toBe(false);
  });

  it("falls back to an empty versioned state when storage JSON is malformed", () => {
    const localStorageMock = window.localStorage as LocalStorageMock;

    localStorageMock.getItem.mockReturnValue("{bad-json");

    expect(readSafe()).toEqual({
      version: 1,
      episodeIds: [],
    });
    expect(serializeMergePayload()).toBe(
      JSON.stringify({
        version: 1,
        episodeIds: [],
      }),
    );
  });

  it("does not throw when localStorage.setItem fails and still returns next state", () => {
    const localStorageMock = window.localStorage as LocalStorageMock;
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    localStorageMock.getItem.mockReturnValue(
      JSON.stringify({
        version: 1,
        episodeIds: ["episode-1"],
      }),
    );
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    expect(() => recordEpisodePlaybackStart("episode-2")).not.toThrow();
    expect(recordEpisodePlaybackStart("episode-2")).toEqual({
      version: 1,
      episodeIds: ["episode-1", "episode-2"],
    });
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it("clears guest-watch keys after merge", () => {
    const localStorageMock = window.localStorage as LocalStorageMock;

    clearAfterMerge();

    expect(localStorageMock.removeItem).toHaveBeenCalledWith(
      "guest-watch-history",
    );
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(
      "guest-watch-limit-reached",
    );
  });

  it("reads legacy array storage safely", () => {
    const localStorageMock = window.localStorage as LocalStorageMock;

    localStorageMock.getItem.mockReturnValue(
      JSON.stringify(["episode-1", "episode-2", "episode-1"]),
    );

    expect(readSafe()).toEqual({
      version: 1,
      episodeIds: ["episode-2", "episode-1"],
    });
  });
});
