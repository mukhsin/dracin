import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface WatchlistItem {
  id: string;
  userId: string;
  dramaId: string;
  addedAt: string;
  drama: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    posterUrl: string | null;
    status: string;
    metadata: {
      releaseYear?: number;
      country?: string;
      genre?: string[];
      rating?: number;
      totalEpisodes?: number;
    } | null;
  };
}

async function fetchWatchlist(): Promise<WatchlistItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/watchlist`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch watchlist");
  }
  const data = await response.json();
  return data.data.items;
}

async function checkWatchlistStatus(dramaId: string): Promise<boolean> {
  const response = await fetch(
    `${API_BASE_URL}/api/watchlist/check/${dramaId}`,
    {
      credentials: "include",
    }
  );
  if (!response.ok) {
    throw new Error("Failed to check watchlist status");
  }
  const data = await response.json();
  return data.data.isInWatchlist;
}

async function addToWatchlist(dramaId: string): Promise<WatchlistItem> {
  const response = await fetch(`${API_BASE_URL}/api/watchlist`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ dramaId }),
  });
  if (!response.ok) {
    throw new Error("Failed to add to watchlist");
  }
  const data = await response.json();
  return data.data;
}

async function removeFromWatchlist(dramaId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/watchlist/${dramaId}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );
  if (!response.ok) {
    throw new Error("Failed to remove from watchlist");
  }
}

export function useWatchlist() {
  return useQuery({
    queryKey: ["watchlist"],
    queryFn: fetchWatchlist,
  });
}

export function useWatchlistStatus(dramaId: string) {
  return useQuery({
    queryKey: ["watchlist", "status", dramaId],
    queryFn: () => checkWatchlistStatus(dramaId),
    enabled: !!dramaId,
  });
}

export function useAddToWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addToWatchlist,
    onMutate: async (dramaId) => {
      await queryClient.cancelQueries({ queryKey: ["watchlist"] });
      await queryClient.cancelQueries({
        queryKey: ["watchlist", "status", dramaId],
      });

      const previousWatchlist = queryClient.getQueryData<WatchlistItem[]>([
        "watchlist",
      ]);
      const previousStatus = queryClient.getQueryData<boolean>([
        "watchlist",
        "status",
        dramaId,
      ]);

      queryClient.setQueryData(["watchlist", "status", dramaId], true);

      return { previousWatchlist, previousStatus };
    },
    onError: (_err, dramaId, context) => {
      if (context?.previousWatchlist) {
        queryClient.setQueryData(["watchlist"], context.previousWatchlist);
      }
      if (context?.previousStatus !== undefined) {
        queryClient.setQueryData(
          ["watchlist", "status", dramaId],
          context.previousStatus
        );
      }
    },
    onSettled: (_data, _error, dramaId) => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      queryClient.invalidateQueries({
        queryKey: ["watchlist", "status", dramaId],
      });
    },
  });
}

export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeFromWatchlist,
    onMutate: async (dramaId) => {
      await queryClient.cancelQueries({ queryKey: ["watchlist"] });
      await queryClient.cancelQueries({
        queryKey: ["watchlist", "status", dramaId],
      });

      const previousWatchlist = queryClient.getQueryData<WatchlistItem[]>([
        "watchlist",
      ]);
      const previousStatus = queryClient.getQueryData<boolean>([
        "watchlist",
        "status",
        dramaId,
      ]);

      queryClient.setQueryData<WatchlistItem[]>(["watchlist"], (old) =>
        old?.filter((item) => item.dramaId !== dramaId)
      );
      queryClient.setQueryData(["watchlist", "status", dramaId], false);

      return { previousWatchlist, previousStatus, dramaId };
    },
    onError: (_err, _dramaId, context) => {
      if (context?.previousWatchlist) {
        queryClient.setQueryData(["watchlist"], context.previousWatchlist);
      }
      if (context?.previousStatus !== undefined) {
        queryClient.setQueryData(
          ["watchlist", "status", context.dramaId],
          context.previousStatus
        );
      }
    },
    onSettled: (_data, _error, dramaId) => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      queryClient.invalidateQueries({
        queryKey: ["watchlist", "status", dramaId],
      });
    },
  });
}
