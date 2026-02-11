export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  name?: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
}

export type DramaStatus = "ongoing" | "completed" | "upcoming";

export interface Drama {
  id: string;
  bookId: string | null;
  title: string;
  slug: string;
  description: string | null;
  posterUrl: string | null;
  status: DramaStatus;
  language: string | null;
  playCount: string | null;
  sourceEndpoint: string | null;
  metadata: DramaMetadata | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DramaMetadata {
  releaseYear?: number;
  country?: string;
  genre?: string[];
  rating?: number;
  totalEpisodes?: number;
}

export interface CreateDramaInput {
  title: string;
  description?: string;
  posterUrl?: string;
  status?: DramaStatus;
  language?: string;
  metadata?: Partial<DramaMetadata>;
}

export interface UpdateDramaInput {
  title?: string;
  description?: string;
  posterUrl?: string;
  status?: DramaStatus;
  language?: string;
  metadata?: Partial<DramaMetadata>;
}

export type VideoQuality = "240p" | "360p" | "480p" | "720p" | "1080p" | "4k";

export interface Episode {
  id: string;
  dramaId: string;
  bookId: string | null;
  number: number;
  title: string | null;
  description: string | null;
  duration: number | null;
  videoUrls: Partial<Record<VideoQuality, string>> | null;
  sourceUrl: string | null;
  createdAt: Date;
}

export interface CreateEpisodeInput {
  dramaId: string;
  number: number;
  title?: string;
  description?: string;
  duration?: number;
  videoUrls?: Record<VideoQuality, string>;
  sourceUrl?: string;
}

export interface UpdateEpisodeInput {
  number?: number;
  title?: string;
  description?: string;
  duration?: number;
  videoUrls?: Record<VideoQuality, string>;
  sourceUrl?: string;
}

export interface WatchlistItem {
  id: string;
  userId: string;
  dramaId: string;
  addedAt: Date;
}

export interface CreateWatchlistItemInput {
  userId: string;
  dramaId: string;
}

export interface WatchHistory {
  id: string;
  userId: string;
  episodeId: string;
  progress: number;
  watchedAt: Date;
  completed: boolean;
}

export interface CreateWatchHistoryInput {
  userId: string;
  episodeId: string;
  progress: number;
  completed?: boolean;
}

export interface UpdateWatchHistoryInput {
  progress?: number;
  completed?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface PaginationInput {
  page?: number;
  pageSize?: number;
}
