import { createFileRoute } from "@tanstack/react-router";
import HeroCarousel from "../components/home/HeroCarousel";
import ContentSection from "../components/home/ContentSection";
import { useHomeData } from "../hooks/use-home-data";
import { RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HeroSkeleton() {
  return (
    <div className="w-full bg-[#0A0A0A] overflow-hidden">
      <div className="aspect-[21/9] animate-pulse bg-gradient-to-r from-gray-900 to-gray-800">
        <div className="h-full flex items-center px-6 sm:px-8 lg:px-12">
          <div className="max-w-2xl space-y-4">
            <div className="h-12 w-96 bg-gray-700" />
            <div className="space-y-2">
              <div className="h-4 w-full bg-gray-700" />
              <div className="h-4 w-3/4 bg-gray-700" />
              <div className="h-4 w-1/2 bg-gray-700" />
            </div>
            <div className="h-12 w-40 bg-[#C9A962]/50" />
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
          <div className="inline-block p-4 border border-[#C9A962]">
            <RefreshCw className="w-8 h-8 text-[#C9A962]" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-400 mb-6">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 bg-[#C9A962] hover:bg-[#B89452] text-black font-semibold px-6 py-3 transition-colors duration-200"
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
  const { featured, latest, popular, isError } = useHomeData();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  if (isError) {
    return (
      <ErrorState
        message="Failed to load content. Please check your connection and try again."
        onRetry={() => window.location.reload()}
      />
    );
  }

  const isLoading =
    !showContent || featured.isLoading || latest.isLoading || popular.isLoading;

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {isLoading ? (
        <HeroSkeleton />
      ) : featured.data && featured.data.items.length > 0 ? (
        <HeroCarousel
          dramas={featured.data.items.map((item) => ({
            id: item.id,
            title: item.title,
            slug: item.slug,
            description: item.description,
            posterUrl: item.posterUrl,
          }))}
        />
      ) : null}

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
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
            viewAllLink="/dramas"
          />
        ) : null}

        {isLoading ? (
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
            viewAllLink="/dramas"
          />
        ) : null}

        {isLoading ? (
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
            viewAllLink="/dramas"
          />
        ) : null}
      </div>
    </div>
  );
}
