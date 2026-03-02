import { Play } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ProgressiveImage } from "./progressive-image";
import { formatDramaPlayCount } from "../hooks/use-drama.js";

interface DramaCardProps {
  drama: {
    id: string;
    title: string;
    slug: string;
    description?: string | null;
    posterUrl?: string | null;
    playCount?: string | number | null;
    language?: string | null;
    status?: string | null;
  };
  totalEpisodes?: number;
  searchQuery?: string;
  referrer?: string;
}

function DramaCard({
  drama,
  totalEpisodes,
  searchQuery,
  referrer,
}: DramaCardProps) {
  const { title, slug, posterUrl, playCount, language } = drama;

  // Handle missing poster URL
  const hasPoster = posterUrl && posterUrl.trim() !== "";
  const languageCode = language?.toLowerCase() || "unknown";

  // Build state object
  const linkState: { searchQuery?: string; referrer?: string } = {};
  if (searchQuery) linkState.searchQuery = searchQuery;
  if (referrer) linkState.referrer = referrer;

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
      to="/dramas/$dramaId"
      params={{ dramaId: slug }}
      state={Object.keys(linkState).length > 0 ? linkState : undefined}
      className="group relative bg-card overflow-hidden hover:shadow-lg hover:scale-105 transition-all duration-300 h-full"
    >
      {/* Image Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        {hasPoster ? (
          <ProgressiveImage
            src={posterUrl!}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Play className="w-12 h-12 text-muted-foreground" />
          </div>
        )}

        {/* Status Badge */}
        {drama.status && (
          <div className="absolute top-2 left-2">
            <span className="bg-black/70 text-white text-xs px-2 py-1">
              {drama.status.toUpperCase()}
            </span>
          </div>
        )}

        {language && (
          <div className="absolute top-2 right-2">
            <span className="bg-black/70 text-white text-xs px-2 py-1">
              {languageBadges[languageCode] || languageCode.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="py-3 flex flex-col h-24">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base mb-1 line-clamp-2">{title}</h3>
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
