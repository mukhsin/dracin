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
import { act } from "react";
import { fireEvent, renderWithProviders, screen } from "../../test/utils.tsx";
import { useAuth } from "../../hooks/use-auth.js";
import { guestWatchStorage } from "../../lib/guest-watch-storage.js";
import { VideoPlayer } from "../video-player.js";
import type { VideoUrls } from "../quality-selector.js";

vi.mock("../../hooks/use-video-progress.js", () => ({
  useVideoProgress: () => ({
    resumeTime: 0,
    updateDuration: vi.fn(),
    updateCurrentTime: vi.fn(),
    syncProgress: vi.fn(),
  }),
}));

vi.mock("../../hooks/use-auth.js", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../lib/guest-watch-storage.js", () => ({
  guestWatchStorage: {
    isEpisodeTracked: vi.fn(),
    canTrackNewEpisode: vi.fn(),
    recordEpisodePlaybackStart: vi.fn(),
  },
}));

vi.mock("../sign-in-modal.js", () => ({
  SignInModal: ({
    isOpen,
    message,
  }: {
    isOpen: boolean;
    onClose: () => void;
    message?: string;
  }) => {
    if (!isOpen) {
      return null;
    }

    return (
      <div role="dialog" aria-label="Sign In Required">
        <h3>Sign In Required</h3>
        <p>{message}</p>
      </div>
    );
  },
}));

describe("VideoPlayer", () => {
  const useAuthMock = vi.mocked(useAuth);
  const guestWatchStorageMock = vi.mocked(guestWatchStorage);

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
    useAuthMock.mockReturnValue({
      user: {
        id: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        email: "user@example.com",
        emailVerified: true,
        name: "User",
      },
      isAuthenticated: true,
      isLoading: false,
      logout: vi.fn(),
    });
    guestWatchStorageMock.isEpisodeTracked.mockReturnValue(false);
    guestWatchStorageMock.canTrackNewEpisode.mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  function preparePlayer(container: HTMLElement) {
    const wrapper = container.firstElementChild as HTMLDivElement;
    const playerContainer = container.querySelector(
      "video",
    ) as HTMLVideoElement;
    const video = container.querySelector("video") as HTMLVideoElement;

    expect(playerContainer).toBeInTheDocument();
    expect(video).toBeInTheDocument();

    Object.defineProperty(wrapper, "getBoundingClientRect", {
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

  function advanceTimers(ms: number) {
    act(() => {
      vi.advanceTimersByTime(ms);
    });
  }

  it("single click toggles play and pause", () => {
    const { container } = renderWithProviders(
      <VideoPlayer videoUrls={videoUrls} title="Test" />,
    );

    const { playerContainer, video } = preparePlayer(container);

    fireEvent.pointerDown(playerContainer, { clientX: 200 });
    advanceTimers(301);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);

    fireEvent.play(video);

    fireEvent.pointerDown(playerContainer, { clientX: 200 });
    advanceTimers(301);
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledTimes(1);
  });

  it("double click on right side seeks forward by 5 seconds", () => {
    const { container } = renderWithProviders(
      <VideoPlayer videoUrls={videoUrls} title="Test" />,
    );

    const { playerContainer, video } = preparePlayer(container);

    fireEvent.pointerDown(playerContainer, { clientX: 350 });
    advanceTimers(100);
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
    advanceTimers(100);
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
    advanceTimers(301);

    expect(HTMLMediaElement.prototype.pause).not.toHaveBeenCalled();
  });

  it("movement beyond threshold cancels tap and does not trigger play/pause", () => {
    const { container } = renderWithProviders(
      <VideoPlayer videoUrls={videoUrls} title="Test" />,
    );

    const { playerContainer, video } = preparePlayer(container);
    fireEvent.canPlay(video);

    // Simulate pointer down
    fireEvent.pointerDown(playerContainer, { clientX: 200, clientY: 150 });

    // Simulate movement beyond threshold (10px)
    // Start at (200, 150), move to (220, 170) -> distance ~28px > 10px threshold
    fireEvent.pointerMove(document, { clientX: 220, clientY: 170 });

    // Release pointer
    fireEvent.pointerUp(document);

    // Wait for single tap timeout to complete
    advanceTimers(301);

    // Verify play was NOT triggered
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    // Verify pause was NOT triggered
    expect(HTMLMediaElement.prototype.pause).not.toHaveBeenCalled();
  });

  it("movement beyond threshold cancels double tap and does not trigger seek", () => {
    const { container } = renderWithProviders(
      <VideoPlayer videoUrls={videoUrls} title="Test" />,
    );

    const { playerContainer, video } = preparePlayer(container);
    video.currentTime = 30;
    fireEvent.timeUpdate(video);

    // First tap with movement
    fireEvent.pointerDown(playerContainer, { clientX: 350, clientY: 150 });
    fireEvent.pointerMove(document, { clientX: 370, clientY: 170 });
    fireEvent.pointerUp(document);
    advanceTimers(350);

    fireEvent.pointerDown(playerContainer, { clientX: 350, clientY: 150 });
    fireEvent.pointerMove(document, { clientX: 370, clientY: 170 });
    fireEvent.pointerUp(document);
    advanceTimers(301);

    // Verify seek was NOT triggered - time should remain at 30, not 35
    expect(video.currentTime).toBe(30);
    // Verify play was NOT triggered
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it("small movement within threshold allows tap to work normally", () => {
    const { container } = renderWithProviders(
      <VideoPlayer videoUrls={videoUrls} title="Test" />,
    );

    const { playerContainer, video } = preparePlayer(container);
    fireEvent.canPlay(video);

    // Simulate pointer down
    fireEvent.pointerDown(playerContainer, { clientX: 200, clientY: 150 });

    // Simulate small movement within threshold (5px)
    // Start at (200, 150), move to (205, 155) -> distance ~7px < 10px threshold
    fireEvent.pointerMove(document, { clientX: 205, clientY: 155 });

    // Release pointer
    fireEvent.pointerUp(document);

    // Wait for single tap timeout to complete
    advanceTimers(301);

    // Verify play WAS triggered (small movement should not cancel)
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
  });

  it("allows first 10 unique episodes for unauthenticated users", () => {
    useAuthMock.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      logout: vi.fn(),
    });

    const { container } = renderWithProviders(
      <VideoPlayer videoUrls={videoUrls} title="Test" episodeId="episode-10" />,
    );

    const { playerContainer } = preparePlayer(container);

    fireEvent.pointerDown(playerContainer, { clientX: 200 });
    advanceTimers(301);

    expect(guestWatchStorageMock.isEpisodeTracked).toHaveBeenCalledWith(
      "episode-10",
    );
    expect(guestWatchStorageMock.canTrackNewEpisode).toHaveBeenCalledTimes(1);
    expect(
      guestWatchStorageMock.recordEpisodePlaybackStart,
    ).toHaveBeenCalledWith("episode-10");
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("blocks 11th unique episode for unauthenticated users and opens sign-in modal", () => {
    useAuthMock.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      logout: vi.fn(),
    });
    guestWatchStorageMock.canTrackNewEpisode.mockReturnValue(false);

    const { container } = renderWithProviders(
      <VideoPlayer videoUrls={videoUrls} title="Test" episodeId="episode-11" />,
    );

    const { playerContainer } = preparePlayer(container);

    fireEvent.pointerDown(playerContainer, { clientX: 200 });
    advanceTimers(301);

    expect(guestWatchStorageMock.isEpisodeTracked).toHaveBeenCalledWith(
      "episode-11",
    );
    expect(guestWatchStorageMock.canTrackNewEpisode).toHaveBeenCalledTimes(1);
    expect(
      guestWatchStorageMock.recordEpisodePlaybackStart,
    ).not.toHaveBeenCalled();
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    expect(screen.getByText("Sign In Required")).toBeInTheDocument();
  });

  it("allows replaying a tracked episode for unauthenticated users without consuming slot", () => {
    useAuthMock.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      logout: vi.fn(),
    });
    guestWatchStorageMock.isEpisodeTracked.mockReturnValue(true);
    guestWatchStorageMock.canTrackNewEpisode.mockReturnValue(false);

    const { container } = renderWithProviders(
      <VideoPlayer
        videoUrls={videoUrls}
        title="Test"
        episodeId="episode-tracked"
      />,
    );

    const { playerContainer } = preparePlayer(container);

    fireEvent.pointerDown(playerContainer, { clientX: 200 });
    advanceTimers(301);

    expect(guestWatchStorageMock.isEpisodeTracked).toHaveBeenCalledWith(
      "episode-tracked",
    );
    expect(guestWatchStorageMock.canTrackNewEpisode).not.toHaveBeenCalled();
    expect(
      guestWatchStorageMock.recordEpisodePlaybackStart,
    ).not.toHaveBeenCalled();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("bypasses guest gate for authenticated users", () => {
    useAuthMock.mockReturnValue({
      user: {
        id: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        email: "user@example.com",
        emailVerified: true,
        name: "User",
      },
      isAuthenticated: true,
      isLoading: false,
      logout: vi.fn(),
    });
    guestWatchStorageMock.canTrackNewEpisode.mockReturnValue(false);

    const { container } = renderWithProviders(
      <VideoPlayer
        videoUrls={videoUrls}
        title="Test"
        episodeId="episode-auth"
      />,
    );

    const { playerContainer } = preparePlayer(container);

    fireEvent.pointerDown(playerContainer, { clientX: 200 });
    advanceTimers(301);

    expect(guestWatchStorageMock.isEpisodeTracked).not.toHaveBeenCalled();
    expect(guestWatchStorageMock.canTrackNewEpisode).not.toHaveBeenCalled();
    expect(
      guestWatchStorageMock.recordEpisodePlaybackStart,
    ).not.toHaveBeenCalled();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
  });
});
