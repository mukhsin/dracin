import { Link } from "@tanstack/react-router";

interface ContinueWatchingButtonProps {
  dramaSlug: string;
  lastWatchedEpisode: number | null;
  totalEpisodes: number;
  searchQuery?: string;
}

export function ContinueWatchingButton({
  dramaSlug,
  lastWatchedEpisode,
  totalEpisodes,
  searchQuery,
}: ContinueWatchingButtonProps) {
  let targetEpisode: number;
  let label: string;

  if (!lastWatchedEpisode) {
    targetEpisode = 1;
    label = "Start Watching";
  } else if (lastWatchedEpisode >= totalEpisodes) {
    targetEpisode = 1;
    label = "Watch Again";
  } else {
    targetEpisode = lastWatchedEpisode + 1;
    label = "Continue Watching";
  }

  return (
    <Link
      to="/dramas/$dramaSlug/$episodeNumber"
      params={{
        dramaSlug,
        episodeNumber: targetEpisode.toString(),
      }}
      state={searchQuery ? { searchQuery } : undefined}
      className="text-sm font-semibold text-primary-foreground bg-primary px-4 py-2 border border-primary transition-all hover:bg-primary/90"
    >
      {label}
    </Link>
  );
}
