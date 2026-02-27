import { useState, useRef, useCallback, useEffect } from "react";
import { VideoControls } from "./video-controls.js";
import type { VideoQuality, VideoUrls } from "./quality-selector.js";
import { decodeVideoUrls } from "../lib/utils.js";
import { useVideoProgress } from "../hooks/use-video-progress.js";

interface VideoPlayerProps {
  videoUrls?: VideoUrls;
  title?: string;
  posterUrl?: string;
  autoPlay?: boolean;
  startTime?: number;
  episodeId?: string;
}

export function VideoPlayer({
  videoUrls: propVideoUrls,
  title,
  posterUrl,
  autoPlay = false,
  startTime = 0,
  episodeId,
}: VideoPlayerProps) {
  const DOUBLE_TAP_THRESHOLD_MS = 300;
  const DOUBLE_TAP_SEEK_SECONDS = 5;
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const videoUrls: VideoUrls = propVideoUrls
    ? (decodeVideoUrls(
        propVideoUrls as Record<string, string | undefined>,
      ) as VideoUrls)
    : {};

  // Video progress tracking (only if episodeId is provided)
  const progressTracking = useVideoProgress({
    episodeId: episodeId || "",
    enabled: !!episodeId,
  });

  const [currentQuality, setCurrentQuality] = useState<VideoQuality>("1080p");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(startTime > 0 ? startTime : progressTracking.resumeTime);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [isVertical, setIsVertical] = useState(true);

  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const singleTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMouseOverControlsRef = useRef(false);
  const lastActivityRef = useRef(Date.now());

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setDuration(video.duration);
    setIsLoading(false);

    const isPortrait = video.videoHeight > video.videoWidth;
    setIsVertical(isPortrait);

    // Set initial time from props or resume from progress tracking
    const initialTime = startTime > 0 ? startTime : progressTracking.resumeTime;
    if (initialTime > 0 && initialTime < video.duration * 0.95) {
      video.currentTime = initialTime;
      setCurrentTime(initialTime);
    }

    // Update duration in progress tracking
    progressTracking.updateDuration(video.duration);
  }, [startTime, progressTracking]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setCurrentTime(video.currentTime);

    // Update buffered amount
    if (video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      setBuffered(bufferedEnd);
    }

    // Sync progress to tracking
    progressTracking.updateCurrentTime(video.currentTime);
  }, [progressTracking]);

  const handleWaiting = useCallback(() => {
    setIsLoading(true);
  }, []);

  const handleCanPlay = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    // Sync progress when pausing
    if (episodeId) {
      progressTracking.syncProgress(true);
    }
  }, [episodeId, progressTracking]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    // Mark as completed when video ends
    if (episodeId && videoRef.current) {
      progressTracking.updateCurrentTime(videoRef.current.duration);
      progressTracking.syncProgress(true);
    }
  }, [episodeId, progressTracking]);

  const handleError = useCallback(() => {
    const video = videoRef.current;
    if (video?.error) {
      const errorMessages: Record<number, string> = {
        1: "Video loading aborted",
        2: "Network error - check your connection",
        3: "Video decoding error",
        4: "Video format not supported",
      };
      setError(errorMessages[video.error.code] || "Unknown video error");
      setIsLoading(false);
    }
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch((err) => {
        console.error("Failed to play video:", err);
        setError("Failed to play video. Tap to retry.");
      });
    }
  }, [isPlaying]);

  const handleSeek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = time;
    setCurrentTime(time);
    progressTracking.updateCurrentTime(time);
  }, [progressTracking]);

  const handleVolumeChange = useCallback(
    (newVolume: number) => {
      const video = videoRef.current;
      if (!video) return;

      video.volume = newVolume;
      setVolume(newVolume);

      if (newVolume > 0 && isMuted) {
        video.muted = false;
        setIsMuted(false);
      }
    },
    [isMuted],
  );

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const showControlsTemporarily = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowControls(true);

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    if (isPlaying && !isMouseOverControlsRef.current) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  const handleMouseMove = useCallback(() => {
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  const handleControlsMouseEnter = useCallback(() => {
    isMouseOverControlsRef.current = true;
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
  }, []);

  const handleControlsMouseLeave = useCallback(() => {
    isMouseOverControlsRef.current = false;
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      showControlsTemporarily();
    } else {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    }
  }, [isPlaying, showControlsTemporarily]);

  const lastTapRef = useRef(0);
  const handleContainerInteraction = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-controls]")) return;

      const now = Date.now();
      const timeSinceLastTap = now - lastTapRef.current;

      if (timeSinceLastTap < DOUBLE_TAP_THRESHOLD_MS) {
        if (singleTapTimeoutRef.current) {
          clearTimeout(singleTapTimeoutRef.current);
          singleTapTimeoutRef.current = null;
        }

        const container = containerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const relativeX = e.clientX - rect.left;
          const isRightSide = relativeX > rect.width / 2;

          const skipTime = isRightSide
            ? DOUBLE_TAP_SEEK_SECONDS
            : -DOUBLE_TAP_SEEK_SECONDS;
          handleSeek(Math.max(0, Math.min(duration, currentTime + skipTime)));
        }
      } else {
        if (singleTapTimeoutRef.current) {
          clearTimeout(singleTapTimeoutRef.current);
        }

        singleTapTimeoutRef.current = setTimeout(() => {
          togglePlay();
          singleTapTimeoutRef.current = null;
        }, DOUBLE_TAP_THRESHOLD_MS);
      }

      lastTapRef.current = now;
    },
    [
      currentTime,
      duration,
      DOUBLE_TAP_SEEK_SECONDS,
      DOUBLE_TAP_THRESHOLD_MS,
      handleSeek,
      togglePlay,
    ],
  );

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
      }
    };
  }, []);

  const currentVideoUrl = videoUrls[currentQuality];
  const aspectRatioClass = isVertical
    ? "aspect-[9/16] max-h-[80vh]"
    : "aspect-video";

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-black overflow-hidden rounded-xl shadow-2xl ${aspectRatioClass}`}
      onPointerDown={handleContainerInteraction}
      onMouseMove={handleMouseMove}
    >
      <video
        ref={videoRef}
        src={currentVideoUrl}
        poster={posterUrl}
        autoPlay={autoPlay}
        preload="metadata"
        playsInline
        crossOrigin="anonymous"
        className="w-full h-full object-contain"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={handleError}
      >
        <p className="text-white text-center p-4">
          Your browser does not support the video tag.
        </p>
      </video>

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20">
          <div className="text-center px-4">
            <div className="text-red-400 mb-3">
              <svg
                className="w-12 h-12 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <p className="text-white font-medium mb-4">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setError(null);
                  videoRef.current?.load();
                }}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.reload();
                }}
                className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      )}

      <VideoControls
        videoRef={videoRef}
        videoUrls={videoUrls}
        currentQuality={currentQuality}
        onQualityChange={setCurrentQuality}
        isPlaying={isPlaying}
        onPlayPause={togglePlay}
        currentTime={currentTime}
        duration={duration}
        buffered={buffered}
        volume={volume}
        isMuted={isMuted}
        onVolumeChange={handleVolumeChange}
        onMuteToggle={toggleMute}
        onSeek={handleSeek}
        isFullscreen={isFullscreen}
        onFullscreenToggle={toggleFullscreen}
        isLoading={isLoading}
        title={title}
        showControls={showControls}
        isVertical={isVertical}
        onMouseEnter={handleControlsMouseEnter}
        onMouseLeave={handleControlsMouseLeave}
      />
    </div>
  );
}

export default VideoPlayer;
