import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useFavorites } from "../hooks/use-favorites.js";
import { useAuth } from "../hooks/use-auth.js";
import DramaCard from "../components/drama-card.js";
import { Heart } from "lucide-react";
import { PageHeaderSkeleton, DramaCardSkeleton } from "../components/skeletons.js";

export const Route = createFileRoute("/profile/favorites")({
  component: FavoritesPage,
});

function FavoritesPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { data: favorites, isLoading, error } = useFavorites();

  // Show loading skeleton while checking auth or fetching data
  if (isAuthLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12">
          <PageHeaderSkeleton />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <DramaCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Redirect to sign in if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate to="/auth/signin" search={{ redirect: "/profile/favorites" }} />
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            My Favorites
          </h1>
          <div className="p-4 border border-red-500/30 bg-red-500/10 rounded-lg">
            <p className="text-red-400">
              Failed to load favorites. Please try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show empty state
  if (!favorites || favorites.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            My Favorites
          </h1>
          <div className="text-center py-16">
            <Heart className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <p className="text-xl text-muted-foreground mb-2">
              No favorites yet
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Start adding dramas to your favorites
            </p>
            <Link
              to="/dramas"
              className="inline-flex items-center px-6 py-3 text-sm font-medium tracking-wider uppercase text-white bg-primary hover:bg-primary/80 transition-all rounded-sm"
            >
              Browse Dramas
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Render favorites grid
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          My Favorites
        </h1>
        <p className="text-muted-foreground mb-8">
          {favorites.length} {favorites.length === 1 ? "drama" : "dramas"} in
          your favorites
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {favorites.map((item) => (
            <DramaCard
              key={item.id}
              drama={item.drama}
              referrer="/profile/favorites"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
