import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Drama } from "@repo/shared/types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface FavoriteItem {
  id: string;
  userId: string;
  dramaId: string;
  addedAt: string;
  drama: Drama;
}

async function fetchFavorites(): Promise<FavoriteItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/favorites`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch favorites");
  }
  const data = await response.json();
  return data.data.items;
}

async function checkFavoriteStatus(dramaId: string): Promise<boolean> {
  const response = await fetch(
    `${API_BASE_URL}/api/favorites/check/${dramaId}`,
    {
      credentials: "include",
    },
  );
  if (!response.ok) {
    throw new Error("Failed to check favorite status");
  }
  const data = await response.json();
  return data.data.isInFavorites;
}

async function addToFavorites(dramaId: string): Promise<FavoriteItem> {
  const response = await fetch(`${API_BASE_URL}/api/favorites`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ dramaId }),
  });
  if (!response.ok) {
    throw new Error("Failed to add to favorites");
  }
  const data = await response.json();
  return data.data;
}

async function removeFromFavorites(dramaId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/favorites/${dramaId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to remove from favorites");
  }
}

export function useFavorites() {
  return useQuery({
    queryKey: ["favorites"],
    queryFn: fetchFavorites,
  });
}

export function useFavoriteStatus(
  dramaId: string,
  options?: { enabled?: boolean; initialData?: boolean },
) {
  return useQuery({
    queryKey: ["favorites", "status", dramaId],
    queryFn: () => checkFavoriteStatus(dramaId),
    enabled: !!dramaId && options?.enabled !== false,
    initialData: options?.initialData,
    staleTime: Infinity,
  });
}

export function useAddToFavorites() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addToFavorites,
    onMutate: async (dramaId) => {
      await queryClient.cancelQueries({ queryKey: ["favorites"] });
      await queryClient.cancelQueries({
        queryKey: ["favorites", "status", dramaId],
      });

      const previousFavorites = queryClient.getQueryData<FavoriteItem[]>([
        "favorites",
      ]);
      const previousStatus = queryClient.getQueryData<boolean>([
        "favorites",
        "status",
        dramaId,
      ]);

      queryClient.setQueryData(["favorites", "status", dramaId], true);

      return { previousFavorites, previousStatus };
    },
    onError: (_err, dramaId, context) => {
      if (context?.previousFavorites) {
        queryClient.setQueryData(["favorites"], context.previousFavorites);
      }
      if (context?.previousStatus !== undefined) {
        queryClient.setQueryData(
          ["favorites", "status", dramaId],
          context.previousStatus,
        );
      }
    },
    onSettled: () => {
      // No refetch needed - optimistic updates already handle UI state
      // Only invalidate the main favorites list to keep it in sync
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}

export function useRemoveFromFavorites() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeFromFavorites,
    onMutate: async (dramaId) => {
      await queryClient.cancelQueries({ queryKey: ["favorites"] });
      await queryClient.cancelQueries({
        queryKey: ["favorites", "status", dramaId],
      });

      const previousFavorites = queryClient.getQueryData<FavoriteItem[]>([
        "favorites",
      ]);
      const previousStatus = queryClient.getQueryData<boolean>([
        "favorites",
        "status",
        dramaId,
      ]);

      queryClient.setQueryData<FavoriteItem[]>(["favorites"], (old) =>
        old?.filter((item) => item.dramaId !== dramaId),
      );
      queryClient.setQueryData(["favorites", "status", dramaId], false);

      return { previousFavorites, previousStatus, dramaId };
    },
    onError: (_err, _dramaId, context) => {
      if (context?.previousFavorites) {
        queryClient.setQueryData(["favorites"], context.previousFavorites);
      }
      if (context?.previousStatus !== undefined) {
        queryClient.setQueryData(
          ["favorites", "status", context.dramaId],
          context.previousStatus,
        );
      }
    },
    onSettled: () => {
      // No refetch needed - optimistic updates already handle UI state
      // Only invalidate the main favorites list to keep it in sync
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}
