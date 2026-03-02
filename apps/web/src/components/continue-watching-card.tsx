import { Play, Clock, Trash2, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ProgressiveImage } from "./progressive-image";

interface ContinueWatchingCardProps {
  item: {
    historyId: string;
    episodeId: string;
    dramaId: string;
    dramaTitle: string;
    dramaSlug: string;
    posterUrl: string | null;
    episodeNumber: number;
    episodeTitle: string | null;
    progress: number;
    duration: number | null;
    progressPercent: number;
    watchedAt: string;
    completed: boolean;
  };
  onDelete: (historyId: string) => void;
  isDeleting: boolean;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const formatWatchedTime = (watchedAt: string): string => {
  const watchedDate = new Date(watchedAt);
  const now = new Date();
  const diffMs = now.getTime() - watchedDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  // For older items, show the actual date
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  return watchedDate.toLocaleDateString("en-US", options);
};

export function ContinueWatchingCard({
  item,
  onDelete,
  isDeleting,
}: ContinueWatchingCardProps) {
  // Use proxied poster URL format like other components
  const proxiedPosterUrl = item.dramaSlug
    ? `/api/dramas/${item.dramaSlug}/poster.jpg`
    : item.posterUrl;

  return (
    <div className="group relative ">
      <Link
        to="/dramas/$dramaSlug/$episodeNumber"
        params={{
          dramaSlug: item.dramaSlug,
          episodeNumber: item.episodeNumber.toString(),
        }}
      >
        <div className="flex gap-3">
          <div className="relative w-24 aspect-[2/3] flex-shrink-0 bg-muted overflow-hidden">
            {proxiedPosterUrl ? (
              <ProgressiveImage
                src={proxiedPosterUrl}
                alt={item.dramaTitle}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <Play className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="w-8 h-8 text-white fill-white" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate pr-8">
              {item.dramaTitle}
            </h3>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                Episode {item.episodeNumber}
              </p>
              <span className="text-xs text-muted-foreground/50">•</span>
              <p className="text-xs text-muted-foreground">
                {formatWatchedTime(item.watchedAt)}
              </p>
            </div>

            <div className="mt-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${item.progressPercent}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {item.progressPercent}%
                </span>
              </div>
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>
                  {formatDuration(item.progress)} /{" "}
                  {item.duration ? formatDuration(item.duration) : "--:--"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>

      <button
        onClick={() => onDelete(item.historyId)}
        disabled={isDeleting}
        className="absolute top-0 right-0 rounded-md opacity-100 sm:opacity-0 group-hover:opacity-100
                   hover:bg-destructive/10 hover:text-destructive transition-all"
      >
        {isDeleting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Trash2 className="w-4 h-4" />
        )}
      </button>

      {/*<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted">
        <div
          className="h-full bg-primary"
          style={{ width: `${item.progressPercent + 5}%` }}
        />
      </div>*/}
    </div>
  );
}
