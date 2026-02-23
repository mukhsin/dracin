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
}

const iconSizes = {
  sm: 14,
  md: 16,
  lg: 20,
};

export function WatchlistButton({
  dramaId,
  className,
  size = "md",
}: WatchlistButtonProps) {
  const { data: isInWatchlist, isLoading: isChecking } =
    useWatchlistStatus(dramaId);

  const addMutation = useAddToWatchlist();
  const removeMutation = useRemoveFromWatchlist();

  const isPending = addMutation.isPending || removeMutation.isPending;

  const handleClick = () => {
    if (isInWatchlist) {
      removeMutation.mutate(dramaId);
    } else {
      addMutation.mutate(dramaId);
    }
  };

  const getButtonContent = () => {
    if (isPending || isChecking) {
      return <Loader2 className="animate-spin" size={iconSizes[size]} />;
    }
    if (isInWatchlist) {
      return <BookmarkCheck size={iconSizes[size]} />;
    }
    return <Bookmark size={iconSizes[size]} />;
  };

  const getVariantClasses = () => {
    if (isInWatchlist) {
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
      aria-label={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
    >
      {getButtonContent()}
    </button>
  );
}
