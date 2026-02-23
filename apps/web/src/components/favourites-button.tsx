import { useState } from "react";
import { HeartOutline, Loader2 } from "lucide-react";
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
  variant?: "default" | "outline" | "ghost";
  iconOnly?: boolean;
}

const sizeClasses = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

const iconSizes = {
  sm: 14,
  md: 16,
  lg: 20,
};

export function FavouritesButton({
  dramaId,
  className,
  size = "md",
  variant = "default",
  iconOnly = false,
}: FavouritesButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  const { data: isInFavourites, isLoading: isChecking } =
    useFavoriteStatus(dramaId);

  const addMutation = useAddToFavorites();
  const removeMutation = useRemoveFromFavorites();

  const isPending = addMutation.isPending || removeMutation.isPending;
  const isError = addMutation.isError || removeMutation.isError;

  const handleClick = () => {
    if (isInFavourites) {
      removeMutation.mutate(dramaId);
    } else {
      addMutation.mutate(dramaId);
    }
  };

  const getButtonContent = () => {
    if (isPending || isChecking) {
      return (
        <>
          <Loader2 className="animate-spin" size={iconSizes[size]} />
          {!iconOnly && <span className="lg:sr-only">Loading...</span>}
        </>
      );
    }

    if (isInFavourites) {
      return (
        <>
          <HeartOutline size={iconSizes[size]} />
          {!iconOnly && (
            <span className="lg:sr-only">
              {isHovered ? "Remove" : "Favourited"}
            </span>
          )}
        </>
      );
    }

    return (
      <>
        <HeartOutline size={iconSizes[size]} />
        {!iconOnly && <span className="lg:sr-only">Add to Favourites</span>}
      </>
    );
  };

  const getVariantClasses = () => {
    if (variant === "outline") {
      return isInFavourites
        ? "border-pink-500 text-pink-600 hover:bg-pink-50 hover:text-pink-700"
        : "border-input hover:bg-accent hover:text-accent-foreground";
    }
    if (variant === "ghost") {
      return isInFavourites
        ? "text-pink-600 hover:bg-pink-50 hover:text-pink-700"
        : "hover:bg-accent hover:text-accent-foreground";
    }
    return isInFavourites
      ? "bg-pink-600 text-white hover:bg-pink-700"
      : "bg-primary text-primary-foreground hover:bg-primary/90";
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isPending || isChecking}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        sizeClasses[size],
        getVariantClasses(),
        isError && "border-red-500 text-red-600",
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
