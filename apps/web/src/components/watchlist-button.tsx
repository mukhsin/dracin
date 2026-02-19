import { useState } from "react";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import {
  useWatchlistStatus,
  useAddToWatchlist,
  useRemoveFromWatchlist,
} from "../hooks/use-watchlist.js";
import { cn } from "../lib/utils.js";

interface WatchlistButtonProps {
  dramaId: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outline" | "ghost";
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

export function WatchlistButton({
  dramaId,
  className,
  size = "md",
  variant = "default",
}: WatchlistButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  const { data: isInWatchlist, isLoading: isChecking } =
    useWatchlistStatus(dramaId);

  const addMutation = useAddToWatchlist();
  const removeMutation = useRemoveFromWatchlist();

  const isPending = addMutation.isPending || removeMutation.isPending;
  const isError = addMutation.isError || removeMutation.isError;

  const handleClick = () => {
    if (isInWatchlist) {
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
          <span className="lg:sr-only">Loading...</span>
        </>
      );
    }

    if (isInWatchlist) {
      return (
        <>
          <BookmarkCheck size={iconSizes[size]} />
          <span className="lg:sr-only">
            {isHovered ? "Remove" : "In Watchlist"}
          </span>
        </>
      );
    }

    return (
      <>
        <Bookmark size={iconSizes[size]} />
        <span className="lg:sr-only">Add to Watchlist</span>
      </>
    );
  };

  const getVariantClasses = () => {
    if (variant === "outline") {
      return isInWatchlist
        ? "border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"
        : "border-input hover:bg-accent hover:text-accent-foreground";
    }
    if (variant === "ghost") {
      return isInWatchlist
        ? "text-green-600 hover:bg-green-50 hover:text-green-700"
        : "hover:bg-accent hover:text-accent-foreground";
    }
    return isInWatchlist
      ? "bg-green-600 text-white hover:bg-green-700"
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
      aria-label={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
    >
      {getButtonContent()}
    </button>
  );
}
