import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "vitest";
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

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  function preparePlayer(container: HTMLElement) {
    const playerContainer = container.firstElementChild as HTMLDivElement;
    const video = container.querySelector("video") as HTMLVideoElement;

    expect(playerContainer).toBeInTheDocument();
    expect(video).toBeInTheDocument();

    Object.defineProperty(playerContainer, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        left: 0,
        top: 0,
        right: 400,
        bottom: 300,
        width: 400,
        height: 300,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    Object.defineProperty(video, "duration", {
      configurable: true,
      value: 120,
    });

    Object.defineProperty(video, "currentTime", {
      configurable: true,
      writable: true,
      value: 30,
    });

    fireEvent.loadedMetadata(video);
    fireEvent.timeUpdate(video);

    return { playerContainer, video };
  }

  it("single click toggles play and pause", () => {
    const { container } = renderWithProviders(
      <VideoPlayer videoUrls={videoUrls} title="Test" />,
    );

    const { playerContainer, video } = preparePlayer(container);

    fireEvent.pointerDown(playerContainer, { clientX: 200 });
    vi.advanceTimersByTime(301);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);

    fireEvent.play(video);

    fireEvent.pointerDown(playerContainer, { clientX: 200 });
    vi.advanceTimersByTime(301);
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledTimes(1);
  });

  it("double click on right side seeks forward by 5 seconds", () => {
    const { container } = renderWithProviders(
      <VideoPlayer videoUrls={videoUrls} title="Test" />,
    );

    const { playerContainer, video } = preparePlayer(container);

    fireEvent.pointerDown(playerContainer, { clientX: 350 });
    vi.advanceTimersByTime(100);
    fireEvent.pointerDown(playerContainer, { clientX: 350 });

    expect(video.currentTime).toBe(35);
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it("double click on left side seeks backward by 5 seconds and clamps to 0", () => {
    const { container } = renderWithProviders(
      <VideoPlayer videoUrls={videoUrls} title="Test" />,
    );

    const { playerContainer, video } = preparePlayer(container);
    video.currentTime = 2;
    fireEvent.timeUpdate(video);

    fireEvent.pointerDown(playerContainer, { clientX: 50 });
    vi.advanceTimersByTime(100);
    fireEvent.pointerDown(playerContainer, { clientX: 50 });

    expect(video.currentTime).toBe(0);
  });

  it("keeps center play button visible when paused", () => {
    const { container } = renderWithProviders(
      <VideoPlayer videoUrls={videoUrls} title="Test" />,
    );
    const video = container.querySelector("video") as HTMLVideoElement;
    fireEvent.canPlay(video);

    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });

  it("clicking controls does not trigger player tap behavior", () => {
    const { container } = renderWithProviders(
      <VideoPlayer videoUrls={videoUrls} title="Test" />,
    );

    const { video } = preparePlayer(container);

    fireEvent.canPlay(video);
    const skipForwardButton = screen.getByRole("button", {
      name: /skip forward 10 seconds/i,
    });

    fireEvent.click(skipForwardButton);
    vi.advanceTimersByTime(301);

    expect(HTMLMediaElement.prototype.pause).not.toHaveBeenCalled();
  });
});
