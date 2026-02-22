import { useQueries } from "@tanstack/react-query";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface DramaItem {
  id: string;
  title: string;
  slug: string;
  description?: string;
  posterUrl?: string;
  status?: string;
  language?: string;
  playCount?: number;
  totalEpisodes?: number;
  releaseYear?: number;
  country?: string;
  rating?: number;
  genres?: string[];
}

interface DramasResponse {
  items: DramaItem[];
  total: number;
}

async function fetchRank1Dramas(): Promise<DramasResponse> {
  const res = await fetch(`${API_BASE_URL}/api/dramas/rank-1`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch rank-1 dramas");
  }

  const data = await res.json();
  return data.data;
}

async function fetchFeaturedDramas(): Promise<DramasResponse> {
  const res = await fetch(`${API_BASE_URL}/api/dramas/featured`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch featured dramas");
  }

  const data = await res.json();
  return data.data;
}

async function fetchLatestDramas(): Promise<DramasResponse> {
  const res = await fetch(`${API_BASE_URL}/api/dramas/latest`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch latest dramas");
  }

  const data = await res.json();
  return data.data;
}

async function fetchPopularDramas(): Promise<DramasResponse> {
  const res = await fetch(`${API_BASE_URL}/api/dramas/popular`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch popular dramas");
  }

  const data = await res.json();
  return data.data;
}

export function useHomeData() {
  const queries = useQueries({
    queries: [
      {
        queryKey: ["dramas", "rank-1"],
        queryFn: fetchRank1Dramas,
        staleTime: 10 * 60 * 1000, // 10 minutes
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      {
        queryKey: ["dramas", "featured"],
        queryFn: fetchFeaturedDramas,
        staleTime: 10 * 60 * 1000, // 10 minutes
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      {
        queryKey: ["dramas", "latest"],
        queryFn: fetchLatestDramas,
        staleTime: 10 * 60 * 1000, // 10 minutes
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      {
        queryKey: ["dramas", "popular"],
        queryFn: fetchPopularDramas,
        staleTime: 10 * 60 * 1000, // 10 minutes
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
    ],
  });

  const [rank1, featured, latest, popular] = queries;

  return {
    rank1: {
      data: rank1.data,
      isLoading: rank1.isLoading,
      isError: rank1.isError,
      error: rank1.error,
    },
    featured: {
      data: featured.data,
      isLoading: featured.isLoading,
      isError: featured.isError,
      error: featured.error,
    },
    latest: {
      data: latest.data,
      isLoading: latest.isLoading,
      isError: latest.isError,
      error: latest.error,
    },
    popular: {
      data: popular.data,
      isLoading: popular.isLoading,
      isError: popular.isError,
      error: popular.error,
    },
    isLoading: queries.some((q) => q.isLoading),
    isError: queries.some((q) => q.isError),
  };
}
