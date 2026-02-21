import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
} from "lucide-react";
import {
  QualitySelector,
  type VideoQuality,
  type VideoUrls,
} from "./quality-selector.js";

interface VideoControlsProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoUrls: VideoUrls;
  currentQuality: VideoQuality;
  onQualityChange: (quality: VideoQuality) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  currentTime: number;
  duration: number;
  buffered: number;
  volume: number;
  isMuted: boolean;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onSeek: (time: number) => void;
  isFullscreen: boolean;
  onFullscreenToggle: () => void;
  isLoading?: boolean;
  title?: string;
  showControls: boolean;
  onShowControls: () => void;
  isVertical?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds === Infinity) return "0:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function VideoControls({
  videoUrls,
  currentQuality,
  onQualityChange,
  isPlaying,
  onPlayPause,
  currentTime,
  duration,
  buffered,
  volume,
  isMuted,
  onVolumeChange,
  onMuteToggle,
  onSeek,
  isFullscreen,
  onFullscreenToggle,
  isLoading = false,
  title,
  showControls,
  onShowControls,
  onMouseEnter,
  onMouseLeave,
}: VideoControlsProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  // Handle progress bar click/drag
  const handleProgressInteraction = useCallback(
    (clientX: number) => {
      if (!progressRef.current || duration === 0) return;

      const rect = progressRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const newTime = pos * duration;
      onSeek(newTime);
    },
    [duration, onSeek],
  );

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      handleProgressInteraction(e.clientX);
    },
    [handleProgressInteraction],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      setIsDragging(true);
      handleProgressInteraction(e.touches[0].clientX);
    },
    [handleProgressInteraction],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (isDragging) {
        handleProgressInteraction(e.touches[0].clientX);
      }
    },
    [isDragging, handleProgressInteraction],
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Skip forward/backward
  const skip = useCallback(
    (seconds: number) => {
      const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
      onSeek(newTime);
    },
    [currentTime, duration, onSeek],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          onPlayPause();
          break;
        case "ArrowLeft":
          e.preventDefault();
          skip(-10);
          break;
        case "ArrowRight":
          e.preventDefault();
          skip(10);
          break;
        case "ArrowUp":
          e.preventDefault();
          onVolumeChange(Math.min(1, volume + 0.1));
          break;
        case "ArrowDown":
          e.preventDefault();
          onVolumeChange(Math.max(0, volume - 0.1));
          break;
        case "f":
          e.preventDefault();
          onFullscreenToggle();
          break;
        case "m":
          e.preventDefault();
          onMuteToggle();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    onPlayPause,
    skip,
    onVolumeChange,
    volume,
    onFullscreenToggle,
    onMuteToggle,
  ]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  if (!showControls) {
    return (
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={onShowControls}
        data-controls="true"
      />
    );
  }

  return (
    <div
      className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/40 to-transparent"
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      data-controls="true"
    >
      {/* Title */}
      {title && (
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent">
          <h2 className="text-white font-medium text-base sm:text-lg truncate">
            {title}
          </h2>
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Big center play button (mobile-friendly) */}
      {!isPlaying && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            type="button"
            onClick={onPlayPause}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center
                       hover:bg-white/30 active:scale-95 transition-all"
            aria-label="Play"
          >
            <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white fill-white ml-1" />
          </button>
        </div>
      )}

      {/* Controls container */}
      <div className="relative z-10 px-3 sm:px-4 pb-3 sm:pb-4 pt-6 sm:pt-8">
        {/* Progress bar - Bigger for touch */}
        <div
          ref={progressRef}
          className="group relative h-3 sm:h-2 mb-4 sm:mb-3 cursor-pointer touch-none"
          onClick={handleProgressClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Background track */}
          <div className="absolute inset-0 bg-white/20 rounded-full" />

          {/* Buffered progress */}
          <div
            className="absolute inset-y-0 left-0 bg-white/30 rounded-full transition-all duration-150"
            style={{ width: `${bufferedPercent}%` }}
          />

          {/* Played progress */}
          <div
            className="absolute inset-y-0 left-0 bg-primary transition-all duration-150"
            style={{ width: `${progressPercent}%`, borderRadius: "0" }}
          />

          {/* Scrubber handle - Bigger for touch */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-5 h-5 sm:w-4 sm:h-4 bg-white rounded-full shadow-lg
                       opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150
                       transform -translate-x-1/2 active:scale-125"
            style={{ left: `${progressPercent}%` }}
          >
            <div
              className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90
                            text-white text-xs rounded opacity-0 group-hover:opacity-100
                            transition-opacity whitespace-nowrap pointer-events-none"
            >
              {formatTime(currentTime)}
            </div>
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between">
          {/* Left controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Play/Pause - Bigger button */}
            <button
              type="button"
              onClick={onPlayPause}
              className="p-3 sm:p-2 rounded-full text-white hover:bg-white/10 transition-colors
                         active:scale-95 transform"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-7 h-7 sm:w-6 sm:h-6" />
              ) : (
                <Play className="w-7 h-7 sm:w-6 sm:h-6 fill-current" />
              )}
            </button>

            {/* Skip backward - Hidden on small mobile */}
            <button
              type="button"
              onClick={() => skip(-10)}
              className="p-2 sm:p-2 rounded-full text-white hover:bg-white/10 transition-colors
                         active:scale-95 transform hidden xs:block"
              aria-label="Skip backward 10 seconds"
            >
              <SkipBack className="w-5 h-5 sm:w-5 sm:h-5" />
            </button>

            {/* Skip forward - Hidden on small mobile */}
            <button
              type="button"
              onClick={() => skip(10)}
              className="p-2 sm:p-2 rounded-full text-white hover:bg-white/10 transition-colors
                         active:scale-95 transform hidden xs:block"
              aria-label="Skip forward 10 seconds"
            >
              <SkipForward className="w-5 h-5 sm:w-5 sm:h-5" />
            </button>

            {/* Volume control */}
            <div
              className="flex items-center gap-1 group"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <button
                type="button"
                onClick={onMuteToggle}
                className="p-2 sm:p-2 rounded-full text-white hover:bg-white/10 transition-colors
                           active:scale-95 transform"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 sm:w-5 sm:h-5" />
                ) : (
                  <Volume2 className="w-5 h-5 sm:w-5 sm:h-5" />
                )}
              </button>

              {/* Volume slider - Desktop only */}
              <div
                className={`
                  hidden sm:block overflow-hidden transition-all duration-200 ease-out
                  ${showVolumeSlider ? "w-20 opacity-100" : "w-0 opacity-0"}
                `}
              >
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-primary"
                  aria-label="Volume"
                />
              </div>
            </div>

            {/* Time display */}
            <div className="text-sm font-medium tabular-nums ml-1 sm:ml-2">
              <span className="text-primary">{formatTime(currentTime)}</span>
              <span className="text-white/50 mx-1">/</span>
              <span className="text-white/70">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1">
            {/* Quality selector */}
            <QualitySelector
              videoUrls={videoUrls}
              currentQuality={currentQuality}
              onQualityChange={onQualityChange}
              disabled={isLoading}
            />

            {/* Fullscreen */}
            <button
              type="button"
              onClick={onFullscreenToggle}
              className="p-2 sm:p-2 rounded-full text-white hover:bg-white/10 transition-colors
                         active:scale-95 transform"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5 sm:w-5 sm:h-5" />
              ) : (
                <Maximize className="w-5 h-5 sm:w-5 sm:h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
