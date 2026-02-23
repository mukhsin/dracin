import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/utils.js";
import { server } from "../../test/mocks/server.js";
import { resetMockData } from "../../test/mocks/handlers.js";

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

describe("Home Page Flow Integration Tests", () => {
  let HomePage: React.ComponentType;

  beforeEach(async () => {
    resetMockData();
    mockNavigate.mockClear();
    server.resetHandlers();

    vi.resetModules();
    const module = await import("../index.js");
    HomePage = module.HomePage as React.ComponentType;
  });

  it("renders hero section with app title and description", async () => {
    renderWithProviders(<HomePage />);

    expect(
      screen.getByRole("heading", { name: /drama streaming app/i }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /your favorite dramas, all in one place\. stream anytime, anywhere\./i,
      ),
    ).toBeInTheDocument();
  });

  it('navigates to /dramas when "Browse Dramas" link is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);

    const browseLink = screen.getByRole("link", { name: /browse dramas/i });
    expect(browseLink).toBeInTheDocument();
    expect(browseLink).toHaveAttribute("href", "/dramas");

    await user.click(browseLink);
    expect(mockNavigate).toHaveBeenCalledWith("/dramas");
  });

  it('navigates to /auth/signin when "Sign In" link is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);

    const signInLink = screen.getByRole("link", { name: /sign in/i });
    expect(signInLink).toBeInTheDocument();
    expect(signInLink).toHaveAttribute("href", "/auth/signin");

    await user.click(signInLink);
    expect(mockNavigate).toHaveBeenCalledWith("/auth/signin");
  });

  it("displays all feature cards", async () => {
    renderWithProviders(<HomePage />);

    expect(
      screen.getByRole("heading", { name: /hd streaming/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /watch your favorite dramas in high definition quality\./i,
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: /watchlist/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/save dramas to your personal watchlist for later\./i),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: /track progress/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/resume watching exactly where you left off\./i),
    ).toBeInTheDocument();
  });

  it("renders ContinueWatching component", async () => {
    renderWithProviders(<HomePage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /continue watching/i }),
      ).toBeInTheDocument();
    });
  });

  it("displays correct number of feature cards in grid layout", async () => {
    renderWithProviders(<HomePage />);

    const featureCards = screen.getAllByText(
      /watch your favorite dramas|save dramas to your|resume watching exactly/i,
    );
    expect(featureCards.length).toBe(3);
  });

  it("feature cards have correct styling classes", async () => {
    renderWithProviders(<HomePage />);

    const featureSection = screen
      .getByRole("heading", { name: /hd streaming/i })
      .closest("div")?.parentElement;
    expect(featureSection).toHaveClass("grid");
  });

  it("renders ContinueWatching with history items when available", async () => {
    renderWithProviders(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText("Love in the Moonlight")).toBeInTheDocument();
    });

    expect(screen.getByText("Hospital Playlist")).toBeInTheDocument();
    expect(screen.getByText("The Glory")).toBeInTheDocument();
  });

  it("displays View All link when there are more than maxItems", async () => {
    renderWithProviders(<HomePage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /continue watching/i }),
      ).toBeInTheDocument();
    });

    const viewAllLink = screen.getByRole("link", { name: /view all/i });
    expect(viewAllLink).toBeInTheDocument();
    expect(viewAllLink).toHaveAttribute("href", "/history");
  });

  it("displays progress bars for continue watching items", async () => {
    renderWithProviders(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText("50%")).toBeInTheDocument();
    });

    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("5%")).toBeInTheDocument();
  });

  it("displays episode numbers and titles", async () => {
    renderWithProviders(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText(/episode 5/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/the royal secret/i)).toBeInTheDocument();
    expect(screen.getByText(/episode 3/i)).toBeInTheDocument();
    expect(screen.getByText(/first surgery/i)).toBeInTheDocument();
  });

  it("navigates to correct episode when clicking continue watching item", async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText("Love in the Moonlight")).toBeInTheDocument();
    });

    const dramaTitle = screen.getByText("Love in the Moonlight");
    await user.click(dramaTitle);

    expect(mockNavigate).toHaveBeenCalledWith("/dramas/ep-001");
  });
});
