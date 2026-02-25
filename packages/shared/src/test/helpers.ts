import type {
  User,
  Drama,
  Episode,
  CreateUserInput,
  CreateDramaInput,
  CreateEpisodeInput,
  DramaStatus,
  VideoQuality,
} from "../types/index.js";

export const mockDate = new Date("2024-01-01T00:00:00Z");

export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
    createdAt: mockDate,
    updatedAt: mockDate,
    ...overrides,
  };
}

export function createMockCreateUserInput(
  overrides?: Partial<CreateUserInput>,
): CreateUserInput {
  return {
    email: "new@example.com",
    name: "New User",
    ...overrides,
  };
}

export function createMockDrama(overrides?: Partial<Drama>): Drama {
  return {
    id: "drama-456",
    bookId: null,
    title: "Test Drama",
    slug: "test-drama",
    description: "A test drama",
    posterUrl: "https://example.com/poster.jpg",
    status: "ongoing",
    language: null,
    playCount: 14_000_000,
    sourceEndpoint: null,
    metadata: {
      releaseYear: 2024,
      country: "South Korea",
      genre: ["Romance", "Drama"],
      rating: 8.5,
      totalEpisodes: 16,
    },
    createdAt: mockDate,
    updatedAt: mockDate,
    ...overrides,
  };
}

export function createMockCreateDramaInput(
  overrides?: Partial<CreateDramaInput>,
): CreateDramaInput {
  return {
    title: "New Drama",
    description: "A new drama",
    status: "upcoming",
    ...overrides,
  };
}

export function createMockEpisode(overrides?: Partial<Episode>): Episode {
  const videoUrls: Record<VideoQuality, string> = {
    "240p": "https://example.com/video-240p.mp4",
    "360p": "https://example.com/video-360p.mp4",
    "480p": "https://example.com/video-480p.mp4",
    "720p": "https://example.com/video-720p.mp4",
    "1080p": "https://example.com/video-1080p.mp4",
    "4k": "https://example.com/video-4k.mp4",
  };

  return {
    id: "episode-101",
    dramaId: "drama-456",
    bookId: null,
    number: 1,
    title: "Episode 1",
    description: "First episode",
    duration: 3600,
    videoUrls,
    sourceUrl: null,
    createdAt: mockDate,
    ...overrides,
  };
}

export function createMockCreateEpisodeInput(
  overrides?: Partial<CreateEpisodeInput>,
): CreateEpisodeInput {
  return {
    dramaId: "drama-456",
    number: 1,
    title: "Episode 1",
    ...overrides,
  };
}

export function assertDefined<T>(
  value: T | undefined | null,
  message?: string,
): asserts value is T {
  if (value === undefined || value === null) {
    throw new Error(message ?? "Expected value to be defined");
  }
}

export function expectToBeDefined<T>(value: T | undefined | null): T {
  assertDefined(value);
  return value;
}

export async function expectAsyncToThrow(
  fn: () => Promise<unknown>,
  expectedMessage?: string | RegExp,
): Promise<void> {
  let threw = false;
  let error: unknown;

  try {
    await fn();
  } catch (e) {
    threw = true;
    error = e;
  }

  if (!threw) {
    throw new Error("Expected function to throw but it did not");
  }

  if (expectedMessage) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (expectedMessage instanceof RegExp) {
      if (!expectedMessage.test(errorMessage)) {
        throw new Error(
          `Expected error message to match ${expectedMessage} but got: ${errorMessage}`,
        );
      }
    } else if (!errorMessage.includes(expectedMessage)) {
      throw new Error(
        `Expected error message to include "${expectedMessage}" but got: ${errorMessage}`,
      );
    }
  }
}
