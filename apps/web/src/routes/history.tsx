import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import {
  useHistory,
  useDeleteHistoryEntry,
  useClearHistory,
} from "../hooks/use-history.js";
import {
  Trash2,
  Loader2,
  History,
  Play,
  AlertTriangle,
  Film,
} from "lucide-react";

export const Route = createFileRoute("/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const { data: history, isLoading, error } = useHistory();
  const deleteMutation = useDeleteHistoryEntry();
  const clearMutation = useClearHistory();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleDelete = (historyId: string) => {
    setDeletingId(historyId);
    deleteMutation.mutate(historyId, {
      onSettled: () => setDeletingId(null),
    });
  };

  const handleClear = () => {
    clearMutation.mutate(undefined, {
      onSuccess: () => setShowClearConfirm(false),
    });
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="h-10 w-32 bg-muted animate-pulse rounded" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <p className="text-destructive mb-4">Failed to load history.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
              <History className="w-10 h-10 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-semibold mb-2">No Watch History</h1>
            <p className="text-muted-foreground mb-6">
              Start watching dramas to see your history here.
            </p>
            <Link
              to="/dramas"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Film className="w-4 h-4" />
              Start Watching
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Watch History</h1>
            <p className="text-muted-foreground mt-1">
              {history.length} {history.length === 1 ? "episode" : "episodes"}{" "}
              watched
            </p>
          </div>

          <button
            onClick={() => setShowClearConfirm(true)}
            disabled={clearMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 text-destructive
                       border border-destructive/30 rounded-lg
                       hover:bg-destructive/10 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {clearMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Clear History
          </button>
        </div>

        {showClearConfirm && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Clear all watch history?</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This action cannot be undone. All your watch progress will be
                  permanently deleted.
                </p>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleClear}
                    disabled={clearMutation.isPending}
                    className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg
                               hover:bg-destructive/90 transition-colors
                               disabled:opacity-50"
                  >
                    {clearMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                        Clearing...
                      </>
                    ) : (
                      "Yes, Clear All"
                    )}
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    disabled={clearMutation.isPending}
                    className="px-4 py-2 border rounded-lg hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {history.map((item) => (
            <div
              key={item.id}
              className="group flex gap-4 p-4 bg-card rounded-xl border hover:shadow-md transition-all"
            >
              <Link to={`/watch/${item.episode.id}`} className="flex-shrink-0">
                <div className="w-32 aspect-video bg-muted rounded-lg overflow-hidden relative">
                  {/* @ts-expect-error */}
                  {item.episode.drama?.posterUrl ? (
                    <Image
                      /* @ts-expect-error */
                      src={item.episode.drama.posterUrl}
                      /* @ts-expect-error */
                      alt={item.episode.drama.title}
                      layout="fullWidth"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-10 h-10 text-white fill-white" />
                  </div>
                </div>
              </Link>

              <div className="flex-1 min-w-0">
                <Link
                  /* @ts-expect-error */
                  to={`/dramas/${item.episode.drama?.slug}`}
                  className="font-semibold hover:text-primary transition-colors line-clamp-1"
                >
                  {/* @ts-expect-error */}
                  {item.episode.drama?.title}
                </Link>

                <p className="text-sm text-muted-foreground mt-1">
                  Episode {item.episode.number}
                  {item.episode.title && ` - ${item.episode.title}`}
                </p>

                <div className="flex items-center gap-4 mt-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${
                            item.episode.duration
                              ? Math.min(
                                  100,
                                  (item.progress / item.episode.duration) * 100,
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-muted-foreground">
                      {formatDuration(item.progress)} /
                      {item.episode.duration
                        ? formatDuration(item.episode.duration)
                        : "--:--"}
                    </span>
                  </div>

                  {item.completed && (
                    <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full">
                      Completed
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  Watched on {formatDate(item.watchedAt)}
                </p>
              </div>

              <button
                onClick={() => handleDelete(item.id)}
                disabled={deletingId === item.id}
                className="flex-shrink-0 p-2 rounded-lg opacity-0 group-hover:opacity-100
                           hover:bg-destructive/10 hover:text-destructive
                           transition-all"
                title="Remove from history"
              >
                {deletingId === item.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
