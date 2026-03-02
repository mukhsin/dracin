import { createFileRoute } from "@tanstack/react-router";
import { ContinueWatching } from "../components/continue-watching";
import HeroCarousel from "../components/home/HeroCarousel";
import ContentSection from "../components/home/ContentSection";
import { useAuth } from "../hooks/use-auth";
import { useHomeData } from "../hooks/use-home-data";
import { useContinueWatching } from "../hooks/use-history";
import { RefreshCw } from "lucide-react";
import { HeroSkeleton, SectionSkeleton } from "../components/skeletons.js";
import { useEffect, useState } from "react";
import { MIN_SKELETON_DELAY_MS } from "../lib/constants";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="mb-4">
          <div className="inline-block p-4 border border-primary">
            <RefreshCw className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-400 mb-6">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 bg-primary hover:bg-[#B89452] text-black font-semibold px-6 py-3 transition-colors duration-200"
          style={{ borderRadius: "0" }}
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    </div>
  );
}

export function HomePage() {
  const { rank1, featured, latest, popular, isError } = useHomeData();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: continueWatchingData, isLoading: continueWatchingLoading } =
    useContinueWatching();
  const [minDelayDone, setMinDelayDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(
      () => setMinDelayDone(true),
      MIN_SKELETON_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, []);

  // Check if any data is already available (cached)
  const hasAnyData = !!(
    rank1.data ||
    featured.data ||
    latest.data ||
    popular.data ||
    continueWatchingData
  );

  // Only show skeleton on initial load when no data exists yet
  // If we have cached data, show it immediately even if some sections are still loading
  const isInitialLoading =
    !hasAnyData &&
    (rank1.isLoading ||
      featured.isLoading ||
      latest.isLoading ||
      popular.isLoading ||
      continueWatchingLoading ||
      authLoading);

  const showSkeleton = !minDelayDone || isInitialLoading;

  if (isError) {
    return (
      <ErrorState
        message="Failed to load content. Please check your connection and try again."
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {showSkeleton ? (
        <HeroSkeleton />
      ) : rank1.data && rank1.data.items.length > 0 ? (
        <HeroCarousel
          dramas={rank1.data.items.map((item) => ({
            id: item.id,
            title: item.title,
            slug: item.slug,
            description: item.description,
            posterUrl: item.posterUrl,
          }))}
        />
      ) : null}

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isAuthenticated || authLoading ? <ContinueWatching /> : null}

        {showSkeleton ? (
          <SectionSkeleton />
        ) : popular.data && popular.data.items.length > 0 ? (
          <ContentSection
            title="Most Popular"
            dramas={popular.data.items.map((item) => ({
              id: item.id,
              title: item.title,
              slug: item.slug,
              description: item.description,
              posterUrl: item.posterUrl,
              playCount: item.playCount,
              language: item.language,
              status: item.status,
            }))}
            viewAllLink="/dramas?t=popular"
          />
        ) : null}

        {showSkeleton ? (
          <SectionSkeleton />
        ) : featured.data && featured.data.items.length > 0 ? (
          <ContentSection
            title="For You"
            dramas={featured.data.items.map((item) => ({
              id: item.id,
              title: item.title,
              slug: item.slug,
              description: item.description,
              posterUrl: item.posterUrl,
              playCount: item.playCount,
              language: item.language,
              status: item.status,
            }))}
            viewAllLink="/dramas?t=featured"
          />
        ) : null}

        {showSkeleton ? (
          <SectionSkeleton />
        ) : latest.data && latest.data.items.length > 0 ? (
          <ContentSection
            title="Latest"
            dramas={latest.data.items.map((item) => ({
              id: item.id,
              title: item.title,
              slug: item.slug,
              description: item.description,
              posterUrl: item.posterUrl,
              playCount: item.playCount,
              language: item.language,
              status: item.status,
            }))}
            viewAllLink="/dramas?t=latest"
          />
        ) : null}
      </div>
    </div>
  );
}
