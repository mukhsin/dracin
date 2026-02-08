import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { formatPlayCount, parsePlayCount } from "@repo/shared/utils";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface DramasResponse {
  items: Array<any>;
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

interface UseDramasOptions {
  search?: string;
  page?: number;
  pageSize?: number;
}

async function fetchDramas(
  options: UseDramasOptions = {},
): Promise<DramasResponse> {
  const { search = "", page = 1, pageSize = 20 } = options;

  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });

  if (search) {
    params.append("q", search);
  }

  const res = await fetch(`${API_BASE_URL}/api/dramas?${params}`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch dramas");
  }

  const data = await res.json();
  return data.data;
}

export function useDramas(options: UseDramasOptions = {}) {
  return useQuery({
    queryKey: ["dramas", options],
    queryFn: () => fetchDramas(options),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

async function fetchDramaDetails(id: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/dramas/${id}`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch drama details");
  }

  const data = await res.json();
  return data.data;
}

export function useDramaDetails(id: string) {
  return useQuery({
    queryKey: ["drama", id],
    queryFn: () => fetchDramaDetails(id),
    enabled: !!id,
  });
}

// Helper function to format play count for display
export function formatDramaPlayCount(
  playCount: string | null | undefined,
): string {
  if (!playCount) return "0 views";
  const parsedCount = parsePlayCount(playCount);
  if (parsedCount === null) return "0 views";
  return `${formatPlayCount(parsedCount)} views`;
}

interface UseDramasInfiniteOptions {
  search?: string;
  pageSize?: number;
}

export function useDramasInfinite(options: UseDramasInfiniteOptions = {}) {
  const { search = "", pageSize = 20 } = options;

  return useInfiniteQuery({
    queryKey: ["dramas", "infinite", search, pageSize],
    queryFn: async ({ pageParam = 1 }) => {
      return fetchDramas({
        search,
        page: pageParam,
        pageSize,
      });
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.hasMore) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prevData) => prevData,
  });
}
