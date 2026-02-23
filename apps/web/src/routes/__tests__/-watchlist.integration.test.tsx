import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/utils.js";
import { server } from "../../test/mocks/server.js";
import {
  resetMockData,
  setWatchlistEmpty,
  unauthorizedHandler,
  serverErrorHandler,
  mockWatchlistItems,
} from "../../test/mocks/handlers.js";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => ({
      component: null,
    }),
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
        onClick={(e) => {
          e.preventDefault();
          mockNavigate(to);
        }}
      >
        {children}
      </a>
    ),
    useNavigate: () => mockNavigate,
  };
});

describe("Watchlist Flow Integration Tests", () => {
  let WatchlistPage: React.ComponentType;

  beforeEach(async () => {
    resetMockData();
    mockNavigate.mockClear();
    server.resetHandlers();

    const module = await import("../watchlist.js");
    WatchlistPage = module.WatchlistPage as React.ComponentType;
  });

  it("shows skeleton UI during loading state", async () => {
    renderWithProviders(<WatchlistPage />);

    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
    expect(document.querySelectorAll(".bg-muted").length).toBeGreaterThan(0);
  });

  it("shows empty state with browse link when watchlist is empty", async () => {
    setWatchlistEmpty();
    renderWithProviders(<WatchlistPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /your watchlist is empty/i }),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        /start adding dramas you want to watch later\. they'll appear here for easy access\./i,
      ),
    ).toBeInTheDocument();

    const browseLink = screen.getByRole("link", { name: /browse dramas/i });
    expect(browseLink).toBeInTheDocument();
    expect(browseLink).toHaveAttribute("href", "/dramas");
  });

  it("shows sign-in prompt on 401 error", async () => {
    server.use(unauthorizedHandler);
    renderWithProviders(<WatchlistPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/please sign in to view your watchlist/i),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/you need to be signed in to access your watchlist/i),
    ).toBeInTheDocument();

    const signInButton = screen.getByRole("link", { name: /sign in/i });
    expect(signInButton).toBeInTheDocument();
    expect(signInButton).toHaveAttribute("href", "/auth/signin");
  });

  it("shows retry button on 500 error", async () => {
    server.use(serverErrorHandler);
    renderWithProviders(<WatchlistPage />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load watchlist/i)).toBeInTheDocument();
    });

    expect(
      screen.getByText(/we couldn't load your watchlist\. please try again\./i),
    ).toBeInTheDocument();

    const retryButton = screen.getByRole("button", { name: /try again/i });
    expect(retryButton).toBeInTheDocument();
  });

  it("displays drama cards with correct data when watchlist has items", async () => {
    renderWithProviders(<WatchlistPage />);

    await waitFor(() => {
      expect(screen.getByText("My Watchlist")).toBeInTheDocument();
    });

    expect(screen.getByText(/3 dramas saved/i)).toBeInTheDocument();

    for (const item of mockWatchlistItems) {
      await waitFor(() => {
        expect(screen.getByText(item.drama.title)).toBeInTheDocument();
      });
    }

    expect(screen.getByText("Love in the Moonlight")).toBeInTheDocument();
    expect(screen.getByText("Hospital Playlist")).toBeInTheDocument();
    expect(screen.getByText("The Glory")).toBeInTheDocument();
  });

  it("displays correct drama metadata on cards", async () => {
    renderWithProviders(<WatchlistPage />);

    await waitFor(() => {
      expect(screen.getByText("My Watchlist")).toBeInTheDocument();
    });

    const romanceTag = await screen.findByText("Romance");
    expect(romanceTag).toBeInTheDocument();

    const historicalTag = await screen.findByText("Historical");
    expect(historicalTag).toBeInTheDocument();

    expect(screen.getByText("2023")).toBeInTheDocument();
    expect(screen.getByText(/16 eps/i)).toBeInTheDocument();

    expect(screen.getByText("completed")).toBeInTheDocument();
    expect(screen.getByText("ongoing")).toBeInTheDocument();
  });

  it("removes item when remove button is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<WatchlistPage />);

    await waitFor(() => {
      expect(screen.getByText("My Watchlist")).toBeInTheDocument();
    });

    expect(screen.getByText(/3 dramas saved/i)).toBeInTheDocument();

    const removeButtons = screen.getAllByLabelText(/remove from watchlist/i);
    expect(removeButtons.length).toBe(3);

    await user.click(removeButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/2 dramas saved/i)).toBeInTheDocument();
    });

    expect(screen.queryByText("Love in the Moonlight")).not.toBeInTheDocument();
  });

  it("displays singular drama count correctly", async () => {
    const user = userEvent.setup();
    renderWithProviders(<WatchlistPage />);

    await waitFor(() => {
      expect(screen.getByText("My Watchlist")).toBeInTheDocument();
    });

    const removeButtons = screen.getAllByLabelText(/remove from watchlist/i);
    await user.click(removeButtons[0]);
    await user.click(removeButtons[1]);

    await waitFor(() => {
      expect(screen.getByText(/1 drama saved/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/1 dramas saved/i)).not.toBeInTheDocument();
  });

  it("navigates to drama detail page when clicking drama title", async () => {
    const user = userEvent.setup();
    renderWithProviders(<WatchlistPage />);

    await waitFor(() => {
      expect(screen.getByText("My Watchlist")).toBeInTheDocument();
    });

    const dramaTitle = screen.getByText("Love in the Moonlight");
    await user.click(dramaTitle);

    expect(mockNavigate).toHaveBeenCalledWith("/dramas/love-in-the-moonlight");
  });

  it("shows Browse More link when watchlist has items", async () => {
    renderWithProviders(<WatchlistPage />);

    await waitFor(() => {
      expect(screen.getByText("My Watchlist")).toBeInTheDocument();
    });

    const browseMoreLink = screen.getByRole("link", { name: /browse more/i });
    expect(browseMoreLink).toBeInTheDocument();
    expect(browseMoreLink).toHaveAttribute("href", "/dramas");
  });

  it("shows navigation header with correct links", async () => {
    renderWithProviders(<WatchlistPage />);

    await waitFor(() => {
      expect(screen.getByText("DramaStream")).toBeInTheDocument();
    });

    expect(screen.getByRole("link", { name: /dramas/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /watchlist/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /history/i })).toBeInTheDocument();
  });

  it("displays added date on watchlist cards", async () => {
    renderWithProviders(<WatchlistPage />);

    await waitFor(() => {
      expect(screen.getByText("My Watchlist")).toBeInTheDocument();
    });

    const addedTexts = screen.getAllByText(/added/i);
    expect(addedTexts.length).toBeGreaterThan(0);
  });
});
