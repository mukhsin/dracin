import { z } from "zod";
import type { DramaStatus, VideoQuality } from "../types/index.js";

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateUserInputSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

export const UpdateUserInputSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
});

export const DramaStatusSchema: z.ZodType<DramaStatus> = z.enum([
  "ongoing",
  "completed",
  "upcoming",
]);

export const DramaMetadataSchema = z.object({
  releaseYear: z.number().optional(),
  country: z.string().optional(),
  genre: z.array(z.string()).optional(),
  rating: z.number().optional(),
  totalEpisodes: z.number().optional(),
});

export const DramaSchema = z.object({
  id: z.string(),
  bookId: z.number().nullable(),
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  posterUrl: z.string().nullable(),
  status: DramaStatusSchema,
  language: z.string().nullable(),
  playCount: z.string().nullable(),
  sourceEndpoint: z.string().nullable(),
  metadata: DramaMetadataSchema.nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateDramaInputSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  posterUrl: z.string().optional(),
  status: DramaStatusSchema.optional(),
  language: z.string().optional(),
  metadata: DramaMetadataSchema.partial().optional(),
});

export const UpdateDramaInputSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  posterUrl: z.string().optional(),
  status: DramaStatusSchema.optional(),
  language: z.string().optional(),
  metadata: DramaMetadataSchema.partial().optional(),
});

export const VideoQualitySchema: z.ZodType<VideoQuality> = z.enum([
  "240p",
  "360p",
  "480p",
  "720p",
  "1080p",
  "4k",
]);

export const EpisodeSchema = z.object({
  id: z.string(),
  dramaId: z.string(),
  bookId: z.number().nullable(),
  number: z.number().int().positive(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  duration: z.number().int().positive().nullable(),
  videoUrls: z.record(VideoQualitySchema, z.string()).nullable(),
  sourceUrl: z.string().nullable(),
  createdAt: z.date(),
});

export const CreateEpisodeInputSchema = z.object({
  dramaId: z.string(),
  number: z.number().int().positive(),
  title: z.string().optional(),
  description: z.string().optional(),
  duration: z.number().int().positive().optional(),
  videoUrls: z.record(VideoQualitySchema, z.string()).optional(),
  sourceUrl: z.string().optional(),
});

export const UpdateEpisodeInputSchema = z.object({
  number: z.number().int().positive().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  duration: z.number().int().positive().optional(),
  videoUrls: z.record(VideoQualitySchema, z.string()).optional(),
  sourceUrl: z.string().optional(),
});

export const WatchlistItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  dramaId: z.string(),
  addedAt: z.date(),
});

export const CreateWatchlistItemInputSchema = z.object({
  userId: z.string(),
  dramaId: z.string(),
});

export const WatchHistorySchema = z.object({
  id: z.string(),
  userId: z.string(),
  episodeId: z.string(),
  progress: z.number().int().min(0),
  watchedAt: z.date(),
  completed: z.boolean(),
});

export const CreateWatchHistoryInputSchema = z.object({
  userId: z.string(),
  episodeId: z.string(),
  progress: z.number().int().min(0),
  completed: z.boolean().optional(),
});

export const UpdateWatchHistoryInputSchema = z.object({
  progress: z.number().int().min(0).optional(),
  completed: z.boolean().optional(),
});

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});

export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: ApiErrorSchema.optional(),
  });

export const PaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int().min(0),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    hasMore: z.boolean(),
  });

export const PaginationInputSchema = z.object({
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
});
