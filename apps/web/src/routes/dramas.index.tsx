import {
  createFileRoute,
  useSearch,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
import { useMemo } from "react";
import { useDramasInfinite } from "../hooks/use-drama.js";
import DramaCard from "../components/drama-card.js";
import { Loader2, AlertCircle, Search } from "lucide-react";

export const Route = createFileRoute("/dramas/")({
  component: DramasPage,
});

function DramasPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = useSearch({ from: "/dramas" }) as { q?: string };
  // Use state from location if available, otherwise fall back to URL search params
  const search = location.state?.searchQuery || searchParams.q || "";

  const {
    data,
    isLoading,
    error,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useDramasInfinite({
    search,
    pageSize: 20,
  });

  const dramas = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((page) => page.items);
  }, [data]);

  const handleClearSearch = () => {
    navigate({
      to: "/dramas",
      search: {},
      state: { searchQuery: "" },
    });
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading dramas...</p>
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
                className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
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
            <h1 className="text-3xl font-bold tracking-tight">Browse Dramas</h1>
            <p className="text-muted-foreground mt-1">
              Discover your next favorite series
            </p>
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
                />
              ))}
            </div>

            {/* Load More Button */}
            {hasNextPage && (
              <div className="flex justify-center mt-12">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isFetchingNextPage}
                  className="flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load More"
                  )}
                </button>
              </div>
            )}

            {/* End of Results */}
            {!hasNextPage && dramas.length > 0 && (
              <div className="text-center mt-12 py-8 border-t">
                <p className="text-muted-foreground text-sm">
                  You&apos;ve reached the end
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
              {search
                ? "Try adjusting your search terms or browse all dramas"
                : "Check back later for new dramas"}
            </p>
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="mt-4 text-primary hover:underline text-sm"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
