import { describe, it, expect } from "bun:test";
import {
  UserSchema,
  DramaSchema,
  EpisodeSchema,
  CreateUserInputSchema,
  CreateDramaInputSchema,
  DramaStatusSchema,
  VideoQualitySchema,
} from "../schemas/index.js";
import {
  createMockUser,
  createMockDrama,
  createMockEpisode,
  createMockCreateUserInput,
  createMockCreateDramaInput,
} from "./helpers.js";
import { generateSlug, formatDuration, isValidEmail } from "../utils/index.js";

describe("Shared Package Types and Schemas", () => {
  describe("User Schema", () => {
    it("should validate a valid user", () => {
      const user = createMockUser();
      const result = UserSchema.safeParse(user);
      expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const user = createMockUser({ email: "invalid-email" });
      const result = UserSchema.safeParse(user);
      expect(result.success).toBe(false);
    });

    it("should accept null name", () => {
      const user = createMockUser({ name: null });
      const result = UserSchema.safeParse(user);
      expect(result.success).toBe(true);
    });
  });

  describe("CreateUserInput Schema", () => {
    it("should validate valid create input", () => {
      const input = createMockCreateUserInput();
      const result = CreateUserInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject missing email", () => {
      const input = createMockCreateUserInput();
      const { email: _, ...withoutEmail } = input;
      const result = CreateUserInputSchema.safeParse(withoutEmail);
      expect(result.success).toBe(false);
    });
  });

  describe("Drama Schema", () => {
    it("should validate a valid drama", () => {
      const drama = createMockDrama();
      const result = DramaSchema.safeParse(drama);
      expect(result.success).toBe(true);
    });

    it("should accept all valid status values", () => {
      const statuses = ["ongoing", "completed", "upcoming"] as const;
      for (const status of statuses) {
        const drama = createMockDrama({ status });
        const result = DramaSchema.safeParse(drama);
        expect(result.success).toBe(true);
      }
    });

    it("should reject invalid status", () => {
      const drama = createMockDrama({ status: "invalid" as "ongoing" });
      const result = DramaSchema.safeParse(drama);
      expect(result.success).toBe(false);
    });
  });

  describe("CreateDramaInput Schema", () => {
    it("should validate with just title", () => {
      const input = { title: "Minimal Drama" };
      const result = CreateDramaInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should validate full input", () => {
      const input = createMockCreateDramaInput();
      const result = CreateDramaInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("Episode Schema", () => {
    it("should validate a valid episode", () => {
      const episode = createMockEpisode();
      const result = EpisodeSchema.safeParse(episode);
      expect(result.success).toBe(true);
    });

    it("should accept null videoUrls", () => {
      const episode = createMockEpisode({ videoUrls: null });
      const result = EpisodeSchema.safeParse(episode);
      expect(result.success).toBe(true);
    });
  });

  describe("DramaStatus Enum", () => {
    it("should accept all valid statuses", () => {
      const statuses = ["ongoing", "completed", "upcoming"] as const;
      for (const status of statuses) {
        const result = DramaStatusSchema.safeParse(status);
        expect(result.success).toBe(true);
      }
    });

    it("should reject invalid status", () => {
      const result = DramaStatusSchema.safeParse("cancelled");
      expect(result.success).toBe(false);
    });
  });

  describe("VideoQuality Enum", () => {
    it("should accept all valid qualities", () => {
      const qualities = [
        "240p",
        "360p",
        "480p",
        "720p",
        "1080p",
        "4k",
      ] as const;
      for (const quality of qualities) {
        const result = VideoQualitySchema.safeParse(quality);
        expect(result.success).toBe(true);
      }
    });

    it("should reject invalid quality", () => {
      const result = VideoQualitySchema.safeParse("8k");
      expect(result.success).toBe(false);
    });
  });
});

describe("Shared Package Utilities", () => {
  describe("generateSlug", () => {
    it("should convert title to lowercase slug", () => {
      expect(generateSlug("My Drama Title")).toBe("my-drama-title");
    });

    it("should remove special characters", () => {
      expect(generateSlug("Drama: Special! Edition")).toBe(
        "drama-special-edition",
      );
    });

    it("should handle multiple spaces", () => {
      expect(generateSlug("My   Drama")).toBe("my-drama");
    });

    it("should trim whitespace", () => {
      expect(generateSlug("  My Drama  ")).toBe("my-drama");
    });
  });

  describe("formatDuration", () => {
    it("should format seconds as mm:ss", () => {
      expect(formatDuration(65)).toBe("1:05");
    });

    it("should format hours as h:mm:ss", () => {
      expect(formatDuration(3665)).toBe("1:01:05");
    });

    it("should pad seconds correctly", () => {
      expect(formatDuration(5)).toBe("0:05");
    });
  });

  describe("isValidEmail", () => {
    it("should validate correct email", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
    });

    it("should reject email without @", () => {
      expect(isValidEmail("testexample.com")).toBe(false);
    });

    it("should reject email without domain", () => {
      expect(isValidEmail("test@")).toBe(false);
    });

    it("should reject email with spaces", () => {
      expect(isValidEmail("test @example.com")).toBe(false);
    });
  });
});

describe("Test Helpers", () => {
  describe("createMockUser", () => {
    it("should create user with defaults", () => {
      const user = createMockUser();
      expect(user.id).toBe("user-123");
      expect(user.email).toBe("test@example.com");
    });

    it("should allow overrides", () => {
      const user = createMockUser({ email: "custom@example.com" });
      expect(user.email).toBe("custom@example.com");
    });
  });

  describe("createMockDrama", () => {
    it("should create drama with defaults", () => {
      const drama = createMockDrama();
      expect(drama.title).toBe("Test Drama");
      expect(drama.status).toBe("ongoing");
    });

    it("should include metadata", () => {
      const drama = createMockDrama();
      expect(drama.metadata?.genre).toContain("Romance");
    });
  });
});
