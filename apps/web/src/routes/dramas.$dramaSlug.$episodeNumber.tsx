import { Link, createFileRoute, useLocation } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, AlertCircle } from "lucide-react";
import { VideoPlayer } from "../components/video-player.js";
import type { VideoUrls } from "../components/quality-selector.js";
import type { EpisodeWithNavigation } from "@repo/shared";
import {
  WatchPageVideoSkeleton,
  WatchPageNavigationSkeleton,
} from "../components/skeletons.js";
import { useMinSkeletonDelay } from "@/hooks/use-min-skeleton-delay.js";

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

export const Route = createFileRoute("/dramas/$dramaSlug/$episodeNumber")({
  component: WatchPage,
});

function WatchPage() {
  const { dramaSlug, episodeNumber } = Route.useParams();
  const location = useLocation();
  const search = location.state?.searchQuery || "";

  const {
    data: episode,
    isLoading,
    error,
  } = useQuery<EpisodeWithNavigation>({
    queryKey: ["episode", dramaSlug, episodeNumber],
    queryFn: async () => {
      if (dramaSlug === "test" && episodeNumber === "1") {
        return MOCK_EPISODE;
      }
      const response = await fetch(
        `${API_URL}/api/dramas/${dramaSlug}/episodes/${episodeNumber}`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Episode not found");
        }
        throw new Error("Failed to load episode");
      }

      const result = await response.json();

      if (result && typeof result === "object") {
        if ("data" in result && result.data) {
          return result.data as EpisodeWithNavigation;
        }
        return result as EpisodeWithNavigation;
      }

      throw new Error("Invalid response format");
    },
    enabled: !!dramaSlug && !!episodeNumber,
  });

  // Use pre-built video URLs from API
  const videoUrls = useMemo<VideoUrls | undefined>(() => {
    return episode?.video?.urls as VideoUrls | undefined;
  }, [episode]);

  const prevEpisode = episode?.navigation?.prevEpisode;
  const nextEpisode = episode?.navigation?.nextEpisode;

  const minDelayDone = useMinSkeletonDelay();
  const showSkeleton = !minDelayDone || isLoading;

  if (showSkeleton) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] max-w-lg mx-auto">
        {/* Video Skeleton - Vertical format */}
        <div className="relative py-8 bg-black flex justify-center">
          <WatchPageVideoSkeleton />
        </div>

        {/* Navigation Skeleton */}
        <div className="border-t border-gray-800 bg-[#0A0A0A]/95 backdrop-blur">
          <div className="px-4 py-4">
            <WatchPageNavigationSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (error || !episode) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">
            Episode Not Found
          </h1>
          <p className="text-gray-500 mb-6">
            {error?.message || "The episode you're looking for doesn't exist."}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold hover:bg-[#B89452] transition-colors"
            style={{ borderRadius: "0" }}
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] pb-24 md:pb-0">
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
            episodeId={episode.id}
          />
        </div>

        {(prevEpisode || nextEpisode) && (
          <div className="md:relative fixed md:bottom-auto bottom-0 left-0 right-0 z-50 md:z-auto md:border-0 border-t border-gray-800 md:bg-transparent bg-[#0A0A0A]/95 backdrop-blur md:backdrop-blur-none shadow-lg md:shadow-none">
            <div className="max-w-lg mx-auto px-4 py-4">
              <div className="flex items-center gap-3">
                {prevEpisode ? (
                  <Link
                    to="/dramas/$dramaSlug/$episodeNumber"
                    params={{
                      dramaSlug: dramaSlug,
                      episodeNumber: prevEpisode.number.toString(),
                    }}
                    className="border border-transparent px-4 py-3 text-left text-sm font-semibold text-gray-400 hover:border-primary hover:bg-primary/10 transition-all duration-200 active:scale-95"
                    style={{ borderRadius: "0" }}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500 tracking-wider">
                        PREVIOUS
                      </span>
                      <p className="text-sm font-bold text-white">
                        Episode {prevEpisode.number}
                      </p>
                    </div>
                  </Link>
                ) : (
                  <div
                    className="border border-gray-700 px-4 py-3 text-left text-sm font-semibold text-gray-600 opacity-50"
                    style={{ borderRadius: "0" }}
                  >
                    <div className="flex items-center">
                      <span className="text-xs text-gray-600 tracking-wider">
                        PREVIOUS
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex-1 flex flex-col items-center justify-center gap-1">
                  <span className="text-3xl font-bold text-primary tracking-tight">
                    {episode.number}
                  </span>
                  <div
                    className="w-8 h-0.5 bg-gray-600"
                    style={{ borderRadius: "0" }}
                  />
                  <span className="text-sm font-medium text-gray-500">
                    {episode.drama.totalEpisodes || "?"}
                  </span>
                </div>
                {nextEpisode ? (
                  <Link
                    to="/dramas/$dramaSlug/$episodeNumber"
                    params={{
                      dramaSlug: dramaSlug,
                      episodeNumber: nextEpisode.number.toString(),
                    }}
                    className="border border-transparent px-4 py-3 text-right text-sm font-semibold text-gray-400 hover:border-primary hover:bg-primary/10 transition-all duration-200 active:scale-95"
                    style={{ borderRadius: "0" }}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500 tracking-wider">
                        NEXT
                      </span>
                      <p className="text-sm font-bold text-white">
                        Episode {nextEpisode.number}
                      </p>
                    </div>
                  </Link>
                ) : (
                  <div
                    className="border border-gray-700 px-4 py-3 text-right text-sm font-semibold text-gray-600 opacity-50"
                    style={{ borderRadius: "0" }}
                  >
                    <div className="flex items-center justify-end">
                      <span className="text-xs text-gray-600 tracking-wider">
                        NEXT
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WatchPage;
