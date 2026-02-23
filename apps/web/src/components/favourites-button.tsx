import { Heart, Loader2 } from "lucide-react";
import {
  useFavoriteStatus,
  useAddToFavorites,
  useRemoveFromFavorites,
} from "../hooks/use-favorites.js";
import { cn } from "../lib/utils.js";

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
  const { data: isInFavourites, isLoading: isChecking } =
    useFavoriteStatus(dramaId);

  const addMutation = useAddToFavorites();
  const removeMutation = useRemoveFromFavorites();

  const isPending = addMutation.isPending || removeMutation.isPending;

  const handleClick = () => {
    if (isInFavourites) {
      removeMutation.mutate(dramaId);
    } else {
      addMutation.mutate(dramaId);
    }
  };

  const getButtonContent = () => {
    if (isPending || isChecking) {
      return <Loader2 className="animate-spin" size={iconSizes[size]} />;
    }
    if (isInFavourites) {
      return <Heart size={iconSizes[size]} className="fill-current" />;
    }
    return <Heart size={iconSizes[size]} />;
  };

  const getVariantClasses = () => {
    if (isInFavourites) {
      return "text-amber-400 hover:text-amber-500";
    }
    return "text-white hover:text-amber-300 transition-colors";
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending || isChecking}
      className={cn(
        "inline-flex items-center justify-center transition-colors",
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
  );
}
