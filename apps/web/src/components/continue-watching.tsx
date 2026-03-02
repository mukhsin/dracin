import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import {
  useContinueWatching,
  useDeleteHistoryEntry,
} from "../hooks/use-history.js";
import { ContinueWatchingCard } from "./continue-watching-card.js";

interface ContinueWatchingItem {
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
}

interface ContinueWatchingProps {
  showTitle?: boolean;
  isAuthenticated?: boolean;
}

export function ContinueWatching({
  showTitle = true,
  isAuthenticated = true,
}: ContinueWatchingProps) {
  const { data: items, isLoading, error } = useContinueWatching(isAuthenticated);
  const deleteMutation = useDeleteHistoryEntry();

  if (isLoading) {
    return null;
  }

  if (error) {
    return null;
  }

  if (!items || items.length === 0) {
    return null;
  }

  // Filter to show only last episode per drama, max 3 dramas
  const dramaMap = new Map<
    string,
    { latestItem: ContinueWatchingItem; watchedAt: string }
  >();

  items.forEach((item: ContinueWatchingItem) => {
    const existing = dramaMap.get(item.dramaId);
    if (!existing || item.watchedAt > existing.watchedAt) {
      dramaMap.set(item.dramaId, {
        latestItem: item,
        watchedAt: item.watchedAt,
      });
    }
  });

  // Sort dramas by most recent watchedAt and take top 3
  const sortedDramas = Array.from(dramaMap.entries())
    .sort((a, b) => b[1].watchedAt.localeCompare(a[1].watchedAt))
    .slice(0, 3);

  // Get only the latest episode for each of the top 3 dramas
  const displayItems = sortedDramas.map((d) => d[1].latestItem);

  return (
    <section className="py-6">
      {showTitle && (
        <div className="flex items-center justify-between mb-4 ">
          <h2 className="text-xl font-semibold">Continue Watching</h2>
          {displayItems.length > 0 && (
            <Link
              to="/profile/history"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              See all
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      )}

      <div className=" grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayItems.map((item: ContinueWatchingItem) => (
          <ContinueWatchingCard
            key={item.historyId}
            item={item}
            onDelete={(historyId) => deleteMutation.mutate(historyId)}
            isDeleting={deleteMutation.isPending}
          />
        ))}
      </div>
    </section>
  );
}
