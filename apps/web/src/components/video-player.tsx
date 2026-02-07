import { useState, useRef, useCallback, useEffect } from "react";
import { VideoControls } from "./video-controls.js";
import type { VideoQuality, VideoUrls } from "./quality-selector.js";

interface VideoPlayerProps {
  episodeId: string;
  videoUrls?: VideoUrls;
  title?: string;
  posterUrl?: string;
  autoPlay?: boolean;
  startTime?: number;
}

export function VideoPlayer({
  episodeId,
  videoUrls: propVideoUrls,
  title,
  posterUrl,
  autoPlay = false,
  startTime = 0,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const videoUrls: VideoUrls = propVideoUrls || {};

  const [currentQuality, setCurrentQuality] = useState<VideoQuality>("1080p");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(startTime);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [isVertical, setIsVertical] = useState(true); // Default to vertical for mobile-first

  // Auto-hide controls timer
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Video event handlers
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setDuration(video.duration);
    setIsLoading(false);

    // Detect if video is vertical (portrait)
    const isPortrait = video.videoHeight > video.videoWidth;
    setIsVertical(isPortrait);

    // Set initial time
    if (startTime > 0) {
      video.currentTime = startTime;
    }
  }, [startTime]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setCurrentTime(video.currentTime);

    // Update buffered amount
    if (video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      setBuffered(bufferedEnd);
    }
  }, []);

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
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

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

  // Control handlers
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
  }, []);

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

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Auto-hide controls
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  // Touch/double-tap handlers
  const lastTapRef = useRef(0);
  const handleContainerClick = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // Prevent if clicking on controls
      const target = e.target as HTMLElement;
      if (target.closest("[data-controls]")) return;

      const now = Date.now();
      const timeSinceLastTap = now - lastTapRef.current;

      if (timeSinceLastTap < 300) {
        // Double tap - skip forward/backward based on position
        const container = containerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const x =
            "touches" in e
              ? e.touches[0].clientX
              : (e as React.MouseEvent).clientX;
          const relativeX = x - rect.left;
          const isRightSide = relativeX > rect.width / 2;

          // Skip 10s forward or backward
          const skipTime = isRightSide ? 10 : -10;
          handleSeek(Math.max(0, Math.min(duration, currentTime + skipTime)));
        }
      } else {
        // Single tap - toggle play or show controls
        if (!showControls) {
          showControlsTemporarily();
        } else {
          togglePlay();
        }
      }

      lastTapRef.current = now;
    },
    [
      currentTime,
      duration,
      handleSeek,
      showControls,
      showControlsTemporarily,
      togglePlay,
    ],
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Get current video URL
  const currentVideoUrl = videoUrls[currentQuality];

  // Determine aspect ratio class based on orientation
  const aspectRatioClass = isVertical
    ? "aspect-[9/16] max-h-[80vh]" // Vertical/mobile
    : "aspect-video"; // Horizontal/desktop

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-black overflow-hidden rounded-xl shadow-2xl ${aspectRatioClass}`}
      onClick={handleContainerClick}
      onTouchStart={handleContainerClick}
    >
      {/* Video element */}
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

      {/* Error overlay */}
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
            <p className="text-white font-medium mb-3">{error}</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setError(null);
                videoRef.current?.load();
              }}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Custom controls */}
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
        onShowControls={showControlsTemporarily}
        isVertical={isVertical}
      />
    </div>
  );
}

export default VideoPlayer;
