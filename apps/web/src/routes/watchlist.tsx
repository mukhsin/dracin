import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { Heart, Trash2, Play, Clock, Calendar, Film } from "lucide-react";
import { formatDate } from "@repo/shared/utils";
import { requireRouteAuth } from "../lib/route-auth-guard.js";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface WatchlistItem {
  id: string;
  dramaId: string;
  addedAt: string;
  drama: {
    id: string;
    title: string;
    slug: string;
    posterUrl: string | null;
    status: string;
    metadata: {
      releaseYear?: number;
      genre?: string[];
      totalEpisodes?: number;
    };
  };
}

export const Route = createFileRoute("/watchlist")({
  beforeLoad: () => requireRouteAuth("/watchlist"),
  component: WatchlistPage,
});

export function WatchlistPage() {
  const queryClient = useQueryClient();

  const {
    data: watchlistData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["watchlist"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/watchlist`, {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Please sign in to view your watchlist");
        }
        throw new Error("Failed to load watchlist");
      }
      return res.json();
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (dramaId: string) => {
      const res = await fetch(`${API_BASE_URL}/api/watchlist/${dramaId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove from watchlist");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse space-y-4">
              <div className="h-8 w-48 bg-muted rounded"></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-80 bg-muted rounded-lg"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Heart className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {error instanceof Error ? error.message : "Something went wrong"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {error instanceof Error && error.message.includes("sign in")
                ? "You need to be signed in to access your watchlist"
                : "We couldn't load your watchlist. Please try again."}
            </p>
            {error instanceof Error && error.message.includes("sign in") ? (
              <a
                href="/auth/signin"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Sign In
              </a>
            ) : (
              <button
                onClick={() =>
                  queryClient.invalidateQueries({ queryKey: ["watchlist"] })
                }
                className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const items = watchlistData?.data?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
              <Heart className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Your watchlist is empty
            </h2>
            <p className="text-muted-foreground max-w-md mb-8">
              Start adding dramas you want to watch later. They'll appear here
              for easy access.
            </p>
            <Link
              to="/dramas"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Film className="w-4 h-4" />
              Browse Dramas
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
            <h1 className="text-3xl font-bold text-foreground">My Watchlist</h1>
            <p className="text-muted-foreground mt-1">
              {items.length} {items.length === 1 ? "drama" : "dramas"} saved
            </p>
          </div>
          <Link
            to="/dramas"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Film className="w-4 h-4" />
            Browse More
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {(items as WatchlistItem[]).map((item) => (
            <WatchlistCard
              key={item.id}
              item={item}
              onRemove={() => removeMutation.mutate(item.dramaId)}
              isRemoving={removeMutation.isPending}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface WatchlistCardProps {
  item: {
    id: string;
    dramaId: string;
    addedAt: string;
    drama: {
      id: string;
      title: string;
      slug: string;
      posterUrl: string | null;
      status: string;
      metadata: {
        releaseYear?: number;
        genre?: string[];
        totalEpisodes?: number;
      };
    };
  };
  onRemove: () => void;
  isRemoving: boolean;
}

function WatchlistCard({ item, onRemove, isRemoving }: WatchlistCardProps) {
  const { drama, addedAt } = item;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ongoing":
        return "bg-green-500/90 text-white";
      case "completed":
        return "bg-blue-500/90 text-white";
      default:
        return "bg-amber-500/90 text-white";
    }
  };

  return (
    <div className="group relative bg-card rounded-xl overflow-hidden border shadow-sm hover:shadow-lg transition-all hover:-translate-y-1">
      <Link
        to="/dramas/$dramaId"
        params={{ dramaId: drama.slug }}
        className="block"
      >
        <div className="aspect-[2/3] relative overflow-hidden bg-muted">
          {drama.posterUrl ? (
            <Image
              src={drama.posterUrl}
              alt={drama.title}
              layout="fullWidth"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <Play className="w-12 h-12 text-muted-foreground/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="absolute top-2 right-2">
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(drama.status)}`}
            >
              {drama.status}
            </span>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform">
            <span className="inline-flex items-center gap-1 text-white text-sm font-medium">
              <Play className="w-4 h-4" />
              Watch Now
            </span>
          </div>
        </div>
      </Link>

      <div className="p-4">
        <Link to="/dramas/$dramaId" params={{ dramaId: drama.slug }}>
          <h3 className="font-semibold text-foreground line-clamp-1 hover:text-primary transition-colors">
            {drama.title}
          </h3>
        </Link>

        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
          {drama.metadata.releaseYear && (
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {drama.metadata.releaseYear}
            </span>
          )}
          {drama.metadata.totalEpisodes && (
            <span className="flex items-center gap-1">
              <Play size={14} />
              {drama.metadata.totalEpisodes} eps
            </span>
          )}
        </div>

        {drama.metadata.genre && drama.metadata.genre.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {drama.metadata.genre.slice(0, 3).map((g) => (
              <span
                key={g}
                className="px-2 py-0.5 text-xs bg-muted rounded-full text-muted-foreground"
              >
                {g}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock size={12} />
            Added {formatDate(new Date(addedAt), { dateStyle: "medium" })}
          </span>
          <button
            onClick={onRemove}
            disabled={isRemoving}
            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
            aria-label="Remove from watchlist"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
