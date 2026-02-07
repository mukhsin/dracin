import { http, HttpResponse } from "msw";

const API_BASE_URL = "http://localhost:3001";

interface WatchlistItem {
  id: string;
  dramaId: string;
  addedAt: string;
  drama: {
    id: string;
    title: string;
    slug: string;
    posterUrl: string | null;
    status: string;
    metadata: {
      releaseYear?: number;
      genre?: string[];
      totalEpisodes?: number;
    };
  };
}

interface ContinueWatchingItem {
  historyId: string;
  episodeId: string;
  dramaId: string;
  dramaTitle: string;
  dramaSlug: string;
  posterUrl: string | null;
  episodeNumber: number;
  episodeTitle: string | null;
  progress: number;
  duration: number | null;
  progressPercent: number;
  watchedAt: string;
  completed: boolean;
}

interface RouteParams {
  dramaId?: string;
  historyId?: string;
  slug?: string;
}

export const mockWatchlistItems: WatchlistItem[] = [
  {
    id: "wl-001",
    dramaId: "drama-001",
    addedAt: "2024-01-15T10:30:00Z",
    drama: {
      id: "drama-001",
      title: "Love in the Moonlight",
      slug: "love-in-the-moonlight",
      posterUrl: "https://example.com/poster1.jpg",
      status: "completed",
      metadata: {
        releaseYear: 2023,
        genre: ["Romance", "Historical"],
        totalEpisodes: 16,
      },
    },
  },
  {
    id: "wl-002",
    dramaId: "drama-002",
    addedAt: "2024-01-20T14:45:00Z",
    drama: {
      id: "drama-002",
      title: "Hospital Playlist",
      slug: "hospital-playlist",
      posterUrl: "https://example.com/poster2.jpg",
      status: "ongoing",
      metadata: {
        releaseYear: 2024,
        genre: ["Medical", "Comedy"],
        totalEpisodes: 12,
      },
    },
  },
  {
    id: "wl-003",
    dramaId: "drama-003",
    addedAt: "2024-02-01T09:00:00Z",
    drama: {
      id: "drama-003",
      title: "The Glory",
      slug: "the-glory",
      posterUrl: null,
      status: "completed",
      metadata: {
        releaseYear: 2022,
        genre: ["Thriller", "Revenge"],
        totalEpisodes: 8,
      },
    },
  },
];

export const mockContinueWatchingItems: ContinueWatchingItem[] = [
  {
    historyId: "hist-001",
    episodeId: "ep-001",
    dramaId: "drama-001",
    dramaTitle: "Love in the Moonlight",
    dramaSlug: "love-in-the-moonlight",
    posterUrl: "https://example.com/poster1.jpg",
    episodeNumber: 5,
    episodeTitle: "The Royal Secret",
    progress: 1800,
    duration: 3600,
    progressPercent: 50,
    watchedAt: "2024-02-10T20:30:00Z",
    completed: false,
  },
  {
    historyId: "hist-002",
    episodeId: "ep-002",
    dramaId: "drama-002",
    dramaTitle: "Hospital Playlist",
    dramaSlug: "hospital-playlist",
    posterUrl: "https://example.com/poster2.jpg",
    episodeNumber: 3,
    episodeTitle: "First Surgery",
    progress: 2700,
    duration: 3600,
    progressPercent: 75,
    watchedAt: "2024-02-11T19:00:00Z",
    completed: false,
  },
  {
    historyId: "hist-003",
    episodeId: "ep-003",
    dramaId: "drama-003",
    dramaTitle: "The Glory",
    dramaSlug: "the-glory",
    posterUrl: null,
    episodeNumber: 1,
    episodeTitle: "Dreams of Architecture",
    progress: 120,
    duration: 2400,
    progressPercent: 5,
    watchedAt: "2024-02-12T21:15:00Z",
    completed: false,
  },
];

let watchlistData = [...mockWatchlistItems];
let continueWatchingData = [...mockContinueWatchingItems];

export function resetMockData(): void {
  watchlistData = [...mockWatchlistItems];
  continueWatchingData = [...mockContinueWatchingItems];
}

export function setWatchlistEmpty(): void {
  watchlistData = [];
}

export function setContinueWatchingEmpty(): void {
  continueWatchingData = [];
}

export const handlers = [
  http.get(`${API_BASE_URL}/api/watchlist`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        items: watchlistData,
      },
    });
  }),

  http.delete(`${API_BASE_URL}/api/watchlist/:dramaId`, ({ params }) => {
    const { dramaId } = params as RouteParams;
    watchlistData = watchlistData.filter((item) => item.dramaId !== dramaId);
    return HttpResponse.json({
      success: true,
      data: { removed: true },
    });
  }),

  http.get(`${API_BASE_URL}/api/history/continue`, () => {
    return HttpResponse.json({
      success: true,
      data: continueWatchingData,
    });
  }),

  http.delete(`${API_BASE_URL}/api/history/:historyId`, ({ params }) => {
    const { historyId } = params as RouteParams;
    continueWatchingData = continueWatchingData.filter(
      (item) => item.historyId !== historyId,
    );
    return HttpResponse.json({
      success: true,
      data: { deleted: true },
    });
  }),

  http.get(`${API_BASE_URL}/api/dramas/:slug`, ({ params }) => {
    const { slug } = params as RouteParams;
    const drama = mockWatchlistItems.find((item) => item.drama.slug === slug);
    if (drama) {
      return HttpResponse.json({
        success: true,
        data: drama.drama,
      });
    }
    return HttpResponse.json(
      { success: false, error: "Drama not found" },
      { status: 404 },
    );
  }),
];

export const unauthorizedHandler = http.get(
  `${API_BASE_URL}/api/watchlist`,
  () => {
    return HttpResponse.json(
      {
        success: false,
        error: "Unauthorized",
      },
      { status: 401 },
    );
  },
);

export const serverErrorHandler = http.get(
  `${API_BASE_URL}/api/watchlist`,
  () => {
    return HttpResponse.json(
      {
        success: false,
        error: "Internal Server Error",
      },
      { status: 500 },
    );
  },
);

export const emptyWatchlistHandler = http.get(
  `${API_BASE_URL}/api/watchlist`,
  () => {
    return HttpResponse.json({
      success: true,
      data: {
        items: [],
      },
    });
  },
);

export const emptyContinueWatchingHandler = http.get(
  `${API_BASE_URL}/api/history/continue`,
  () => {
    return HttpResponse.json({
      success: true,
      data: [],
    });
  },
);
