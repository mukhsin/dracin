import { Link, createFileRoute, useLocation } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { VideoPlayer } from "../components/video-player.js";
import type { VideoUrls } from "../components/quality-selector.js";
import type { EpisodeWithNavigation } from "@repo/shared";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const MOCK_EPISODE: EpisodeWithNavigation = {
  id: "test",
  dramaId: "test-drama",
  bookId: null,
  number: 1,
  title: "Test Episode",
  description: "This is a test episode for development.",
  duration: 600,
  videoUrls: {
    "1080p": "/dracin-01.mp4",
    "720p": "/dracin-01.mp4",
    "480p": "/dracin-01.mp4",
  },
  sourceUrl: null,
  createdAt: new Date(),
  drama: {
    id: "test-drama",
    title: "Test Drama",
    slug: "test-drama",
    posterUrl: null,
    totalEpisodes: 12,
  },
  navigation: {
    prevEpisode: null,
    nextEpisode: null,
  },
  video: {
    urls: {
      "1080p": `${API_URL}/api/video/test-drama.1.1080p.mp4`,
      "720p": `${API_URL}/api/video/test-drama.1.720p.mp4`,
      "480p": `${API_URL}/api/video/test-drama.1.480p.mp4`,
    },
  },
};

export const Route = createFileRoute("/watch/$episodeId")({
  component: WatchPage,
});

function WatchPage() {
  const { episodeId } = Route.useParams();
  const location = useLocation();
  const search = location.state?.searchQuery || "";
  const [lastKnownDrama, setLastKnownDrama] = useState<{
    title: string;
    slug: string;
  } | null>(null);

  const {
    data: episode,
    isLoading,
    error,
  } = useQuery<EpisodeWithNavigation>({
    queryKey: ["episode", episodeId],
    queryFn: async () => {
      if (episodeId === "test") {
        return MOCK_EPISODE;
      }
      const response = await fetch(`${API_URL}/api/episodes/${episodeId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Episode not found");
        }
        throw new Error("Failed to load episode");
      }

      const result = await response.json();

      if (result && typeof result === "object") {
        if ("data" in result && result.data) {
          const episodeData = result.data as EpisodeWithNavigation;
          if (episodeData.drama) {
            setLastKnownDrama({
              title: episodeData.drama.title,
              slug: episodeData.drama.slug,
            });
          }
          return episodeData;
        }
        const episodeData = result as EpisodeWithNavigation;
        if (episodeData.drama) {
          setLastKnownDrama({
            title: episodeData.drama.title,
            slug: episodeData.drama.slug,
          });
        }
        return episodeData;
      }

      throw new Error("Invalid response format");
    },
    enabled: !!episodeId,
  });

  // Use pre-built video URLs from API
  const videoUrls = useMemo<VideoUrls | undefined>(() => {
    return episode?.video?.urls as VideoUrls | undefined;
  }, [episode]);

  // Use navigation from consolidated API response
  const prevEpisode = episode?.navigation?.prevEpisode;
  const nextEpisode = episode?.navigation?.nextEpisode;

  const showMobileNav = true;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading episode...</p>
        </div>
      </div>
    );
  }

  if (error || !episode) {
    const backLink = lastKnownDrama
      ? {
          to: "/dramas/$dramaId" as const,
          params: { dramaId: lastKnownDrama.slug },
          text: `Back to ${lastKnownDrama.title}`,
        }
      : { to: "/" as const, params: undefined, text: "Back to Home" };

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Episode Not Found</h1>
          <p className="text-muted-foreground mb-6">
            {error?.message || "The episode you're looking for doesn't exist."}
          </p>
          <Link
            to={backLink.to}
            params={backLink.params}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {backLink.text}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-background ${showMobileNav ? "pb-20" : ""}`}
    >
      {/* Mobile-First Layout */}
      <div className="max-w-lg mx-auto">
        {/* Video Player Container - Full width on mobile */}
        <div className="relative bg-black">
          {/* Back Button - Overlay on video */}
          <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/70 to-transparent">
            <Link
              to="/dramas/$dramaId"
              params={{ dramaId: episode.drama.slug }}
              state={search ? { searchQuery: search } : undefined}
              className="inline-flex items-center text-white/90 hover:text-white transition-colors"
              aria-label={`Back to ${episode.drama.title}`}
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="ml-2">{episode.drama.title}</span>
            </Link>
          </div>

          {/* Video Player */}
          <VideoPlayer
            videoUrls={videoUrls}
            posterUrl={episode.drama.posterUrl || undefined}
          />
        </div>

        {/* Episode Info - Below video on mobile */}
        <div className="px-4 py-6 space-y-4">
          {/*<div className="flex flex-col gap-2">
            <Link
              to="/dramas/$dramaId"
              params={{ dramaId: episode.drama.slug }}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors duration-200 group"
              aria-label={`View details for ${episode.drama.title}`}
            >
              <span className="text-primary-foreground/90 group-hover:text-primary transition-colors">
                {episode.drama.title}
              </span>
              <span className="text-xs text-muted-foreground">
                • Episode {episode.number}
              </span>
              <ChevronLeft className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          </div>*/}

          {(prevEpisode || nextEpisode) && !showMobileNav && (
            <div className="relative">
              <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {prevEpisode ? (
                      <Link
                        to="/watch/$episodeId"
                        params={{ episodeId: prevEpisode.id }}
                        className="flex items-center justify-center w-12 h-12 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-all duration-200 hover:scale-105 active:scale-95"
                        aria-label={`Previous episode: Episode ${prevEpisode.number}`}
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </Link>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                        <div className="w-5 h-5 bg-muted-foreground/20 rounded-full" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-center px-6">
                    <div className="text-center">
                      <span className="text-xs font-medium text-muted-foreground tracking-wider">
                        EPISODE
                      </span>
                      <span className="text-2xl font-bold text-primary ml-2 tracking-tight">
                        {episode.number}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    {nextEpisode ? (
                      <Link
                        to="/watch/$episodeId"
                        params={{ episodeId: nextEpisode.id }}
                        className="flex items-center justify-center w-12 h-12 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-all duration-200 hover:scale-105 active:scale-95"
                        aria-label={`Next episode: Episode ${nextEpisode.number}`}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                        <div className="w-5 h-5 bg-muted-foreground/20 rounded-full" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {episode.description && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Synopsis
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
                {episode.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {showMobileNav && (
        <div className="md:hidden">
          <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur shadow-lg">
            <div className="max-w-lg mx-auto px-4 py-4">
              <div className="flex items-center gap-3">
                {prevEpisode ? (
                  <Link
                    to="/watch/$episodeId"
                    params={{ episodeId: prevEpisode.id }}
                    className="rounded-xl border border-border/50 px-4 py-3 text-left text-sm font-semibold text-muted-foreground hover:border-primary hover:bg-muted/50 transition-all duration-200 active:scale-95"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground tracking-wider">
                        PREVIOUS
                      </span>
                      <p className="text-sm font-bold text-primary-foreground">
                        Episode {prevEpisode.number}
                      </p>
                    </div>
                  </Link>
                ) : (
                  <div className="rounded-xl border border-border/30 px-4 py-3 text-left text-sm font-semibold text-muted-foreground/50 opacity-50">
                    <div className="flex items-center">
                      <span className="text-xs text-muted-foreground/50 tracking-wider">
                        PREVIOUS
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex-1 flex flex-col items-center justify-center gap-1">
                  <span className="text-3xl font-bold text-primary tracking-tight">
                    {episode.number}
                  </span>
                  {episode.drama.totalEpisodes && (
                    <>
                      <div className="w-8 h-px bg-muted-foreground/30" />
                      <span className="text-sm font-medium text-muted-foreground/60 tracking-tight">
                        {episode.drama.totalEpisodes}
                      </span>
                    </>
                  )}
                </div>
                {nextEpisode ? (
                  <Link
                    to="/watch/$episodeId"
                    params={{ episodeId: nextEpisode.id }}
                    className="rounded-xl border border-border/50 px-4 py-3 text-right text-sm font-semibold text-muted-foreground hover:border-primary hover:bg-muted/50 transition-all duration-200 active:scale-95"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground tracking-wider">
                        NEXT
                      </span>
                      <p className="text-sm font-bold text-primary-foreground">
                        Episode {nextEpisode.number}
                      </p>
                    </div>
                  </Link>
                ) : (
                  <div className="rounded-xl border border-border/30 px-4 py-3 text-right text-sm font-semibold text-muted-foreground/50 opacity-50">
                    <div className="flex items-center justify-end">
                      <span className="text-xs text-muted-foreground/50 tracking-wider">
                        NEXT
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WatchPage;
