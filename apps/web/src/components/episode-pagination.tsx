import { useState } from "react";
import { Link } from "@tanstack/react-router";

interface EpisodePaginationProps {
  totalEpisodes: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  watchedEpisodes?: Set<number>;
  dramaSlug: string;
  searchQuery?: string;
}

export function EpisodePagination({
  totalEpisodes,
  currentPage: controlledCurrentPage,
  onPageChange,
  watchedEpisodes = new Set(),
  dramaSlug,
  searchQuery,
}: EpisodePaginationProps) {
  const [internalPage, setInternalPage] = useState(0);

  const currentPage =
    controlledCurrentPage !== undefined ? controlledCurrentPage : internalPage;

  const getBatchSize = () => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024 ? 20 : 10;
    }
    return 10;
  };

  const batchSize = getBatchSize();
  const totalBatches = Math.ceil(totalEpisodes / batchSize);

  const handlePageChange = (page: number) => {
    if (page >= 0 && page < totalBatches) {
      if (onPageChange) {
        onPageChange(page);
      } else {
        setInternalPage(page);
      }
    }
  };

  const startEpisode = currentPage * batchSize + 1;
  const endEpisode = Math.min(startEpisode + batchSize - 1, totalEpisodes);

  const renderBatchButtons = () => {
    return Array.from({ length: totalBatches }, (_, i) => {
      const batchStart = i * batchSize + 1;
      const batchEnd = Math.min(batchStart + batchSize - 1, totalEpisodes);
      const isCurrentBatch = i === currentPage;

      return (
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-2 text-sm font-medium transition-all border ${
            isCurrentBatch
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-gray-700 hover:border-primary hover:text-foreground"
          }`}
          style={{ borderRadius: "0" }}
        >
          {batchStart}-{batchEnd}
        </button>
      );
    });
  };

  const renderEpisodeGrid = () => {
    const episodes = [];
    for (let i = startEpisode; i <= endEpisode; i++) {
      const isWatched = watchedEpisodes.has(i);

      episodes.push(
        <Link
          key={i}
          to="/dramas/$dramaSlug/$episodeNumber"
          params={{ dramaSlug, episodeNumber: i.toString() }}
          state={searchQuery ? { searchQuery } : undefined}
          className={`group bg-card border aspect-square flex items-center justify-center transition-all ${
            isWatched
              ? "border-gray-700 opacity-50"
              : "border-gray-700 hover:border-primary hover:bg-primary/10"
          }`}
          style={{ borderRadius: "0" }}
        >
          <span
            className={`text-sm font-bold transition-colors ${
              isWatched
                ? "text-muted-foreground"
                : "text-gray-400 group-hover:text-primary"
            }`}
          >
            {i}
          </span>
        </Link>,
      );
    }
    return episodes;
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {renderBatchButtons()}
      </div>

      <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
        {renderEpisodeGrid()}
      </div>
    </div>
  );
}
