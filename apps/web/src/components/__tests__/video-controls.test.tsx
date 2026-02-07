import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, screen, waitFor } from "../../test/utils.js";
import { VideoControls } from "../video-controls.js";
import type { VideoUrls } from "../quality-selector.js";

vi.mock("../quality-selector.js", () => ({
  QualitySelector: ({
    currentQuality,
    onQualityChange,
    disabled,
  }: {
    currentQuality: string;
    onQualityChange: (quality: string) => void;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      data-testid="quality-selector"
      data-quality={currentQuality}
      data-disabled={disabled}
      onClick={() => onQualityChange("1080p")}
    >
      Quality: {currentQuality}
    </button>
  ),
}));

describe("VideoControls", () => {
  const mockOnPlayPause = vi.fn();
  const mockOnVolumeChange = vi.fn();
  const mockOnMuteToggle = vi.fn();
  const mockOnSeek = vi.fn();
  const mockOnFullscreenToggle = vi.fn();
  const mockOnQualityChange = vi.fn();

  const defaultVideoUrls: VideoUrls = {
    "720p": "https://example.com/video-720p.mp4",
    "1080p": "https://example.com/video-1080p.mp4",
  };

  const defaultProps = {
    videoRef: { current: null as HTMLVideoElement | null },
    videoUrls: defaultVideoUrls,
    currentQuality: "720p" as const,
    onQualityChange: mockOnQualityChange,
    isPlaying: false,
    onPlayPause: mockOnPlayPause,
    currentTime: 30,
    duration: 120,
    buffered: 60,
    volume: 0.8,
    isMuted: false,
    onVolumeChange: mockOnVolumeChange,
    onMuteToggle: mockOnMuteToggle,
    onSeek: mockOnSeek,
    isFullscreen: false,
    onFullscreenToggle: mockOnFullscreenToggle,
    isLoading: false,
    title: "Test Episode",
  };

  beforeEach(() => {
    vi.resetAllMocks();

    const mockVideo = {
      currentTime: 30,
      duration: 120,
      play: vi.fn(),
      pause: vi.fn(),
    } as unknown as HTMLVideoElement;
    defaultProps.videoRef.current = mockVideo;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("play/pause button", () => {
    it("renders play icon when video is paused", () => {
      renderWithProviders(
        <VideoControls {...defaultProps} isPlaying={false} />,
      );

      const playButton = screen.getByRole("button", { name: /play/i });
      expect(playButton).toBeInTheDocument();
      expect(playButton.querySelector("svg")).toHaveClass("fill-current");
    });

    it("renders pause icon when video is playing", () => {
      renderWithProviders(<VideoControls {...defaultProps} isPlaying={true} />);

      const pauseButton = screen.getByRole("button", { name: /pause/i });
      expect(pauseButton).toBeInTheDocument();
    });

    it("calls onPlayPause when play button is clicked", async () => {
      renderWithProviders(<VideoControls {...defaultProps} />);

      const timeDisplay = screen.getByText(/0:30/);
      const controlsContainer = timeDisplay.closest(".flex");
      expect(controlsContainer).toBeInTheDocument();
    });

    it("displays correct progress percentage", () => {
      renderWithProviders(
        <VideoControls {...defaultProps} currentTime={30} duration={120} />,
      );

      expect(screen.getByText("0:30")).toBeInTheDocument();
      expect(screen.getByText("2:00")).toBeInTheDocument();
    });

    it("handles zero duration gracefully", () => {
      renderWithProviders(
        <VideoControls {...defaultProps} currentTime={0} duration={0} />,
      );

      expect(screen.getByText("0:00")).toBeInTheDocument();
      expect(screen.getByText("0:00")).toBeInTheDocument();
    });
  });

  describe("time display formatting", () => {
    it("formats short durations correctly", () => {
      renderWithProviders(
        <VideoControls {...defaultProps} currentTime={45} duration={90} />,
      );

      expect(screen.getByText("0:45")).toBeInTheDocument();
      expect(screen.getByText("1:30")).toBeInTheDocument();
    });

    it("formats durations over 1 hour correctly", () => {
      renderWithProviders(
        <VideoControls {...defaultProps} currentTime={3665} duration={7200} />,
      );

      expect(screen.getByText("1:01:05")).toBeInTheDocument();
      expect(screen.getByText("2:00:00")).toBeInTheDocument();
    });

    it("handles edge case of exactly 60 seconds", () => {
      renderWithProviders(
        <VideoControls {...defaultProps} currentTime={60} duration={120} />,
      );

      expect(screen.getByText("1:00")).toBeInTheDocument();
    });

    it("pads single digit seconds with zero", () => {
      renderWithProviders(
        <VideoControls {...defaultProps} currentTime={65} duration={120} />,
      );

      expect(screen.getByText("1:05")).toBeInTheDocument();
    });

    it("handles NaN duration gracefully", () => {
      renderWithProviders(
        <VideoControls {...defaultProps} currentTime={30} duration={NaN} />,
      );

      expect(screen.getByText("0:00")).toBeInTheDocument();
    });
  });

  describe("volume control", () => {
    it("renders volume icon when not muted", () => {
      renderWithProviders(
        <VideoControls {...defaultProps} isMuted={false} volume={0.8} />,
      );

      const volumeButton = screen.getByRole("button", { name: /mute/i });
      expect(volumeButton).toBeInTheDocument();
    });

    it("renders mute icon when muted", () => {
      renderWithProviders(
        <VideoControls {...defaultProps} isMuted={true} volume={0} />,
      );

      const unmuteButton = screen.getByRole("button", { name: /unmute/i });
      expect(unmuteButton).toBeInTheDocument();
    });

    it("calls onMuteToggle when volume button is clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(<VideoControls {...defaultProps} />);

      const volumeButton = screen.getByRole("button", { name: /mute/i });
      await user.click(volumeButton);

      expect(mockOnMuteToggle).toHaveBeenCalledTimes(1);
    });

    it("shows volume slider on hover", async () => {
      const user = userEvent.setup();
      renderWithProviders(<VideoControls {...defaultProps} />);

      const volumeContainer = screen.getByRole("button", {
        name: /mute/i,
      }).parentElement;
      expect(volumeContainer).toBeInTheDocument();

      await user.hover(volumeContainer!);

      const volumeSlider = screen.getByRole("slider", { name: /volume/i });
      expect(volumeSlider).toBeInTheDocument();
      expect(volumeSlider).toHaveValue("0.8");
    });

    it("calls onVolumeChange when volume slider is changed", async () => {
      const user = userEvent.setup();
      renderWithProviders(<VideoControls {...defaultProps} />);

      const volumeContainer = screen.getByRole("button", {
        name: /mute/i,
      }).parentElement;
      await user.hover(volumeContainer!);

      const volumeSlider = screen.getByRole("slider", { name: /volume/i });
      await user.clear(volumeSlider);
      await user.type(volumeSlider, "0.5");

      await waitFor(() => {
        expect(mockOnVolumeChange).toHaveBeenCalled();
      });
    });
  });

  describe("fullscreen button", () => {
    it("renders enter fullscreen button when not fullscreen", () => {
      renderWithProviders(
        <VideoControls {...defaultProps} isFullscreen={false} />,
      );

      const fullscreenButton = screen.getByRole("button", {
        name: /enter fullscreen/i,
      });
      expect(fullscreenButton).toBeInTheDocument();
    });

    it("renders exit fullscreen button when in fullscreen", () => {
      renderWithProviders(
        <VideoControls {...defaultProps} isFullscreen={true} />,
      );

      const exitFullscreenButton = screen.getByRole("button", {
        name: /exit fullscreen/i,
      });
      expect(exitFullscreenButton).toBeInTheDocument();
    });

    it("calls onFullscreenToggle when fullscreen button is clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <VideoControls {...defaultProps} isFullscreen={false} />,
      );

      const fullscreenButton = screen.getByRole("button", {
        name: /enter fullscreen/i,
      });
      await user.click(fullscreenButton);

      expect(mockOnFullscreenToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe("skip buttons", () => {
    it("renders skip backward button", () => {
      renderWithProviders(<VideoControls {...defaultProps} />);

      const skipBackwardButton = screen.getByRole("button", {
        name: /skip backward 10 seconds/i,
      });
      expect(skipBackwardButton).toBeInTheDocument();
    });

    it("renders skip forward button", () => {
      renderWithProviders(<VideoControls {...defaultProps} />);

      const skipForwardButton = screen.getByRole("button", {
        name: /skip forward 10 seconds/i,
      });
      expect(skipForwardButton).toBeInTheDocument();
    });

    it("seeks backward 10 seconds when skip backward is clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <VideoControls {...defaultProps} currentTime={30} duration={120} />,
      );

      const skipBackwardButton = screen.getByRole("button", {
        name: /skip backward 10 seconds/i,
      });
      await user.click(skipBackwardButton);

      expect(mockOnSeek).toHaveBeenCalledWith(20);
    });

    it("seeks forward 10 seconds when skip forward is clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <VideoControls {...defaultProps} currentTime={30} duration={120} />,
      );

      const skipForwardButton = screen.getByRole("button", {
        name: /skip forward 10 seconds/i,
      });
      await user.click(skipForwardButton);

      expect(mockOnSeek).toHaveBeenCalledWith(40);
    });

    it("clamps seek to minimum of 0", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <VideoControls {...defaultProps} currentTime={5} duration={120} />,
      );

      const skipBackwardButton = screen.getByRole("button", {
        name: /skip backward 10 seconds/i,
      });
      await user.click(skipBackwardButton);

      expect(mockOnSeek).toHaveBeenCalledWith(0);
    });

    it("clamps seek to maximum of duration", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <VideoControls {...defaultProps} currentTime={115} duration={120} />,
      );

      const skipForwardButton = screen.getByRole("button", {
        name: /skip forward 10 seconds/i,
      });
      await user.click(skipForwardButton);

      expect(mockOnSeek).toHaveBeenCalledWith(120);
    });
  });

  describe("keyboard shortcuts", () => {
    it("toggles play/pause with space key", async () => {
      renderWithProviders(<VideoControls {...defaultProps} />);

      await userEvent.keyboard(" ");

      expect(mockOnPlayPause).toHaveBeenCalledTimes(1);
    });

    it("toggles play/pause with k key", async () => {
      renderWithProviders(<VideoControls {...defaultProps} />);

      await userEvent.keyboard("k");

      expect(mockOnPlayPause).toHaveBeenCalledTimes(1);
    });

    it("seeks backward 10 seconds with left arrow", async () => {
      renderWithProviders(<VideoControls {...defaultProps} currentTime={30} />);

      await userEvent.keyboard("{ArrowLeft}");

      expect(mockOnSeek).toHaveBeenCalledWith(20);
    });

    it("seeks forward 10 seconds with right arrow", async () => {
      renderWithProviders(<VideoControls {...defaultProps} currentTime={30} />);

      await userEvent.keyboard("{ArrowRight}");

      expect(mockOnSeek).toHaveBeenCalledWith(40);
    });

    it("increases volume with up arrow", async () => {
      renderWithProviders(<VideoControls {...defaultProps} volume={0.5} />);

      await userEvent.keyboard("{ArrowUp}");

      expect(mockOnVolumeChange).toHaveBeenCalledWith(0.6);
    });

    it("decreases volume with down arrow", async () => {
      renderWithProviders(<VideoControls {...defaultProps} volume={0.5} />);

      await userEvent.keyboard("{ArrowDown}");

      expect(mockOnVolumeChange).toHaveBeenCalledWith(0.4);
    });

    it("toggles fullscreen with f key", async () => {
      renderWithProviders(<VideoControls {...defaultProps} />);

      await userEvent.keyboard("f");

      expect(mockOnFullscreenToggle).toHaveBeenCalledTimes(1);
    });

    it("toggles mute with m key", async () => {
      renderWithProviders(<VideoControls {...defaultProps} />);

      await userEvent.keyboard("m");

      expect(mockOnMuteToggle).toHaveBeenCalledTimes(1);
    });

    it("ignores keyboard shortcuts when typing in input", async () => {
      renderWithProviders(
        <div>
          <input data-testid="test-input" />
          <VideoControls {...defaultProps} />
        </div>,
      );

      const input = screen.getByTestId("test-input");
      await userEvent.click(input);
      await userEvent.keyboard(" ");

      expect(mockOnPlayPause).not.toHaveBeenCalled();
    });

    it("ignores keyboard shortcuts when typing in textarea", async () => {
      renderWithProviders(
        <div>
          <textarea data-testid="test-textarea" />
          <VideoControls {...defaultProps} />
        </div>,
      );

      const textarea = screen.getByTestId("test-textarea");
      await userEvent.click(textarea);
      await userEvent.keyboard(" ");

      expect(mockOnPlayPause).not.toHaveBeenCalled();
    });

    it("caps volume at 1.0 with up arrow", async () => {
      renderWithProviders(<VideoControls {...defaultProps} volume={0.95} />);

      await userEvent.keyboard("{ArrowUp}");

      expect(mockOnVolumeChange).toHaveBeenCalledWith(1);
    });

    it("floors volume at 0 with down arrow", async () => {
      renderWithProviders(<VideoControls {...defaultProps} volume={0.05} />);

      await userEvent.keyboard("{ArrowDown}");

      expect(mockOnVolumeChange).toHaveBeenCalledWith(0);
    });
  });

  describe("title display", () => {
    it("renders title when provided", () => {
      renderWithProviders(
        <VideoControls {...defaultProps} title="Episode 1: Pilot" />,
      );

      expect(screen.getByText("Episode 1: Pilot")).toBeInTheDocument();
    });

    it("does not render title when not provided", () => {
      renderWithProviders(
        <VideoControls {...defaultProps} title={undefined} />,
      );

      expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("shows loading spinner when isLoading is true", () => {
      renderWithProviders(<VideoControls {...defaultProps} isLoading={true} />);

      const loadingSpinner = document.querySelector(".animate-spin");
      expect(loadingSpinner).toBeInTheDocument();
    });

    it("does not show loading spinner when isLoading is false", () => {
      renderWithProviders(
        <VideoControls {...defaultProps} isLoading={false} />,
      );

      const loadingSpinner = document.querySelector(".animate-spin");
      expect(loadingSpinner).not.toBeInTheDocument();
    });

    it("disables quality selector when loading", () => {
      renderWithProviders(<VideoControls {...defaultProps} isLoading={true} />);

      const qualitySelector = screen.getByTestId("quality-selector");
      expect(qualitySelector).toHaveAttribute("data-disabled", "true");
    });
  });

  describe("controls visibility", () => {
    it("shows controls when hovering", async () => {
      const user = userEvent.setup();
      const { container } = renderWithProviders(
        <VideoControls {...defaultProps} isPlaying={true} />,
      );

      const controlsContainer = container.firstChild as HTMLElement;
      await user.hover(controlsContainer);

      expect(controlsContainer).toHaveClass("opacity-100");
    });

    it("shows controls when video is paused", () => {
      const { container } = renderWithProviders(
        <VideoControls {...defaultProps} isPlaying={false} />,
      );

      const controlsContainer = container.firstChild as HTMLElement;
      expect(controlsContainer).toHaveClass("opacity-100");
    });

    it("shows controls when loading", () => {
      const { container } = renderWithProviders(
        <VideoControls {...defaultProps} isPlaying={true} isLoading={true} />,
      );

      const controlsContainer = container.firstChild as HTMLElement;
      expect(controlsContainer).toHaveClass("opacity-100");
    });
  });

  describe("quality selector integration", () => {
    it("passes correct props to QualitySelector", () => {
      renderWithProviders(
        <VideoControls {...defaultProps} currentQuality="720p" />,
      );

      const qualitySelector = screen.getByTestId("quality-selector");
      expect(qualitySelector).toHaveAttribute("data-quality", "720p");
    });

    it("calls onQualityChange when quality is selected", async () => {
      const user = userEvent.setup();
      renderWithProviders(<VideoControls {...defaultProps} />);

      const qualitySelector = screen.getByTestId("quality-selector");
      await user.click(qualitySelector);

      expect(mockOnQualityChange).toHaveBeenCalledWith("1080p");
    });
  });

  describe("accessibility", () => {
    it("play button has correct aria-label when paused", () => {
      renderWithProviders(
        <VideoControls {...defaultProps} isPlaying={false} />,
      );

      expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
    });

    it("play button has correct aria-label when playing", () => {
      renderWithProviders(<VideoControls {...defaultProps} isPlaying={true} />);

      expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    });

    it("volume button has correct aria-label when not muted", () => {
      renderWithProviders(<VideoControls {...defaultProps} isMuted={false} />);

      expect(screen.getByRole("button", { name: "Mute" })).toBeInTheDocument();
    });

    it("volume button has correct aria-label when muted", () => {
      renderWithProviders(<VideoControls {...defaultProps} isMuted={true} />);

      expect(
        screen.getByRole("button", { name: "Unmute" }),
      ).toBeInTheDocument();
    });

    it("skip buttons have descriptive aria-labels", () => {
      renderWithProviders(<VideoControls {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: "Skip backward 10 seconds" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Skip forward 10 seconds" }),
      ).toBeInTheDocument();
    });

    it("fullscreen button has correct aria-label when not fullscreen", () => {
      renderWithProviders(
        <VideoControls {...defaultProps} isFullscreen={false} />,
      );

      expect(
        screen.getByRole("button", { name: "Enter fullscreen" }),
      ).toBeInTheDocument();
    });

    it("fullscreen button has correct aria-label when in fullscreen", () => {
      renderWithProviders(
        <VideoControls {...defaultProps} isFullscreen={true} />,
      );

      expect(
        screen.getByRole("button", { name: "Exit fullscreen" }),
      ).toBeInTheDocument();
    });

    it("volume slider has correct aria-label", async () => {
      const user = userEvent.setup();
      renderWithProviders(<VideoControls {...defaultProps} />);

      const volumeContainer = screen.getByRole("button", {
        name: /mute/i,
      }).parentElement;
      await user.hover(volumeContainer!);

      expect(
        screen.getByRole("slider", { name: "Volume" }),
      ).toBeInTheDocument();
    });
  });
});
