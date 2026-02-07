import { describe, it, expect, beforeEach, mock } from "bun:test";
import {
  getFeatured,
  getLatest,
  getRank,
  getChannel,
  getIndo,
  search,
  suggest,
  getEpisodes,
  getDetail,
  type Drama,
  type Episode,
} from "./api-proxy.service.js";

const mockFetch = mock((url: string, options?: RequestInit) =>
  Promise.resolve(new Response()),
);

global.fetch = mockFetch as unknown as typeof fetch;

const mockConsoleLog = mock(() => {});
const mockConsoleError = mock(() => {});
console.log = mockConsoleLog;
console.error = mockConsoleError;

describe("api-proxy.service", () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
  });

  describe("getFeatured", () => {
    it("should fetch featured dramas with default parameters", async () => {
      const mockDramas: Drama[] = [
        {
          id: "1",
          title: "Test Drama",
          cover: "https://example.com/cover.jpg",
          intro: "Test intro",
        },
      ];

      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status: true,
              message: "Success",
              data: mockDramas,
            }),
            { status: 200 },
          ),
        ),
      );

      const result = await getFeatured();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDramas);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toContain("/drama/featured");
      expect(mockFetch.mock.calls[0][0]).toContain("page=1");
      expect(mockFetch.mock.calls[0][0]).toContain("size=20");
    });

    it("should fetch featured dramas with custom parameters", async () => {
      const mockDramas: Drama[] = [
        {
          id: "1",
          title: "Test Drama",
          cover: "https://example.com/cover.jpg",
          intro: "Test intro",
        },
      ];

      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status: true,
              message: "Success",
              data: mockDramas,
            }),
            { status: 200 },
          ),
        ),
      );

      const result = await getFeatured(2, 50);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDramas);
      expect(mockFetch.mock.calls[0][0]).toContain("page=2");
      expect(mockFetch.mock.calls[0][0]).toContain("size=50");
    });
  });

  describe("getLatest", () => {
    it("should fetch latest dramas", async () => {
      const mockDramas: Drama[] = [
        {
          id: "2",
          title: "Latest Drama",
          cover: "https://example.com/latest.jpg",
          intro: "Latest intro",
        },
      ];

      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status: true,
              message: "Success",
              data: mockDramas,
            }),
            { status: 200 },
          ),
        ),
      );

      const result = await getLatest();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDramas);
      expect(mockFetch.mock.calls[0][0]).toContain("/drama/latest");
    });
  });

  describe("getRank", () => {
    it("should fetch ranked dramas", async () => {
      const mockRankItems = [
        {
          rank: 1,
          drama: {
            id: "1",
            title: "Top Drama",
            cover: "https://example.com/top.jpg",
            intro: "Top intro",
          },
        },
      ];

      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status: true,
              message: "Success",
              data: mockRankItems,
            }),
            { status: 200 },
          ),
        ),
      );

      const result = await getRank(1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRankItems);
      expect(mockFetch.mock.calls[0][0]).toContain("/drama/rank");
      expect(mockFetch.mock.calls[0][0]).toContain("type=1");
    });
  });

  describe("getChannel", () => {
    it("should fetch channel dramas", async () => {
      const mockChannelDramas = [
        {
          id: "1",
          title: "Channel Drama",
          cover: "https://example.com/channel.jpg",
          intro: "Channel intro",
          channelId: 205,
          channelName: "Test Channel",
        },
      ];

      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status: true,
              message: "Success",
              data: mockChannelDramas,
            }),
            { status: 200 },
          ),
        ),
      );

      const result = await getChannel(205, 1, 20);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockChannelDramas);
      expect(mockFetch.mock.calls[0][0]).toContain("/drama/channel/205");
      expect(mockFetch.mock.calls[0][0]).toContain("page=1");
      expect(mockFetch.mock.calls[0][0]).toContain("size=20");
    });
  });

  describe("getIndo", () => {
    it("should fetch Indonesian dubbed dramas", async () => {
      const mockDramas: Drama[] = [
        {
          id: "1",
          title: "Indo Drama",
          cover: "https://example.com/indo.jpg",
          intro: "Indo intro",
        },
      ];

      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status: true,
              message: "Success",
              data: mockDramas,
            }),
            { status: 200 },
          ),
        ),
      );

      const result = await getIndo();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDramas);
      expect(mockFetch.mock.calls[0][0]).toContain("/drama/indo");
    });
  });

  describe("search", () => {
    it("should search dramas with query", async () => {
      const mockDramas: Drama[] = [
        {
          id: "1",
          title: "Search Result",
          cover: "https://example.com/search.jpg",
          intro: "Search intro",
        },
      ];

      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status: true,
              message: "Success",
              data: mockDramas,
            }),
            { status: 200 },
          ),
        ),
      );

      const result = await search("test query", 1, 20);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDramas);
      expect(mockFetch.mock.calls[0][0]).toContain("/drama/search");
      expect(mockFetch.mock.calls[0][0]).toContain("q=test%20query");
    });

    it("should properly encode special characters in search query", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status: true,
              message: "Success",
              data: [],
            }),
            { status: 200 },
          ),
        ),
      );

      await search("test & query", 1, 20);

      expect(mockFetch.mock.calls[0][0]).toContain("q=test%20%26%20query");
    });
  });

  describe("suggest", () => {
    it("should fetch search suggestions", async () => {
      const mockDramas: Drama[] = [
        {
          id: "1",
          title: "Suggestion",
          cover: "https://example.com/suggest.jpg",
          intro: "Suggestion intro",
        },
      ];

      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status: true,
              message: "Success",
              data: mockDramas,
            }),
            { status: 200 },
          ),
        ),
      );

      const result = await suggest("sug");

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDramas);
      expect(mockFetch.mock.calls[0][0]).toContain("/drama/suggest");
      expect(mockFetch.mock.calls[0][0]).toContain("q=sug");
    });
  });

  describe("getEpisodes", () => {
    it("should fetch episodes for a drama", async () => {
      const mockEpisodes: Episode[] = [
        {
          id: "ep1",
          title: "Episode 1",
          index: 1,
          url: "https://example.com/ep1.mp4",
          cover: "https://example.com/ep1.jpg",
        },
        {
          id: "ep2",
          title: "Episode 2",
          index: 2,
          url: "https://example.com/ep2.mp4",
          cover: "https://example.com/ep2.jpg",
        },
      ];

      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status: true,
              message: "Success",
              data: mockEpisodes,
              total: 2,
              metadata: {
                title: "Test Drama",
                cover: "https://example.com/cover.jpg",
                intro: "Test intro",
              },
            }),
            { status: 200 },
          ),
        ),
      );

      const result = await getEpisodes("12345");

      expect(result.success).toBe(true);
      expect(result.data.id).toBe("12345");
      expect(result.data.title).toBe("Test Drama");
      expect(result.data.totalEpisodes).toBe(2);
      expect(result.data.episodes).toEqual(mockEpisodes);
      expect(mockFetch.mock.calls[0][0]).toContain("/drama/episodes/12345");
    });

    it("should handle episodes without metadata gracefully", async () => {
      const mockEpisodes: Episode[] = [
        {
          id: "ep1",
          title: "Episode 1",
          index: 1,
        },
      ];

      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status: true,
              message: "Success",
              data: mockEpisodes,
              total: 1,
            }),
            { status: 200 },
          ),
        ),
      );

      const result = await getEpisodes("12345");

      expect(result.success).toBe(true);
      expect(result.data.title).toBe("");
      expect(result.data.cover).toBe("");
      expect(result.data.intro).toBe("");
    });
  });

  describe("getDetail", () => {
    it("should fetch drama detail", async () => {
      const mockDetail = {
        id: "12345",
        title: "Detailed Drama",
        cover: "https://example.com/detail.jpg",
        intro: "Detail intro",
        totalEpisodes: 10,
        episodes: [
          {
            id: "ep1",
            title: "Episode 1",
            index: 1,
          },
        ],
      };

      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status: true,
              message: "Success",
              data: mockDetail,
            }),
            { status: 200 },
          ),
        ),
      );

      const result = await getDetail("12345");

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDetail);
      expect(mockFetch.mock.calls[0][0]).toContain("/drama/detail/12345");
    });
  });

  describe("error handling", () => {
    it("should retry on network errors and eventually throw HTTPException", async () => {
      mockFetch.mockImplementation(() =>
        Promise.reject(new Error("Network error")),
      );

      let errorThrown = false;
      try {
        await getFeatured();
      } catch (error) {
        errorThrown = true;
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain(
          "API-Proxy request failed after 3 attempts",
        );
      }

      expect(errorThrown).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should retry on 5xx errors", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response("Server Error", { status: 500 })),
      );

      let errorThrown = false;
      try {
        await getFeatured();
      } catch (error) {
        errorThrown = true;
      }

      expect(errorThrown).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should not retry on 4xx errors", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response("Not Found", { status: 404 })),
      );

      let errorThrown = false;
      try {
        await getFeatured();
      } catch (error) {
        errorThrown = true;
      }

      expect(errorThrown).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should throw HTTPException when API returns false status", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status: false,
              message: "Something went wrong",
              data: null,
            }),
            { status: 200 },
          ),
        ),
      );

      let errorThrown = false;
      try {
        await getFeatured();
      } catch (error) {
        errorThrown = true;
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain("API-Proxy request failed");
      }

      expect(errorThrown).toBe(true);
    });
  });

  describe("logging", () => {
    it("should log successful API calls", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status: true,
              message: "Success",
              data: [],
            }),
            { status: 200 },
          ),
        ),
      );

      await getFeatured();

      expect(mockConsoleLog).toHaveBeenCalled();
      const logCall = mockConsoleLog.mock.calls[0][0];
      expect(logCall).toContain("API-Proxy SUCCESS");
      expect(logCall).toContain("/drama/featured");
    });

    it("should log failed API calls", async () => {
      mockFetch.mockImplementation(() =>
        Promise.reject(new Error("Network error")),
      );

      try {
        await getFeatured();
      } catch {
        void 0;
      }

      expect(mockConsoleError).toHaveBeenCalled();
      const errorCall = mockConsoleError.mock.calls[0][0];
      expect(errorCall).toContain("API-Proxy ERROR");
    });
  });

  describe("response transformation", () => {
    it("should transform API-Proxy format to API format", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status: true,
              message: "Success",
              data: [{ id: "1", title: "Test", cover: "", intro: "" }],
            }),
            { status: 200 },
          ),
        ),
      );

      const result = await getFeatured();

      expect(result.success).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it("should include message when it's not 'Success'", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status: true,
              message: "Custom message",
              data: [{ id: "1", title: "Test", cover: "", intro: "" }],
            }),
            { status: 200 },
          ),
        ),
      );

      const result = await getFeatured();

      expect(result.success).toBe(true);
      expect(result.message).toBe("Custom message");
    });
  });
});
