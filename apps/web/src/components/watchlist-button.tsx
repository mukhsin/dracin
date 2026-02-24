import { Bookmark } from "lucide-react";
import {
  useWatchlistStatus,
  useAddToWatchlist,
  useRemoveFromWatchlist,
} from "../hooks/use-watchlist.js";
import { useAuth } from "../hooks/use-auth.js";
import { SignInModal } from "./sign-in-modal.js";
import { cn } from "../lib/utils.js";
import { useState } from "react";

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
  const { isAuthenticated } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [optimisticState, setOptimisticState] = useState<boolean | null>(null);

  const { data: isInWatchlist } = useWatchlistStatus(dramaId, {
    enabled: isAuthenticated,
  });

  const addMutation = useAddToWatchlist();
  const removeMutation = useRemoveFromWatchlist();

  const effectiveState =
    optimisticState !== null ? optimisticState : isInWatchlist;

  const handleClick = async () => {
    if (!isAuthenticated) {
      setIsModalOpen(true);
      return;
    }

    const newState = !effectiveState;
    const previousState = effectiveState ?? false;

    setOptimisticState(newState);

    try {
      if (newState) {
        await addMutation.mutateAsync(dramaId);
      } else {
        await removeMutation.mutateAsync(dramaId);
      }
      setOptimisticState(null);
    } catch {
      setOptimisticState(previousState);
      setTimeout(() => setOptimisticState(null), 300);
    }
  };

  const getVariantClasses = () => {
    if (!isAuthenticated) {
      return "text-gray-500 cursor-pointer";
    }
    if (effectiveState) {
      return "text-primary hover:text-primary/90";
    }
    return "text-gray-400 hover:text-primary/70 transition-colors";
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "inline-flex items-center justify-center",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          getVariantClasses(),
          className,
        )}
        aria-label={
          effectiveState ? "Remove from watchlist" : "Add to watchlist"
        }
      >
        <Bookmark
          size={iconSizes[size]}
          className={effectiveState ? "fill-current" : ""}
        />
      </button>
      <SignInModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        message="Please sign in to add dramas to your watchlist"
      />
    </>
  );
}
