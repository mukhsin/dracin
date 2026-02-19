import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { useDramaWithEpisodes } from "../hooks/use-drama-with-episodes.js";
import { AlertCircle, ArrowLeft, Film } from "lucide-react";
import { formatDramaPlayCount } from "../hooks/use-drama.js";
import { WatchlistButton } from "../components/watchlist-button.js";
import { FavouritesButton } from "../components/favourites-button.js";

export const Route = createFileRoute("/dramas/$dramaId")({
  component: DramaDetailsPage,
});

function EpisodeCard({
  episode,
  searchQuery,
}: {
  episode: any;
  searchQuery?: string;
}) {
  return (
    <Link
      to="/watch/$episodeId"
      params={{ episodeId: episode.id }}
      state={searchQuery ? { searchQuery } : undefined}
      className="group bg-card rounded-lg border aspect-square flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-all"
    >
      <span className="text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors">
        {episode.number}
      </span>
    </Link>
  );
}

function DramaDetailsPage() {
  const { dramaId } = Route.useParams();
  const location = useLocation();
  const search = location.state?.searchQuery || "";
  const { data, isLoading, error } = useDramaWithEpisodes(dramaId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="bg-muted rounded-xl h-64 w-full mb-6"></div>
            <div className="space-y-4">
              <div className="bg-muted rounded-lg h-8 w-3/4"></div>
              <div className="bg-muted rounded-lg h-4 w-full"></div>
              <div className="bg-muted rounded-lg h-4 w-5/6"></div>
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="bg-muted rounded-lg h-12"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center max-w-md">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                Failed to load drama details
              </h2>
              <p className="text-muted-foreground mb-6">
                {error instanceof Error
                  ? error.message
                  : "Unknown error occurred"}
              </p>
              <Link
                to="/dramas"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                state={search ? { searchQuery: search } : undefined}
                resetScroll={true}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dramas
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center max-w-md">
              <Film className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Drama not found</h2>
              <p className="text-muted-foreground mb-6">
                The drama you're looking for doesn't exist or has been removed.
              </p>
              <Link
                to="/dramas"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                state={search ? { searchQuery: search } : undefined}
                resetScroll={true}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dramas
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const {
    title,
    description,
    posterUrl,
    language,
    status,
    episodes,
    playCount,
  } = data;

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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            to="/dramas"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            state={search ? { searchQuery: search } : undefined}
            resetScroll={true}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dramas
          </Link>
        </div>

        {/* Hero Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-0 md:mb-12">
          {/* Poster */}
          <div className="lg:col-span-1">
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl shadow-2xl lg:h-full">
              {posterUrl ? (
                <img
                  src={posterUrl}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Film className="w-16 h-16 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="md:col-span-1 lg:col-span-2 flex flex-col">
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
                {title}
              </h1>

              <div className="flex flex-wrap items-center gap-3 mb-6">
                {status && (
                  <span
                    className={`text-sm px-3 py-1.5 rounded-full font-medium ${getStatusColor(status)}`}
                  >
                    {status.toUpperCase()}
                  </span>
                )}
                {language && (
                  <span className="bg-muted text-muted-foreground text-sm px-3 py-1.5 rounded-full">
                    {language.toUpperCase()}
                  </span>
                )}
                {episodes && (
                  <span className="bg-muted text-muted-foreground text-sm px-3 py-1.5 rounded-full flex items-center gap-1">
                    <Film className="w-3 h-3" />
                    {episodes.length} Episodes
                  </span>
                )}
                {playCount && (
                  <span className="text-muted-foreground text-sm">
                    {formatDramaPlayCount(playCount)}
                  </span>
                )}
                {/*{episodes && episodes.length > 0 && (
                  <WatchlistButton
                    dramaId={dramaId}
                    variant="outline"
                    size="sm"
                  />
                )}
                {episodes && episodes.length > 0 && (
                  <FavouritesButton
                    dramaId={dramaId}
                    variant="outline"
                    size="sm"
                  />
                )}*/}
              </div>

              {description && (
                <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                  {description}
                </p>
              )}
            </div>

            <div className="hidden lg:block overflow-hidden">
              <div className="flex items-center gap-3 mb-4">
                <Film className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold">Episodes</h2>
                <span className="text-muted-foreground">
                  ({episodes?.length || 0})
                </span>
              </div>

              {episodes && episodes.length > 0 ? (
                <div className="overflow-y-auto max-h-[calc(100vh-400px)] pr-2">
                  <div className="grid grid-cols-10 gap-2">
                    {episodes.map((episode) => (
                      <EpisodeCard
                        key={episode.id}
                        episode={episode}
                        searchQuery={search}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-muted/50 rounded-xl">
                  <Film className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No episodes available yet
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:hidden">
          <div className="flex items-center gap-3 mb-6">
            <Film className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Episodes</h2>
            <span className="text-muted-foreground">
              ({episodes?.length || 0})
            </span>
          </div>

          {episodes && episodes.length > 0 ? (
            <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
              {episodes.map((episode) => (
                <EpisodeCard
                  key={episode.id}
                  episode={episode}
                  searchQuery={search}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/50 rounded-xl">
              <Film className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No episodes available yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DramaDetailsPage;
