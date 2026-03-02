import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useHistory, useDeleteHistoryEntry } from "../hooks/use-history.js";
import { useAuth } from "../hooks/use-auth.js";
import { ContinueWatchingCard } from "../components/continue-watching-card.js";
import { Loader2, History } from "lucide-react";

export const Route = createFileRoute("/profile/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { data: history, isLoading, error } = useHistory();
  const deleteMutation = useDeleteHistoryEntry();

  // Show loading state while checking auth or fetching data
  if (isAuthLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to sign in if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate to="/auth/signin" search={{ redirect: "/profile/history" }} />
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Watch History
          </h1>
          <div className="p-4 border border-red-500/30 bg-red-500/10 rounded-lg">
            <p className="text-red-400">
              Failed to load history. Please try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show empty state
  if (!history || history.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Watch History
          </h1>
          <div className="text-center py-16">
            <History className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <p className="text-xl text-muted-foreground mb-2">
              No watch history yet
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Start watching dramas to see your history
            </p>
            <Link
              to="/dramas"
              className="inline-flex items-center px-6 py-3 text-sm font-medium tracking-wider uppercase text-white bg-primary hover:bg-primary/80 transition-all rounded-sm"
            >
              Browse Dramas
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Transform history items to match ContinueWatchingCard format
  const historyItems = history.map((item) => ({
    historyId: item.id,
    episodeId: item.episode.id,
    dramaId: item.episode.dramaId,
    dramaTitle: item.episode.drama?.title || "Unknown Drama",
    dramaSlug: item.episode.drama?.slug || "",
    posterUrl: item.episode.drama?.posterUrl || null,
    episodeNumber: item.episode.number,
    episodeTitle: item.episode.title,
    progress: item.progress,
    duration: item.episode.duration,
    progressPercent: item.episode.duration
      ? Math.min(100, (item.progress / item.episode.duration) * 100)
      : 0,
    watchedAt: item.watchedAt,
    completed: item.completed,
  }));

  // Count unique dramas for display
  const uniqueDramas = new Set(history.map((item) => item.episode.dramaId));

  // Render history grid
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Watch History
        </h1>
        <p className="text-muted-foreground mb-8">
          {history.length} {history.length === 1 ? "episode" : "episodes"}{" "}
          watched from {uniqueDramas.size}{" "}
          {uniqueDramas.size === 1 ? "drama" : "dramas"}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {historyItems.map((item) => (
            <ContinueWatchingCard
              key={item.historyId}
              item={item}
              onDelete={(historyId) => deleteMutation.mutate(historyId)}
              isDeleting={deleteMutation.isPending}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
