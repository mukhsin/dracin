/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/utils.js";
import { server } from "../../test/mocks/server.js";
import { resetMockData } from "../../test/mocks/handlers.js";

const mockNavigate = vi.fn();
const mockLogout = vi.fn();

const mockAuthState: {
  user: { id: string } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: typeof mockLogout;
} = {
  user: { id: "user-1" },
  isAuthenticated: true,
  isLoading: false,
  logout: mockLogout,
};

const mockHomeDataState = {
  rank1: {
    data: {
      items: [
        {
          id: "hero-1",
          title: "Drama Streaming App",
          slug: "drama-streaming-app",
          description:
            "Your favorite dramas, all in one place. Stream anytime, anywhere.",
          posterUrl: "https://example.com/hero.jpg",
        },
      ],
      total: 1,
    },
    isLoading: false,
    isError: false,
    error: null,
  },
  featured: {
    data: {
      items: [
        {
          id: "featured-1",
          title: "Featured Drama",
          slug: "featured-drama",
          description: "Featured description",
          posterUrl: "https://example.com/featured.jpg",
          status: "ongoing",
          language: "Korean",
          playCount: 100,
        },
      ],
      total: 1,
    },
    isLoading: false,
    isError: false,
    error: null,
  },
  latest: {
    data: {
      items: [
        {
          id: "latest-1",
          title: "Latest Drama",
          slug: "latest-drama",
          description: "Latest description",
          posterUrl: "https://example.com/latest.jpg",
          status: "ongoing",
          language: "Korean",
          playCount: 50,
        },
      ],
      total: 1,
    },
    isLoading: false,
    isError: false,
    error: null,
  },
  popular: {
    data: {
      items: [
        {
          id: "popular-1",
          title: "Most Popular Drama",
          slug: "most-popular-drama",
          description: "Popular description",
          posterUrl: "https://example.com/popular.jpg",
          status: "completed",
          language: "Korean",
          playCount: 1000,
        },
      ],
      total: 1,
    },
    isLoading: false,
    isError: false,
    error: null,
  },
  isLoading: false,
  isError: false,
};

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: { component: React.ComponentType }) =>
    options,
  Link: ({
    to,
    children,
    className,
  }: {
    to: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a
      href={to}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        mockNavigate(to);
      }}
    >
      {children}
    </a>
  ),
  useNavigate: () => mockNavigate,
}));

vi.mock("../../hooks/use-auth.js", () => ({
  useAuth: () => mockAuthState,
}));

vi.mock("../../hooks/use-home-data.js", () => ({
  useHomeData: () => mockHomeDataState,
}));

async function renderHomePage() {
  const { HomePage } = await import("../index.js");
  return renderWithProviders(<HomePage />);
}

describe("Home Page Flow Integration Tests", () => {
  beforeEach(() => {
    resetMockData();
    mockNavigate.mockClear();
    mockLogout.mockClear();
    server.resetHandlers();
    mockAuthState.user = { id: "user-1" };
    mockAuthState.isAuthenticated = true;
    mockAuthState.isLoading = false;
  });

  it("renders hero section with app title and description", async () => {
    await renderHomePage();

    expect(
      screen.getByRole("heading", { name: /drama streaming app/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /your favorite dramas, all in one place\. stream anytime, anywhere\./i,
      ),
    ).toBeInTheDocument();
  });

  it("navigates to most popular section view-all route", async () => {
    const user = userEvent.setup();
    await renderHomePage();

    const seeAllLinks = await screen.findAllByRole("link", {
      name: /see all/i,
    });
    const mostPopularSeeAll = seeAllLinks[0];

    expect(mostPopularSeeAll).toHaveAttribute("href", "/dramas?t=popular");

    await user.click(mostPopularSeeAll);
    expect(mockNavigate).toHaveBeenCalledWith("/dramas?t=popular");
  });

  it("does not render Continue Watching heading for unauthenticated users", async () => {
    mockAuthState.user = { id: "guest" };
    mockAuthState.isAuthenticated = false;

    await renderHomePage();

    expect(
      await screen.findByRole("heading", { name: /^most popular$/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /continue watching/i }),
    ).not.toBeInTheDocument();
  });

  it("renders Continue Watching heading for authenticated users with data", async () => {
    await renderHomePage();

    expect(
      await screen.findByRole("heading", { name: /continue watching/i }),
    ).toBeInTheDocument();
  });

  it("renders Continue Watching before Most Popular for authenticated users", async () => {
    await renderHomePage();

    const continueWatchingHeading = await screen.findByRole("heading", {
      name: /continue watching/i,
    });
    const mostPopularHeading = await screen.findByRole("heading", {
      name: /^most popular$/i,
    });

    expect(
      continueWatchingHeading.compareDocumentPosition(mostPopularHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
