import {
  createFileRoute,
  useSearch,
  useNavigate,
} from "@tanstack/react-router";
import { useMemo, useRef, useEffect } from "react";
import { useDramasInfinite } from "../hooks/use-drama.js";
import DramaCard from "../components/drama-card.js";
import { AlertCircle, Search } from "lucide-react";
import { PageHeaderSkeleton, DramaCardSkeleton } from "../components/skeletons.js";

// Valid section types
const VALID_SECTION_TYPES = ["popular", "featured", "latest"] as const;
type SectionType = (typeof VALID_SECTION_TYPES)[number];

function isValidSectionType(t: string | undefined): t is SectionType {
  return !!t && VALID_SECTION_TYPES.includes(t as SectionType);
}

function getSectionTitle(sectionType: SectionType): string {
  switch (sectionType) {
    case "popular":
      return "Most Popular Dramas";
    case "featured":
      return "Featured For You";
    case "latest":
      return "Latest Releases";
    default:
      return "Browse Dramas";
  }
}

function getSectionDescription(sectionType: SectionType): string {
  switch (sectionType) {
    case "popular":
      return "Discover what everyone's watching";
    case "featured":
      return "Handpicked dramas just for you";
    case "latest":
      return "Fresh releases and new additions";
    default:
      return "Discover your next favorite series";
  }
}

export const Route = createFileRoute("/dramas/")({
  component: DramasPage,
});

function DramasPage() {
  const navigate = useNavigate();
  const searchParams = useSearch({ from: "/dramas" }) as {
    q?: string;
    t?: string;
  };
  
  // Build referrer path with search params for back navigation
  const referrer = useMemo(() => {
    const params = new URLSearchParams();
    if (searchParams.q) params.set("q", searchParams.q);
    if (searchParams.t) params.set("t", searchParams.t);
    const queryString = params.toString();
    return queryString ? `/dramas?${queryString}` : "/dramas";
  }, [searchParams.q, searchParams.t]);

  // q xor t behavior: search takes precedence over section type
  const search = searchParams.q || "";
  const sectionType = search
    ? ""
    : isValidSectionType(searchParams.t)
      ? searchParams.t
      : "";

  const {
    data,
    isLoading: dataLoading,
    error,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useDramasInfinite({
    search,
    sectionType,
    pageSize: 18,
  });

  const sentinelRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);

    return () => {
      observer.unobserve(sentinel);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Only show loading skeleton when actually loading without cached data
  const isLoading = dataLoading && !data;

  const dramas = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((page) => page.items);
  }, [data]);

  const handleClearSearch = () => {
    navigate({
      to: "/dramas",
      search: {},
    });
  };


  // Determine page title and description based on mode
  const pageTitle = search
    ? `Search: "${search}"`
    : sectionType
      ? getSectionTitle(sectionType)
      : "Browse Dramas";

  const pageDescription = search
    ? `Showing results for "${search}"`
    : sectionType
      ? getSectionDescription(sectionType)
      : "Discover your next favorite series";

  const emptyStateMessage = search
    ? "Try adjusting your search terms or browse all dramas"
    : sectionType
      ? "No dramas available in this section"
      : "Check back later for new dramas";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <div className="container mx-auto px-4 py-8">
          <PageHeaderSkeleton />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6">
            {Array.from({ length: 18 }).map((_, i) => (
              <DramaCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-md">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                Failed to load dramas
              </h2>
              <p className="text-muted-foreground mb-6">
                {error instanceof Error
                  ? error.message
                  : "Unknown error occurred"}
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="bg-primary hover:bg-[#B89452] text-black font-semibold px-6 py-3 transition-colors duration-200"
                style={{ borderRadius: "0" }}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
            <p className="text-muted-foreground mt-1">{pageDescription}</p>
          </div>
        </div>

        {/* Drama Grid */}
        {dramas.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6">
              {dramas.map((drama) => (
                <DramaCard
                  key={drama.id}
                  drama={drama}
                  totalEpisodes={drama.metadata?.totalEpisodes}
                  searchQuery={search}
                  referrer={referrer}
                />
              ))}
            </div>
            {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} className="h-10" />
            {/* Loading indicator for next page */}
            {isFetchingNextPage && (
              <div className="flex justify-center mt-8">
                <div className="animate-spin h-6 w-6 border-2 border-t-foreground" />
              </div>
            )}

            {/* End of Results */}
            {!hasNextPage && dramas.length > 0 && (
              <div className="text-center mt-12 py-8 border-t">
                <p className="text-muted-foreground text-sm">
                  You've reached the end
                </p>
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No dramas found</h2>
            <p className="text-muted-foreground max-w-sm">
              {emptyStateMessage}
            </p>
            {(search || sectionType) && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="mt-4 text-primary hover:underline text-sm"
              >
                Clear {search ? "search" : "filter"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
