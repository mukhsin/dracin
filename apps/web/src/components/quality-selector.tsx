import { useState, useRef, useEffect } from "react";
import { Settings, Check } from "lucide-react";

export type VideoQuality = "240p" | "360p" | "480p" | "720p" | "1080p" | "4k";

export interface VideoUrls {
  "240p"?: string;
  "360p"?: string;
  "480p"?: string;
  "720p"?: string;
  "1080p"?: string;
  "4k"?: string;
}

interface QualitySelectorProps {
  videoUrls: VideoUrls;
  currentQuality: VideoQuality;
  onQualityChange: (quality: VideoQuality) => void;
  disabled?: boolean;
}

const QUALITY_ORDER: VideoQuality[] = ["4k", "1080p", "720p", "480p", "360p", "240p"];

export function QualitySelector({
  videoUrls,
  currentQuality,
  onQualityChange,
  disabled = false,
}: QualitySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get available qualities sorted from highest to lowest
  const availableQualities = QUALITY_ORDER.filter((quality) => videoUrls[quality]);

  // If no qualities available, don't render
  if (availableQualities.length === 0) {
    return null;
  }

  // Get display label for quality
  const getQualityLabel = (quality: VideoQuality): string => {
    switch (quality) {
      case "4k":
        return "4K";
      case "1080p":
        return "1080p";
      case "720p":
        return "720p HD";
      case "480p":
        return "480p";
      case "360p":
        return "360p";
      case "240p":
        return "240p";
      default:
        return quality;
    }
  };

  // Get badge for quality (HD, 4K)
  const getQualityBadge = (quality: VideoQuality): string | null => {
    switch (quality) {
      case "4k":
        return "4K";
      case "1080p":
      case "720p":
        return "HD";
      default:
        return null;
    }
  };

  const handleQualitySelect = (quality: VideoQuality) => {
    if (quality !== currentQuality) {
      onQualityChange(quality);
    }
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-medium
          transition-all duration-200 ease-out
          ${disabled
            ? "opacity-40 cursor-not-allowed"
            : "hover:bg-white/10 active:scale-95 cursor-pointer"
          }
          text-white/90 hover:text-white
        `}
        aria-label="Video quality settings"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Settings className="w-4 h-4" />
        <span className="hidden sm:inline">{getQualityLabel(currentQuality)}</span>
        <span className="sm:hidden">{getQualityBadge(currentQuality) || getQualityLabel(currentQuality)}</span>
      </button>

      {isOpen && (
        <div
          className="absolute bottom-full right-0 mb-2 w-40 py-1 rounded-lg overflow-hidden
                     bg-black/90 backdrop-blur-md border border-white/10
                     shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200"
          role="listbox"
          aria-label="Select video quality"
        >
          <div className="px-3 py-2 text-xs font-medium text-white/50 uppercase tracking-wider border-b border-white/10">
            Quality
          </div>
          {availableQualities.map((quality) => {
            const isActive = quality === currentQuality;
            const badge = getQualityBadge(quality);

            return (
              <button
                key={quality}
                type="button"
                onClick={() => handleQualitySelect(quality)}
                className={`
                  w-full px-3 py-2.5 flex items-center justify-between
                  text-sm transition-colors duration-150
                  ${isActive
                    ? "bg-white/10 text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                  }
                `}
                role="option"
                aria-selected={isActive}
              >
                <span className="flex items-center gap-2">
                  {getQualityLabel(quality)}
                  {badge && (
                    <span className="text-[10px] px-1 py-0.5 rounded bg-primary/20 text-primary font-semibold">
                      {badge}
                    </span>
                  )}
                </span>
                {isActive && <Check className="w-4 h-4 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
