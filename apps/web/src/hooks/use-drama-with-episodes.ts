import { useQuery } from "@tanstack/react-query";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface Episode {
  id: string;
  number: number;
  title?: string;
  description?: string;
  duration?: number;
  videoUrls?: Record<string, string>;
  sourceUrl?: string;
}

interface DramaWithEpisodes {
  id: string;
  title: string;
  slug: string;
  description?: string;
  posterUrl?: string;
  playCount?: string;
  language?: string;
  status?: string;
  episodes: Episode[];
}

async function fetchDramaWithEpisodes(id: string): Promise<DramaWithEpisodes> {
  const res = await fetch(`${API_BASE_URL}/api/dramas/${id}`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch drama details");
  }

  const data = await res.json();
  return data.data;
}

export function useDramaWithEpisodes(id: string) {
  return useQuery({
    queryKey: ["drama", id, "episodes"],
    queryFn: () => fetchDramaWithEpisodes(id),
    enabled: !!id,
  });
}
