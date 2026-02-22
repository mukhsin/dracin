import { useQuery } from "@tanstack/react-query";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface SuggestionDrama {
  id: string;
  title: string;
  slug: string;
  description?: string;
  posterUrl?: string;
  status?: string;
  language?: string;
  playCount?: string;
  totalEpisodes?: number;
}

interface SuggestionsResponse {
  success: boolean;
  data: SuggestionDrama[];
}

async function fetchSuggestions(dramaSlug: string): Promise<SuggestionDrama[]> {
  const res = await fetch(
    `${API_BASE_URL}/api/dramas/${encodeURIComponent(dramaSlug)}/suggestions`,
    {
      credentials: "include",
    },
  );

  if (!res.ok) {
    throw new Error("Failed to fetch suggestions");
  }

  const data: SuggestionsResponse = await res.json();
  return data.data;
}

export function useDramaSuggestions(dramaSlug: string) {
  return useQuery({
    queryKey: ["dramas", dramaSlug, "suggestions"],
    queryFn: () => fetchSuggestions(dramaSlug),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

export type { SuggestionDrama };
