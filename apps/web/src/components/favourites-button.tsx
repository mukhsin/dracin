import { Heart, Loader2 } from "lucide-react";
import {
  useFavoriteStatus,
  useAddToFavorites,
  useRemoveFromFavorites,
} from "../hooks/use-favorites.js";
import { useAuth } from "../hooks/use-auth.js";
import { SignInModal } from "./sign-in-modal.js";
import { cn } from "../lib/utils.js";
import { useState } from "react";

interface FavouritesButtonProps {
  dramaId: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const iconSizes = {
  sm: 14,
  md: 16,
  lg: 20,
};

export function FavouritesButton({
  dramaId,
  className,
  size = "md",
}: FavouritesButtonProps) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: isInFavourites, isLoading: isChecking } =
    useFavoriteStatus(dramaId, {
      enabled: isAuthenticated,
    });

  const addMutation = useAddToFavorites();
  const removeMutation = useRemoveFromFavorites();

  const isPending = addMutation.isPending || removeMutation.isPending;

  const handleClick = () => {
    if (!isAuthenticated) {
      setIsModalOpen(true);
      return;
    }

    if (isInFavourites) {
      removeMutation.mutate(dramaId);
    } else {
      addMutation.mutate(dramaId);
    }
  };

  const getButtonContent = () => {
    if (isAuthLoading || (isPending || (isChecking && isAuthenticated))) {
      return <Loader2 className="animate-spin" size={iconSizes[size]} />;
    }
    if (isInFavourites) {
      return <Heart size={iconSizes[size]} className="fill-current" />;
    }
    return <Heart size={iconSizes[size]} />;
  };

  const getVariantClasses = () => {
    if (!isAuthenticated) {
      return "text-gray-500 cursor-pointer";
    }
    if (isInFavourites) {
      return "text-yellow-500 hover:text-yellow-600";
    }
    return "text-white hover:text-yellow-400 transition-colors";
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isAuthLoading || (isPending || (isChecking && isAuthenticated))}
        className={cn(
          "inline-flex items-center justify-center",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          getVariantClasses(),
          className,
        )}
        aria-label={
          isInFavourites ? "Remove from favourites" : "Add to favourites"
        }
      >
        {getButtonContent()}
      </button>
      <SignInModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        message="Please sign in to add dramas to your favorites"
      />
    </>
  );
}
