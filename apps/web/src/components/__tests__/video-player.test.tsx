import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { fireEvent, renderWithProviders, screen } from "../../test/utils.tsx";
import { VideoPlayer } from "../video-player.js";
import type { VideoUrls } from "../quality-selector.js";

vi.mock("../hooks/use-video-progress.js", () => ({
  useVideoProgress: () => ({
    resumeTime: 0,
    updateDuration: vi.fn(),
    updateCurrentTime: vi.fn(),
    syncProgress: vi.fn(),
  }),
}));

describe("VideoPlayer", () => {
  const videoUrls: VideoUrls = {
    "1080p": "https://example.com/video.mp4",
  };

  beforeAll(() => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() =>
      Promise.resolve(),
    );
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(
      () => undefined,
    );
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("hides controls on single tap when controls are visible", () => {
    const { container } = renderWithProviders(
      <VideoPlayer videoUrls={videoUrls} title="Test" />,
    );

    const visibleControlButton = screen.getByRole("button", {
      name: /enter fullscreen/i,
    });
    expect(visibleControlButton).toBeInTheDocument();

    const playerContainer = container.firstElementChild;
    expect(playerContainer).toBeInstanceOf(HTMLDivElement);

    fireEvent.click(playerContainer!);

    expect(
      screen.queryByRole("button", { name: /enter fullscreen/i }),
    ).not.toBeInTheDocument();
  });

  it("shows center icon overlay when toggling playback", () => {
    const { container } = renderWithProviders(
      <VideoPlayer videoUrls={videoUrls} title="Test" />,
    );

    const playerContainer = container.firstElementChild;
    expect(playerContainer).toBeInstanceOf(HTMLDivElement);

    fireEvent.click(playerContainer!);

    expect(screen.queryByTestId("center-icon-overlay")).toBeInTheDocument();
  });

  it("auto-hides center icon overlay after 200ms", () => {
    vi.useFakeTimers();

    try {
      const { container } = renderWithProviders(
        <VideoPlayer videoUrls={videoUrls} title="Test" />,
      );

      const playerContainer = container.firstElementChild;
      expect(playerContainer).toBeInstanceOf(HTMLDivElement);

      fireEvent.click(playerContainer!);

      expect(screen.queryByTestId("center-icon-overlay")).toBeInTheDocument();

      vi.advanceTimersByTime(200);

      expect(
        screen.queryByTestId("center-icon-overlay"),
      ).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
