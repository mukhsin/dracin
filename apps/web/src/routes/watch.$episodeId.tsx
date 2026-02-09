import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { VideoPlayer } from "../components/video-player.js";
import type { VideoUrls } from "../components/quality-selector.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

function buildShortVideoUrl(
  dramaId: string,
  episodeNumber: number,
  quality: string,
): string {
  return `${API_URL}/api/video/${dramaId}.${episodeNumber}.${quality}.mp4`;
}

function toShortVideoUrls(
  dramaId: string,
  episodeNumber: number,
  videoUrls?: VideoUrls,
): VideoUrls | undefined {
  if (!videoUrls) return videoUrls;

  return Object.fromEntries(
    Object.keys(videoUrls).map((quality) => [
      quality,
      buildShortVideoUrl(dramaId, episodeNumber, quality),
    ]),
  ) as VideoUrls;
}

const MOCK_EPISODE = {
  id: "test",
  dramaId: "test-drama",
  number: 1,
  title: "Test Episode",
  description: "This is a test episode for development.",
  duration: 600,
  videoUrls: {
    "1080p": "/dracin-01.mp4",
    "720p": "/dracin-01.mp4",
    "480p": "/dracin-01.mp4",
  },
  createdAt: new Date().toISOString(),
  drama: {
    id: "test-drama",
    title: "Test Drama",
    slug: "test-drama",
    posterUrl: null,
  },
};

interface Episode {
  id: string;
  dramaId: string;
  number: number;
  title: string;
  description: string | null;
  duration: number;
  videoUrls: VideoUrls;
  createdAt: string;
}

interface Drama {
  id: string;
  title: string;
  slug: string;
  posterUrl: string | null;
}

interface EpisodeDetail extends Episode {
  drama: Drama;
}

interface DramaEpisodesResponse {
  drama: Drama;
  episodes: Episode[];
}

export const Route = createFileRoute("/watch/$episodeId")({
  component: WatchPage,
});

function WatchPage() {
  const { episodeId } = Route.useParams();

  const {
    data: episode,
    isLoading: isEpisodeLoading,
    error: episodeError,
  } = useQuery<EpisodeDetail>({
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
          return result.data as EpisodeDetail;
        }
        return result as EpisodeDetail;
      }

      throw new Error("Invalid response format");
    },
    enabled: !!episodeId,
  });

  const {
    data: videoData,
    isLoading: isVideoLoading,
    error: videoError,
  } = useQuery<{
    episodeId: string;
    videoUrls: VideoUrls;
    qualities: string[];
    source: string;
  }>({
    queryKey: ["episode-videos", episodeId],
    queryFn: async () => {
      if (episodeId === "test") {
        return {
          episodeId: "test",
          videoUrls: MOCK_EPISODE.videoUrls,
          qualities: ["1080p", "720p", "480p"],
          source: "primary",
        };
      }
      const response = await fetch(
        `${API_URL}/api/episodes/${episodeId}/videos`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to load video URLs");
      }

      const result = await response.json();

      if (
        result &&
        typeof result === "object" &&
        "data" in result &&
        result.data
      ) {
        return result.data;
      }

      throw new Error("Invalid video response format");
    },
    enabled: !!episodeId,
  });

  const { data: dramaEpisodesData } = useQuery<DramaEpisodesResponse>({
    queryKey: ["drama-episodes", episode?.drama.slug],
    queryFn: async () => {
      if (episodeId === "test") {
        return {
          drama: MOCK_EPISODE.drama,
          episodes: [MOCK_EPISODE],
        };
      }
      const slug = episode?.drama.slug;
      if (!slug) {
        throw new Error("Drama slug is required");
      }
      const response = await fetch(`${API_URL}/api/dramas/${slug}/episodes`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to load drama episodes");
      }

      const result = await response.json();

      if (
        result &&
        typeof result === "object" &&
        "episodes" in result &&
        Array.isArray(result.episodes)
      ) {
        return result as DramaEpisodesResponse;
      }

      throw new Error("Invalid drama episodes response format");
    },
    enabled: !!episode?.drama.slug,
  });

  const isLoading = isEpisodeLoading || isVideoLoading;
  const error = episodeError || videoError;

  const videoUrls = useMemo(() => {
    if (episodeId === "test") return videoData?.videoUrls;
    if (!episode || !videoData?.videoUrls) return videoData?.videoUrls;

    return toShortVideoUrls(
      episode.drama.id,
      episode.number,
      videoData.videoUrls,
    );
  }, [episode, episodeId, videoData?.videoUrls]);

  const { prevEpisode, nextEpisode } = useMemo(() => {
    if (!episode || !dramaEpisodesData?.episodes) {
      return { prevEpisode: null, nextEpisode: null };
    }

    const currentIndex = dramaEpisodesData.episodes.findIndex(
      (item) => item.id === episode.id,
    );

    if (currentIndex === -1) {
      return { prevEpisode: null, nextEpisode: null };
    }

    return {
      prevEpisode: dramaEpisodesData.episodes[currentIndex - 1] ?? null,
      nextEpisode: dramaEpisodesData.episodes[currentIndex + 1] ?? null,
    };
  }, [episode, dramaEpisodesData?.episodes]);

  const showMobileNav = Boolean(prevEpisode || nextEpisode);

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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Episode Not Found</h1>
          <p className="text-muted-foreground mb-6">
            {error?.message || "The episode you're looking for doesn't exist."}
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Home
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
              className="inline-flex items-center text-white/90 hover:text-white transition-colors"
              aria-label={`Back to ${episode.drama.title}`}
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="sr-only">Back to {episode.drama.title}</span>
            </Link>
          </div>

          {/* Video Player */}
          <VideoPlayer
            episodeId={episode.id}
            videoUrls={videoUrls}
            posterUrl={episode.drama.posterUrl || undefined}
            dramaSlug={episode.drama.slug}
          />
        </div>

        {/* Episode Info - Below video on mobile */}
        <div className="px-4 py-4">
          <div className="flex flex-col gap-1 text-sm text-muted-foreground mb-4">
            <Link
              to="/dramas/$dramaId"
              params={{ dramaId: episode.drama.slug }}
              className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-primary-foreground hover:text-primary transition-colors duration-200 hover:underline decoration-primary/50 decoration-1 underline-offset-2"
              aria-label={`View details for ${episode.drama.title}`}
            >
              <span className="font-semibold">{episode.drama.title}</span>
              <span className="text-muted-foreground">
                • Episode {episode.number}
              </span>
            </Link>
          </div>

          {(prevEpisode || nextEpisode) && (
            <div className="flex items-center justify-between py-4 px-2">
              <div className="flex items-center">
                {prevEpisode ? (
                  <Link
                    to="/watch/$episodeId"
                    params={{ episodeId: prevEpisode.id }}
                    className="p-2 rounded-full hover:bg-muted transition-colors"
                    aria-label={`Previous episode: Episode ${prevEpisode.number}`}
                  >
                    <ChevronLeft className="w-5 h-5 text-primary" />
                  </Link>
                ) : (
                  <div className="w-9 h-9 flex items-center justify-center">
                    <div className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center">
                <div className="text-center">
                  <span className="text-sm font-medium text-muted-foreground">
                    Episode
                  </span>
                  <span className="text-lg font-bold text-primary ml-1">
                    {episode.number}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end">
                {nextEpisode ? (
                  <Link
                    to="/watch/$episodeId"
                    params={{ episodeId: nextEpisode.id }}
                    className="p-2 rounded-full hover:bg-muted transition-colors"
                    aria-label={`Next episode: Episode ${nextEpisode.number}`}
                  >
                    <ChevronRight className="w-5 h-5 text-primary" />
                  </Link>
                ) : (
                  <div className="w-9 h-9 flex items-center justify-center">
                    <div className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {episode.description && (
            <p className="text-muted-foreground leading-relaxed">
              {episode.description}
            </p>
          )}
        </div>
      </div>

      {showMobileNav && (
        <div className="md:hidden">
          <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur">
            <div className="max-w-lg mx-auto px-4 py-3">
              <div className="flex gap-3">
                {prevEpisode && (
                  <Link
                    to="/watch/$episodeId"
                    params={{ episodeId: prevEpisode.id }}
                    className="flex-1 rounded-lg border border-border px-3 py-2 text-left text-sm font-semibold text-muted-foreground hover:border-primary"
                  >
                    <span className="text-xs text-muted-foreground">Prev</span>
                    <p className="text-sm text-primary-foreground">
                      Episode {prevEpisode.number}
                    </p>
                  </Link>
                )}
                {nextEpisode && (
                  <Link
                    to="/watch/$episodeId"
                    params={{ episodeId: nextEpisode.id }}
                    className="flex-1 rounded-lg border border-border px-3 py-2 text-right text-sm font-semibold text-muted-foreground hover:border-primary"
                  >
                    <span className="text-xs text-muted-foreground">Next</span>
                    <p className="text-sm text-primary-foreground">
                      Episode {nextEpisode.number}
                    </p>
                  </Link>
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
