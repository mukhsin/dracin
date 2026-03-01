import { createFileRoute } from "@tanstack/react-router";
import { ContinueWatching } from "../components/continue-watching";
import HeroCarousel from "../components/home/HeroCarousel";
import ContentSection from "../components/home/ContentSection";
import { useAuth } from "../hooks/use-auth";
import { useHomeData } from "../hooks/use-home-data";
import { RefreshCw } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HeroSkeleton() {
  return (
    <div className="w-full bg-[#0A0A0A] overflow-hidden">
      <div className="aspect-[3/4] md:aspect-[1/2] animate-pulse bg-gradient-to-b md:bg-gradient-to-r from-gray-900 to-gray-800">
        <div className="h-full flex flex-col justify-end md:justify-center md:flex-row md:items-center px-6 sm:px-8 lg:px-12 pb-8 md:pb-0">
          <div className="w-full max-w-2xl space-y-4">
            <div className="h-8 md:h-12 w-full max-w-[24rem] bg-gray-700" />
            <div className="space-y-2">
              <div className="h-4 w-full bg-gray-700" />
              <div className="h-4 w-3/4 bg-gray-700" />
              <div className="h-4 w-1/2 bg-gray-700" />
            </div>
            <div className="h-12 w-40 bg-primary/50" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionSkeleton() {
  return (
    <section className="py-6">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="h-6 w-48 bg-gray-800 animate-pulse" />
        <div className="h-4 w-16 bg-gray-800 animate-pulse" />
      </div>
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex-[0_0_auto] w-44 md:w-52 animate-pulse">
            <div className="aspect-[2/3] bg-gray-800 mb-3" />
            <div className="h-4 w-full bg-gray-800 mb-2" />
            <div className="h-3 w-2/3 bg-gray-800" />
          </div>
        ))}
      </div>
    </section>
  );
}

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
  const { isAuthenticated, isLoading } = useAuth();

  // Check if any data is already available (cached)
  const hasAnyData = !!(
    rank1.data ||
    featured.data ||
    latest.data ||
    popular.data
  );

  // Only show skeleton on initial load when no data exists yet
  // If we have cached data, show it immediately even if some sections are still loading
  const isInitialLoading =
    !hasAnyData &&
    (rank1.isLoading ||
      featured.isLoading ||
      latest.isLoading ||
      popular.isLoading);

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
      {isInitialLoading ? (
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
        {!isLoading && isAuthenticated ? <ContinueWatching /> : null}

        {isInitialLoading ? (
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

        {isInitialLoading ? (
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

        {isInitialLoading ? (
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
