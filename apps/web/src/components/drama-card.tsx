import { Play } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { formatDramaPlayCount } from "../hooks/use-drama.js";

interface DramaCardProps {
  drama: {
    id: string;
    title: string;
    slug: string;
    description?: string;
    posterUrl?: string;
    playCount?: string;
    language?: string;
    status?: string;
  };
  totalEpisodes?: number;
}

function DramaCard({ drama, totalEpisodes }: DramaCardProps) {
  const { title, slug, posterUrl, playCount, language } = drama;

  // Handle missing poster URL
  const hasPoster = posterUrl && posterUrl.trim() !== "";
  const languageCode = language?.toLowerCase() || "unknown";

  // Language badge mapping
  const languageBadges: Record<string, string> = {
    en: "EN",
    id: "ID",
    es: "ES",
    pt: "PT",
    "zh-cn": "CN",
    "zh-tw": "TW",
    ja: "JP",
    ko: "KR",
    fr: "FR",
    de: "DE",
    ru: "RU",
  };

  return (
    <Link
      to={`/dramas/${slug}`}
      className="group relative bg-card rounded-lg border overflow-hidden hover:shadow-lg hover:scale-105 transition-all duration-300 h-full"
    >
      {/* Image Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        {hasPoster ? (
          <img
            src={posterUrl}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Play className="w-12 h-12 text-muted-foreground" />
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="bg-primary/90 text-white px-4 py-2 rounded-md text-sm font-medium">
              View Details
            </div>
          </div>
        </div>

        {/* Status Badge */}
        {drama.status && (
          <div className="absolute top-2 left-2">
            <span className="bg-black/70 text-white text-xs px-2 py-1 rounded-full">
              {drama.status.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col h-28">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base mb-1 line-clamp-2">{title}</h3>

          {/* Language Badge */}
          {language && (
            <div className="inline-flex items-center gap-1 mb-1">
              <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">
                {languageBadges[languageCode] || languageCode.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <span>{formatDramaPlayCount(playCount)}</span>
          {totalEpisodes !== undefined && totalEpisodes > 0 && (
            <>
              <span className="text-muted-foreground/50">•</span>
              <span>{totalEpisodes} eps</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

export default DramaCard;
