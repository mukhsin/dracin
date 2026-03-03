import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/utils.js";
import { ContinueWatching } from "../../components/continue-watching.js";
import { server } from "../../test/mocks/server.js";
import {
  resetMockData,
  emptyContinueWatchingHandler,
  mockContinueWatchingItems,
} from "../../test/mocks/handlers.js";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router");
  return {
    ...actual,
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

describe("Continue Watching Flow Integration Tests", () => {
  beforeEach(() => {
    resetMockData();
    mockNavigate.mockClear();
    server.resetHandlers();
  });

  it("shows skeleton cards during loading state", async () => {
    renderWithProviders(<ContinueWatching isAuthenticated />);

    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();

    const skeletonCards = document.querySelectorAll(".animate-pulse");
    expect(skeletonCards.length).toBeGreaterThan(0);

    expect(
      screen.queryByRole("heading", { name: /continue watching/i }),
    ).not.toBeInTheDocument();
  });

  it("renders nothing when there is no watch history", async () => {
    server.use(emptyContinueWatchingHandler);
    const { container } = renderWithProviders(
      <ContinueWatching isAuthenticated />,
    );

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });

    expect(
      screen.queryByRole("heading", { name: /continue watching/i }),
    ).not.toBeInTheDocument();
  });

  it("displays drama cards with progress bars when history items exist", async () => {
    renderWithProviders(<ContinueWatching isAuthenticated />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /continue watching/i }),
      ).toBeInTheDocument();
    });

    for (const item of mockContinueWatchingItems) {
      await waitFor(() => {
        expect(screen.getByText(item.dramaTitle)).toBeInTheDocument();
      });
    }

    expect(screen.getByText("Love in the Moonlight")).toBeInTheDocument();
    expect(screen.getByText("Hospital Playlist")).toBeInTheDocument();
    expect(screen.getByText("The Glory")).toBeInTheDocument();
  });

  it("displays correct progress percentages", async () => {
    renderWithProviders(<ContinueWatching isAuthenticated />);

    await waitFor(() => {
      expect(screen.getByText("50%")).toBeInTheDocument();
    });

    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("5%")).toBeInTheDocument();
  });

  it("displays progress bars with correct width styling", async () => {
    renderWithProviders(<ContinueWatching isAuthenticated />);

    await waitFor(() => {
      expect(screen.getByText("Love in the Moonlight")).toBeInTheDocument();
    });

    const progressBars = document.querySelectorAll('[style*="width"]');
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it("navigates to correct episode when clicking drama card", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContinueWatching isAuthenticated />);

    await waitFor(() => {
      expect(screen.getByText("Love in the Moonlight")).toBeInTheDocument();
    });

    const dramaTitle = screen.getByText("Love in the Moonlight");
    await user.click(dramaTitle);

    expect(mockNavigate).toHaveBeenCalledWith(
      "/dramas/$dramaSlug/$episodeNumber",
    );
  });

  it("shows Continue Watching header only when items exist", async () => {
    renderWithProviders(<ContinueWatching isAuthenticated />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /continue watching/i }),
      ).toBeInTheDocument();
    });
  });

  it("displays episode numbers and titles correctly", async () => {
    renderWithProviders(<ContinueWatching isAuthenticated />);

    await waitFor(() => {
      expect(screen.getByText(/episode 5/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/episode 5/i)).toBeInTheDocument();
    expect(screen.getByText(/episode 3/i)).toBeInTheDocument();
    expect(screen.getByText(/episode 1/i)).toBeInTheDocument();
    expect(screen.queryByText(/the royal secret/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/first surgery/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/dreams of architecture/i),
    ).not.toBeInTheDocument();
  });

  it("displays duration and progress time", async () => {
    renderWithProviders(<ContinueWatching isAuthenticated />);

    await waitFor(() => {
      expect(screen.getByText(/30:00/)).toBeInTheDocument();
    });

    const timeElements = screen.getAllByText(/60:00/);
    expect(timeElements.length).toBeGreaterThan(0);
  });

  it("removes item when delete button is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContinueWatching isAuthenticated />);

    await waitFor(() => {
      expect(screen.getByText("Love in the Moonlight")).toBeInTheDocument();
    });

    const loveInTheMoonlightTitle = screen.getByText("Love in the Moonlight");
    const loveInTheMoonlightCard = loveInTheMoonlightTitle.closest(".group");

    expect(loveInTheMoonlightCard).not.toBeNull();

    const deleteButton = within(
      loveInTheMoonlightCard as HTMLElement,
    ).getByTitle(/remove from continue watching/i);

    await user.click(deleteButton);

    await waitFor(() => {
      expect(
        screen.queryByText("Love in the Moonlight"),
      ).not.toBeInTheDocument();
    });

    expect(screen.getByText("Hospital Playlist")).toBeInTheDocument();
    expect(screen.getByText("The Glory")).toBeInTheDocument();
  });

  it("hides title when showTitle is false", async () => {
    renderWithProviders(<ContinueWatching showTitle={false} isAuthenticated />);

    await waitFor(() => {
      expect(screen.getByText("Love in the Moonlight")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("heading", { name: /continue watching/i }),
    ).not.toBeInTheDocument();
  });

  it("displays play button overlay on hover area", async () => {
    renderWithProviders(<ContinueWatching isAuthenticated />);

    await waitFor(() => {
      expect(screen.getByText("Love in the Moonlight")).toBeInTheDocument();
    });

    expect(document.querySelector("svg")).toBeInTheDocument();
  });

  it("shows progress indicators when continue items render", async () => {
    renderWithProviders(<ContinueWatching isAuthenticated />);

    await waitFor(() => {
      expect(screen.getByText("Love in the Moonlight")).toBeInTheDocument();
    });

    const progressElements = screen.getAllByText(/%/);
    expect(progressElements.length).toBeGreaterThan(0);
  });
});
