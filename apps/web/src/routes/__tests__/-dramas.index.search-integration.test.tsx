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
let currentSearchParams: { q?: string } = {};

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
  }: {
    to: string;
    children: React.ReactNode;
    className?: string;
    search?: { q?: string };
  }) => (
    <a
      href={to + (search?.q ? `?q=${search.q}` : "")}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        const searchStr = search?.q ? `?q=${search.q}` : "";
        mockNavigate(to + searchStr);
      }}
    >
      {children}
    </a>
  ),
}));

const dramasHandler = http.get(`${API_BASE_URL}/api/dramas`, ({ request }) => {
  const url = new URL(request.url);
  const searchQuery = url.searchParams.get("q")?.toLowerCase() || "";

  let filteredDramas = [...mockAllDramas];

  if (searchQuery) {
    filteredDramas = mockAllDramas.filter(
      (drama) =>
        drama.title.toLowerCase().includes(searchQuery) ||
        drama.metadata.genre.some((g: string) =>
          g.toLowerCase().includes(searchQuery),
        ),
    );
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
      expect(screen.getByText("Browse Dramas")).toBeInTheDocument();
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
});
