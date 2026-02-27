import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, screen } from "../../test/utils.js";
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
    showControls: true,
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows center play button when paused", () => {
    renderWithProviders(<VideoControls {...defaultProps} isPlaying={false} />);

    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });

  it("hides center play button when playing", () => {
    renderWithProviders(<VideoControls {...defaultProps} isPlaying={true} />);

    expect(screen.queryByRole("button", { name: "Play" })).not.toBeInTheDocument();
  });

  it("does not render bottom-row play/pause controls", () => {
    renderWithProviders(<VideoControls {...defaultProps} isPlaying={true} />);

    expect(screen.queryByRole("button", { name: "Pause" })).not.toBeInTheDocument();
  });

  it("renders skip backward and forward buttons", () => {
    renderWithProviders(<VideoControls {...defaultProps} />);

    expect(
      screen.getByRole("button", { name: "Skip backward 10 seconds" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Skip forward 10 seconds" }),
    ).toBeInTheDocument();
  });

  it("seeks backward and forward when skip buttons are clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <VideoControls {...defaultProps} currentTime={30} duration={120} />,
    );

    await user.click(
      screen.getByRole("button", { name: "Skip backward 10 seconds" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Skip forward 10 seconds" }),
    );

    expect(mockOnSeek).toHaveBeenNthCalledWith(1, 20);
    expect(mockOnSeek).toHaveBeenNthCalledWith(2, 40);
  });

  it("formats time display", () => {
    renderWithProviders(
      <VideoControls {...defaultProps} currentTime={3665} duration={7200} />,
    );

    expect(screen.getAllByText("1:01:05").length).toBeGreaterThan(0);
    expect(screen.getByText("2:00:00")).toBeInTheDocument();
  });

  it("toggles play/pause with keyboard shortcuts", async () => {
    renderWithProviders(<VideoControls {...defaultProps} />);

    await userEvent.keyboard(" ");
    await userEvent.keyboard("k");

    expect(mockOnPlayPause).toHaveBeenCalledTimes(2);
  });

  it("seeks with left/right keyboard arrows", async () => {
    renderWithProviders(<VideoControls {...defaultProps} currentTime={30} />);

    await userEvent.keyboard("{ArrowLeft}");
    await userEvent.keyboard("{ArrowRight}");

    expect(mockOnSeek).toHaveBeenNthCalledWith(1, 20);
    expect(mockOnSeek).toHaveBeenNthCalledWith(2, 40);
  });

  it("handles volume and mute controls", async () => {
    const user = userEvent.setup();
    renderWithProviders(<VideoControls {...defaultProps} isMuted={false} />);

    await user.click(screen.getByRole("button", { name: "Mute" }));

    expect(mockOnMuteToggle).toHaveBeenCalledTimes(1);
  });

  it("renders fullscreen button and toggles fullscreen", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <VideoControls {...defaultProps} isFullscreen={false} />,
    );

    const fullscreenButton = screen.getByRole("button", {
      name: "Enter fullscreen",
    });

    await user.click(fullscreenButton);

    expect(mockOnFullscreenToggle).toHaveBeenCalledTimes(1);
  });

  it("passes props to quality selector and handles changes", async () => {
    const user = userEvent.setup();
    renderWithProviders(<VideoControls {...defaultProps} currentQuality="720p" />);

    const qualitySelector = screen.getByTestId("quality-selector");
    expect(qualitySelector).toHaveAttribute("data-quality", "720p");

    await user.click(qualitySelector);

    expect(mockOnQualityChange).toHaveBeenCalledWith("1080p");
  });

  it("does not render controls when hidden", () => {
    const { container } = renderWithProviders(
      <VideoControls {...defaultProps} showControls={false} />,
    );

    expect(container.firstChild).toBeNull();
  });
});
