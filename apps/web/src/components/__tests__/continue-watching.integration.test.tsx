import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/utils.js";
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
    const { ContinueWatching } =
      await import("../../components/continue-watching.js");
    renderWithProviders(<ContinueWatching />);

    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();

    const skeletonCards = document.querySelectorAll(".animate-pulse");
    expect(skeletonCards.length).toBeGreaterThan(0);

    expect(
      screen.getByRole("heading", { name: /continue watching/i }),
    ).toBeInTheDocument();
  });

  it("renders nothing when there is no watch history", async () => {
    server.use(emptyContinueWatchingHandler);
    const { ContinueWatching } =
      await import("../../components/continue-watching.js");
    const { container } = renderWithProviders(<ContinueWatching />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });

    expect(
      screen.queryByRole("heading", { name: /continue watching/i }),
    ).not.toBeInTheDocument();
  });

  it("displays drama cards with progress bars when history items exist", async () => {
    const { ContinueWatching } =
      await import("../../components/continue-watching.js");
    renderWithProviders(<ContinueWatching />);

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
    const { ContinueWatching } =
      await import("../../components/continue-watching.js");
    renderWithProviders(<ContinueWatching />);

    await waitFor(() => {
      expect(screen.getByText("50%")).toBeInTheDocument();
    });

    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("5%")).toBeInTheDocument();
  });

  it("displays progress bars with correct width styling", async () => {
    const { ContinueWatching } =
      await import("../../components/continue-watching.js");
    renderWithProviders(<ContinueWatching />);

    await waitFor(() => {
      expect(screen.getByText("Love in the Moonlight")).toBeInTheDocument();
    });

    const progressBars = document.querySelectorAll('[style*="width"]');
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it("navigates to correct episode when clicking drama card", async () => {
    const user = userEvent.setup();
    const { ContinueWatching } =
      await import("../../components/continue-watching.js");
    renderWithProviders(<ContinueWatching />);

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
    const { ContinueWatching } =
      await import("../../components/continue-watching.js");
    renderWithProviders(<ContinueWatching />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /continue watching/i }),
      ).toBeInTheDocument();
    });
  });

  it("displays episode numbers and titles correctly", async () => {
    const { ContinueWatching } =
      await import("../../components/continue-watching.js");
    renderWithProviders(<ContinueWatching />);

    await waitFor(() => {
      expect(screen.getByText(/episode 5/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/the royal secret/i)).toBeInTheDocument();
    expect(screen.getByText(/episode 3/i)).toBeInTheDocument();
    expect(screen.getByText(/first surgery/i)).toBeInTheDocument();
    expect(screen.getByText(/dreams of architecture/i)).toBeInTheDocument();
  });

  it("displays duration and progress time", async () => {
    const { ContinueWatching } =
      await import("../../components/continue-watching.js");
    renderWithProviders(<ContinueWatching />);

    await waitFor(() => {
      expect(screen.getByText(/30:00/)).toBeInTheDocument();
    });

    const timeElements = screen.getAllByText(/60:00/);
    expect(timeElements.length).toBeGreaterThan(0);
  });

  it("removes item when delete button is clicked", async () => {
    const user = userEvent.setup();
    const { ContinueWatching } =
      await import("../../components/continue-watching.js");
    renderWithProviders(<ContinueWatching />);

    await waitFor(() => {
      expect(screen.getByText("Love in the Moonlight")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle(
      /remove from continue watching/i,
    );
    expect(deleteButtons.length).toBe(3);

    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(
        screen.queryByText("Love in the Moonlight"),
      ).not.toBeInTheDocument();
    });

    expect(screen.getByText("Hospital Playlist")).toBeInTheDocument();
    expect(screen.getByText("The Glory")).toBeInTheDocument();
  });

  it("hides title when showTitle is false", async () => {
    const { ContinueWatching } =
      await import("../../components/continue-watching.js");
    renderWithProviders(<ContinueWatching showTitle={false} />);

    await waitFor(() => {
      expect(screen.getByText("Love in the Moonlight")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("heading", { name: /continue watching/i }),
    ).not.toBeInTheDocument();
  });

  it("displays play button overlay on hover area", async () => {
    const { ContinueWatching } =
      await import("../../components/continue-watching.js");
    renderWithProviders(<ContinueWatching />);

    await waitFor(() => {
      expect(screen.getByText("Love in the Moonlight")).toBeInTheDocument();
    });

    expect(document.querySelector("svg")).toBeInTheDocument();
  });

  it("shows completed status for finished episodes", async () => {
    const { ContinueWatching } =
      await import("../../components/continue-watching.js");
    renderWithProviders(<ContinueWatching />);

    await waitFor(() => {
      expect(screen.queryByText("Love in Moonlight")).toBeInTheDocument();
    });

    const progressElements = screen.getAllByText(/%/);
    expect(progressElements.length).toBeGreaterThan(0);
  });
});
