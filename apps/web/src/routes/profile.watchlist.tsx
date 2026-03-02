import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useWatchlist } from "../hooks/use-watchlist.js";
import { useAuth } from "../hooks/use-auth.js";
import DramaCard from "../components/drama-card.js";
import { Bookmark } from "lucide-react";
import {
  PageHeaderSkeleton,
  ProfileGridSkeleton,
} from "../components/skeletons.js";
import { useEffect, useState } from "react";
import { MIN_SKELETON_DELAY_MS } from "../lib/constants";

export const Route = createFileRoute("/profile/watchlist")({
  component: WatchlistPage,
});

function WatchlistPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { data: watchlist, isLoading, error } = useWatchlist();
  const [minDelayDone, setMinDelayDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(
      () => setMinDelayDone(true),
      MIN_SKELETON_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, []);

  const showSkeleton = !minDelayDone || isAuthLoading || isLoading;

  // Show loading skeleton while checking auth or fetching data
  if (showSkeleton) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12">
          <PageHeaderSkeleton />
          <ProfileGridSkeleton />
        </div>
      </div>
    );
  }

  // Redirect to sign in if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate to="/auth/signin" search={{ redirect: "/profile/watchlist" }} />
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            My Watchlist
          </h1>
          <div className="p-4 border border-red-500/30 bg-red-500/10 rounded-lg">
            <p className="text-red-400">
              Failed to load watchlist. Please try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show empty state
  if (!watchlist || watchlist.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            My Watchlist
          </h1>
          <div className="text-center py-16">
            <Bookmark className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <p className="text-xl text-muted-foreground mb-2">
              No watchlist yet
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Save dramas to watch later
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

  // Render watchlist/watchlist grid
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          My Watchlist
        </h1>
        <p className="text-muted-foreground mb-8">
          {watchlist.length} {watchlist.length === 1 ? "drama" : "dramas"} in
          your watchlist
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {watchlist.map((item) => (
            <DramaCard
              key={item.id}
              drama={{
                ...item.drama,
                description: item.drama.description ?? undefined,
                posterUrl: item.drama.posterUrl ?? undefined,
              }}
              referrer="/profile/watchlist"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
