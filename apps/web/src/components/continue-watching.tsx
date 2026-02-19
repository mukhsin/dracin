import { Play, Clock, Trash2, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import {
  useContinueWatching,
  useDeleteHistoryEntry,
} from "../hooks/use-history";

interface ContinueWatchingProps {
  maxItems?: number;
  showTitle?: boolean;
}

export function ContinueWatching({
  maxItems = 6,
  showTitle = true,
}: ContinueWatchingProps) {
  const { data: items, isLoading, error } = useContinueWatching();
  const deleteMutation = useDeleteHistoryEntry();

  if (isLoading) {
    return (
      <div className="w-full py-8">
        {showTitle && (
          <h2 className="text-xl font-semibold mb-4">Continue Watching</h2>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-muted rounded-lg h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full py-8">
        {showTitle && (
          <h2 className="text-xl font-semibold mb-4">Continue Watching</h2>
        )}
        <p className="text-muted-foreground">
          Failed to load continue watching.
        </p>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return null;
  }

  const displayItems = items.slice(0, maxItems);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full py-8">
      {showTitle && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Continue Watching</h2>
          {items.length > maxItems && (
            <Link
              to="/history"
              className="text-sm text-primary hover:underline"
            >
              View All
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayItems.map((item) => (
          <div
            key={item.historyId}
            className="group relative bg-card rounded-lg border overflow-hidden hover:shadow-md transition-shadow"
          >
            <Link to={`/watch/${item.episodeId}`}>
              <div className="flex gap-3 p-3">
                <div className="relative w-24 h-16 flex-shrink-0 bg-muted rounded overflow-hidden">
                  {item.posterUrl ? (
                    <Image
                      src={item.posterUrl}
                      alt={item.dramaTitle}
                      layout="fullWidth"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Play className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-8 h-8 text-white fill-white" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">
                    {item.dramaTitle}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Episode {item.episodeNumber}
                    {item.episodeTitle && ` - ${item.episodeTitle}`}
                  </p>

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
                        {item.duration
                          ? formatDuration(item.duration)
                          : "--:--"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            <button
              onClick={() => deleteMutation.mutate(item.historyId)}
              disabled={deleteMutation.isPending}
              className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100
                         hover:bg-destructive/10 hover:text-destructive transition-all"
              title="Remove from continue watching"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>

            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted">
              <div
                className="h-full bg-primary"
                style={{ width: `${item.progressPercent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
