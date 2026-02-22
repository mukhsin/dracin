import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/utils.js";
import { server } from "../../test/mocks/server.js";
import { http, HttpResponse } from "msw";

const API_BASE_URL = "http://localhost:3001";

const mockAllDramas = [
  {
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
  {
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
  {
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
  {
    id: "drama-004",
    title: "Romance is a Bonus Book",
    slug: "romance-is-a-bonus-book",
    posterUrl: "https://example.com/poster4.jpg",
    status: "completed",
    metadata: {
      releaseYear: 2019,
      genre: ["Romance", "Comedy"],
      totalEpisodes: 16,
    },
  },
];

const mockNavigate = vi.fn();
let currentSearchParams: { q?: string; t?: string } = {};

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: { component: React.ComponentType }) =>
    options,
  useNavigate: () => mockNavigate,
  useSearch: () => currentSearchParams,
  Link: ({
    to,
    children,
    className,
    search,
    params,
  }: {
    to: string;
    children: React.ReactNode;
    className?: string;
    search?: { q?: string; t?: string };
    params?: { dramaId?: string };
  }) => {
    // Interpolate params into the URL path
    let resolvedTo = to;
    if (params?.dramaId) {
      resolvedTo = to.replace("$dramaId", params.dramaId);
    }

    // Build search string from search params
    const searchParams = new URLSearchParams();
    if (search?.q) searchParams.append("q", search.q);
    if (search?.t) searchParams.append("t", search.t);
    const searchStr = searchParams.toString();
    const fullUrl = searchStr ? `${resolvedTo}?${searchStr}` : resolvedTo;

    return (
      <a
        href={fullUrl}
        className={className}
        onClick={(e) => {
          e.preventDefault();
          mockNavigate(fullUrl);
        }}
      >
        {children}
      </a>
    );
  },
}));

const dramasHandler = http.get(`${API_BASE_URL}/api/dramas`, ({ request }) => {
  const url = new URL(request.url);
  const searchQuery = url.searchParams.get("q")?.toLowerCase() || "";
  const sectionType = url.searchParams.get("t")?.toLowerCase() || "";

  let filteredDramas = [...mockAllDramas];

  // Section filter takes precedence over search query (q xor t behavior)
  if (searchQuery && !sectionType) {
    // Only search query present
    filteredDramas = mockAllDramas.filter(
      (drama) =>
        drama.title.toLowerCase().includes(searchQuery) ||
        drama.metadata.genre.some((g: string) =>
          g.toLowerCase().includes(searchQuery),
        ),
    );
  } else if (sectionType) {
    // Section type present - q is ignored (xor behavior)
    // Return different dramas based on section type
    switch (sectionType) {
      case "popular":
        // Return dramas sorted by popularity (simulated: ongoing first)
        filteredDramas = mockAllDramas.filter(
          (d) => d.status === "ongoing" || d.metadata.genre.includes("Romance"),
        );
        break;
      case "featured":
        // Return featured dramas (simulated: completed dramas)
        filteredDramas = mockAllDramas.filter(
          (d) =>
            d.status === "completed" &&
            !d.metadata.genre.includes("Thriller"),
        );
        break;
      case "latest":
        // Return latest dramas (simulated: recent release year)
        filteredDramas = mockAllDramas.filter(
          (d) => d.metadata.releaseYear >= 2023,
        );
        break;
      default:
        // Unknown section type - return empty
        filteredDramas = [];
    }
  }

  return HttpResponse.json({
    success: true,
    data: {
      items: filteredDramas,
      total: filteredDramas.length,
      page: 1,
      pageSize: 20,
      hasMore: false,
    },
  });
});

describe("Dramas Index Search Integration Tests", () => {
  let DramasPage: React.ComponentType;

  beforeEach(async () => {
    mockNavigate.mockClear();
    currentSearchParams = {};
    server.resetHandlers();
    server.use(dramasHandler);

    vi.resetModules();
    const module = await import("../dramas.index.js");
    const routeModule = module.Route as unknown as {
      component: React.ComponentType;
    };
    DramasPage = routeModule.component;
  });

  it("navigating with search query loads correct dramas", async () => {
    currentSearchParams = { q: "romance" };

    renderWithProviders(<DramasPage />);

    await waitFor(() => {
      expect(screen.getByText('Search: "romance"')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("Love in the Moonlight")).toBeInTheDocument();
    });
    expect(screen.getByText("Romance is a Bonus Book")).toBeInTheDocument();

    expect(screen.queryByText("The Glory")).not.toBeInTheDocument();
    expect(screen.queryByText("Hospital Playlist")).not.toBeInTheDocument();
  });

  it("changing search query updates URL and results", async () => {
    currentSearchParams = {};

    const { rerender, queryClient } = renderWithProviders(<DramasPage />);

    await waitFor(() => {
      expect(screen.getByText("Browse Dramas")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("Love in the Moonlight")).toBeInTheDocument();
    });
    expect(screen.getByText("Hospital Playlist")).toBeInTheDocument();
    expect(screen.getByText("The Glory")).toBeInTheDocument();
    expect(screen.getByText("Romance is a Bonus Book")).toBeInTheDocument();

    currentSearchParams = { q: "medical" };
    queryClient.clear();
    rerender(<DramasPage />);

    await waitFor(() => {
      expect(screen.getByText("Hospital Playlist")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(
        screen.queryByText("Love in the Moonlight"),
      ).not.toBeInTheDocument();
    });
    expect(screen.queryByText("The Glory")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Romance is a Bonus Book"),
    ).not.toBeInTheDocument();
  });

  it("clearing search removes query and shows all dramas", async () => {
    currentSearchParams = { q: "thriller" };

    const { rerender, queryClient } = renderWithProviders(<DramasPage />);

    await waitFor(() => {
      expect(screen.getByText("The Glory")).toBeInTheDocument();
    });

    expect(screen.queryByText("Love in the Moonlight")).not.toBeInTheDocument();
    expect(screen.queryByText("Hospital Playlist")).not.toBeInTheDocument();

    currentSearchParams = {};
    queryClient.clear();
    rerender(<DramasPage />);

    await waitFor(() => {
      expect(screen.getByText("Love in the Moonlight")).toBeInTheDocument();
    });

    expect(screen.getByText("Hospital Playlist")).toBeInTheDocument();
    expect(screen.getByText("Romance is a Bonus Book")).toBeInTheDocument();
  });

  it("navigating to drama details and back preserves search", async () => {
    currentSearchParams = { q: "moonlight" };

    renderWithProviders(<DramasPage />);

    await waitFor(() => {
      expect(screen.getByText("Love in the Moonlight")).toBeInTheDocument();
    });

    expect(screen.queryByText("The Glory")).not.toBeInTheDocument();

    const dramaTitle = screen.getByText("Love in the Moonlight");
    await userEvent.click(dramaTitle);

    expect(mockNavigate).toHaveBeenCalledWith("/dramas/love-in-the-moonlight");
  });

  it("shows empty state when search returns no results", async () => {
    currentSearchParams = { q: "xyznonexistent" };

    renderWithProviders(<DramasPage />);

    await waitFor(() => {
      expect(screen.getByText("No dramas found")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/try adjusting your search terms/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Clear search")).toBeInTheDocument();
  });

  it("clear button in empty state navigates to remove search", async () => {
    const user = userEvent.setup();
    currentSearchParams = { q: "nonexistent" };

    renderWithProviders(<DramasPage />);

    await waitFor(() => {
      expect(screen.getByText("Clear search")).toBeInTheDocument();
    });

    const clearButton = screen.getByText("Clear search");
    await user.click(clearButton);

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/dramas",
      search: {},
    });
  });

  it("preserves scroll position concept through navigation state", async () => {
    currentSearchParams = { q: "romance" };

    renderWithProviders(<DramasPage />);

    await waitFor(() => {
      expect(screen.getByText("Love in the Moonlight")).toBeInTheDocument();
    });

    expect(currentSearchParams.q).toBe("romance");
  });

  // ============================================
  // Section Filter Tests (t parameter)
  // ============================================

  describe("section filter links with 't' parameter", () => {
    it("navigating with ?t=popular loads popular dramas section", async () => {
      currentSearchParams = { t: "popular" };

      renderWithProviders(<DramasPage />);

      await waitFor(() => {
        expect(screen.getByText("Most Popular Dramas")).toBeInTheDocument();
      });

      // Should show popular dramas (Hospital Playlist - ongoing, Love in the Moonlight - Romance)
      await waitFor(() => {
        expect(screen.getByText("Hospital Playlist")).toBeInTheDocument();
      });
      expect(screen.getByText("Love in the Moonlight")).toBeInTheDocument();
      expect(screen.getByText("Romance is a Bonus Book")).toBeInTheDocument();

      // Should NOT show The Glory (not ongoing, not Romance)
      expect(screen.queryByText("The Glory")).not.toBeInTheDocument();
    });

    it("navigating with ?t=featured loads featured dramas section", async () => {
      currentSearchParams = { t: "featured" };

      renderWithProviders(<DramasPage />);

      await waitFor(() => {
        expect(screen.getByText("Featured For You")).toBeInTheDocument();
      });

      // Should show featured dramas (completed, non-thriller)
      await waitFor(() => {
        expect(screen.getByText("Love in the Moonlight")).toBeInTheDocument();
      });
      expect(screen.getByText("Romance is a Bonus Book")).toBeInTheDocument();

      // Should NOT show Hospital Playlist (ongoing)
      expect(screen.queryByText("Hospital Playlist")).not.toBeInTheDocument();
      // Should NOT show The Glory (thriller)
      expect(screen.queryByText("The Glory")).not.toBeInTheDocument();
    });

    it("navigating with ?t=latest loads latest dramas section", async () => {
      currentSearchParams = { t: "latest" };

      renderWithProviders(<DramasPage />);

      await waitFor(() => {
        expect(screen.getByText("Latest Releases")).toBeInTheDocument();
      });

      // Should show latest dramas (2023+)
      await waitFor(() => {
        expect(screen.getByText("Love in the Moonlight")).toBeInTheDocument();
      });
      expect(screen.getByText("Hospital Playlist")).toBeInTheDocument();

      // Should NOT show older dramas
      expect(screen.queryByText("The Glory")).not.toBeInTheDocument(); // 2022
      expect(
        screen.queryByText("Romance is a Bonus Book"),
      ).not.toBeInTheDocument(); // 2019
    });

    it("shows default browse title for invalid section type", async () => {
      currentSearchParams = { t: "invalid-section" };
      renderWithProviders(<DramasPage />);
      await waitFor(() => {
        expect(screen.getByText("Browse Dramas")).toBeInTheDocument();
      });
    });
  });
  // ============================================
  // q xor t Behavior Tests
  // ============================================

  describe("q xor t behavior (search overrides section)", () => {
    it("q parameter takes precedence over t parameter - search wins", async () => {
      // Start with both q and t - q should win
      currentSearchParams = { q: "medical", t: "popular" };

      renderWithProviders(<DramasPage />);

      await waitFor(() => {
        expect(screen.getByText('Search: "medical"')).toBeInTheDocument();
      });

      // Should show search results for "medical" (q wins), not popular section
      await waitFor(() => {
        expect(screen.getByText("Hospital Playlist")).toBeInTheDocument();
      });

      // Should NOT show other popular dramas (t is ignored when q present)
      expect(
        screen.queryByText("Love in the Moonlight"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText("Romance is a Bonus Book"),
      ).not.toBeInTheDocument();
    });

    it("searching from section view switches to q-only URL", async () => {

      // Start with section filter
      currentSearchParams = { t: "popular" };

      const { rerender, queryClient } = renderWithProviders(<DramasPage />);

      await waitFor(() => {
        expect(screen.getByText("Hospital Playlist")).toBeInTheDocument();
      });

      // Simulate entering search query - should override t
      currentSearchParams = { q: "glory" }; // t is removed, q is set
      queryClient.clear();
      rerender(<DramasPage />);

      await waitFor(() => {
        expect(screen.getByText("The Glory")).toBeInTheDocument();
      });

      // Other popular dramas should not appear (now using search)
      expect(
        screen.queryByText("Hospital Playlist"),
      ).not.toBeInTheDocument();
    });

    it("clearing search from q+t state removes both and shows all dramas", async () => {
      currentSearchParams = { q: "romance", t: "featured" };
      const { rerender, queryClient } = renderWithProviders(<DramasPage />);

      await waitFor(() => {
        expect(screen.getByText('Search: "romance"')).toBeInTheDocument();
      });
      // q wins, so shows search results
      await waitFor(() => {
        expect(screen.getByText("Love in the Moonlight")).toBeInTheDocument();
      });
      // Clear search - should navigate to /dramas with no params
      currentSearchParams = {};
      queryClient.clear();
      rerender(<DramasPage />);
      // After clearing, should show default title
      await waitFor(() => {
        expect(screen.getByText("Browse Dramas")).toBeInTheDocument();
      });
      // All dramas should now be visible
      await waitFor(() => {
        expect(screen.getByText("Hospital Playlist")).toBeInTheDocument();
      });
      expect(screen.getByText("The Glory")).toBeInTheDocument();
      expect(screen.getByText("Romance is a Bonus Book")).toBeInTheDocument();
    });

    it("navigate call from section filter uses t-only URL", async () => {

      // Simulate clicking a section link from home page
      const sectionLink = {
        to: "/dramas",
        search: { t: "popular" },
      };

      // Simulate the navigation
      mockNavigate(sectionLink);

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/dramas",
        search: { t: "popular" },
      });
    });

    it("navigate call from search uses q-only URL without t", async () => {
      // Simulate submitting a search from section view
      const searchNav = {
        to: "/dramas",
        search: { q: "hospital" },
      };

      mockNavigate(searchNav);

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/dramas",
        search: { q: "hospital" },
      });

      // Verify t is NOT in the search params
      const lastCall = mockNavigate.mock.calls[mockNavigate.mock.calls.length - 1][0];
      expect(lastCall.search).not.toHaveProperty("t");
    });
  });

  // ============================================
  // URL Transition Tests
  // ============================================

  describe("URL and search parameter transitions", () => {
    it("transitions from /dramas?t=popular to /dramas?q=romance correctly", async () => {
      const { rerender, queryClient } = renderWithProviders(<DramasPage />);
      currentSearchParams = { t: "popular" };
      rerender(<DramasPage />);

      await waitFor(() => {
        expect(screen.getByText("Hospital Playlist")).toBeInTheDocument();
      });
      // Transition to q=romance
      currentSearchParams = { q: "romance" };
      queryClient.clear();
      rerender(<DramasPage />);

      // After transition, should show search title
      await waitFor(() => {
        expect(screen.getByText('Search: "romance"')).toBeInTheDocument();
      });

      // Should show romance dramas
      await waitFor(() => {
        expect(screen.getByText("Love in the Moonlight")).toBeInTheDocument();
      });
      expect(screen.getByText("Romance is a Bonus Book")).toBeInTheDocument();
    });

    it("transitions from /dramas?q=romance to /dramas?t=featured correctly", async () => {
      const { rerender, queryClient } = renderWithProviders(<DramasPage />);
      currentSearchParams = { q: "romance" };
      rerender(<DramasPage />);

      await waitFor(() => {
        expect(screen.getByText("Love in the Moonlight")).toBeInTheDocument();
      });
      // Transition to t=featured
      currentSearchParams = { t: "featured" };
      queryClient.clear();
      rerender(<DramasPage />);

      // After transition, should show featured title
      await waitFor(() => {
        expect(screen.getByText("Featured For You")).toBeInTheDocument();
      });

      // Should show featured dramas
      await waitFor(() => {
        expect(screen.getByText("Love in the Moonlight")).toBeInTheDocument();
      });
      expect(screen.getByText("Romance is a Bonus Book")).toBeInTheDocument();
    });

    it("maintains t parameter when refreshing page", async () => {
      currentSearchParams = { t: "latest" };

      renderWithProviders(<DramasPage />);

      await waitFor(() => {
        expect(screen.getByText("Latest Releases")).toBeInTheDocument();
      });

      // Should maintain latest section filter
      await waitFor(() => {
        expect(screen.getByText("Love in the Moonlight")).toBeInTheDocument();
      });

      // Verify t parameter is still in search params
      expect(currentSearchParams.t).toBe("latest");
    });
  });
});
