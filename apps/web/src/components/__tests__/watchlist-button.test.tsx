import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, screen, waitFor } from "../../test/utils.js";
import { WatchlistButton } from "../watchlist-button.js";

const mockAddToWatchlist = vi.fn();
const mockRemoveFromWatchlist = vi.fn();

vi.mock("../../hooks/use-watchlist.js", () => ({
  useWatchlistStatus: vi.fn(),
  useAddToWatchlist: vi.fn(),
  useRemoveFromWatchlist: vi.fn(),
}));

import {
  useWatchlistStatus,
  useAddToWatchlist,
  useRemoveFromWatchlist,
} from "../../hooks/use-watchlist.js";

describe("WatchlistButton", () => {
  const dramaId = "test-drama-123";

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("loading state", () => {
    it("shows loading spinner when checking watchlist status", () => {
      vi.mocked(useWatchlistStatus).mockReturnValue({
        data: undefined,
        isLoading: true,
        isPending: true,
      } as any);

      vi.mocked(useAddToWatchlist).mockReturnValue({
        mutate: mockAddToWatchlist,
        isPending: false,
      } as any);

      vi.mocked(useRemoveFromWatchlist).mockReturnValue({
        mutate: mockRemoveFromWatchlist,
        isPending: false,
      } as any);

      renderWithProviders(<WatchlistButton dramaId={dramaId} />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("shows loading spinner when mutation is pending", () => {
      vi.mocked(useWatchlistStatus).mockReturnValue({
        data: false,
        isLoading: false,
        isPending: false,
      } as any);

      vi.mocked(useAddToWatchlist).mockReturnValue({
        mutate: mockAddToWatchlist,
        isPending: true,
      } as any);

      vi.mocked(useRemoveFromWatchlist).mockReturnValue({
        mutate: mockRemoveFromWatchlist,
        isPending: false,
      } as any);

      renderWithProviders(<WatchlistButton dramaId={dramaId} />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
      expect(screen.getByRole("button")).toBeDisabled();
    });
  });

  describe("add to watchlist state", () => {
    beforeEach(() => {
      vi.mocked(useWatchlistStatus).mockReturnValue({
        data: false,
        isLoading: false,
        isPending: false,
      } as any);

      vi.mocked(useAddToWatchlist).mockReturnValue({
        mutate: mockAddToWatchlist,
        isPending: false,
      } as any);

      vi.mocked(useRemoveFromWatchlist).mockReturnValue({
        mutate: mockRemoveFromWatchlist,
        isPending: false,
      } as any);
    });

    it("renders add to watchlist button when drama is not in watchlist", () => {
      renderWithProviders(<WatchlistButton dramaId={dramaId} />);

      expect(screen.getByText("Add to Watchlist")).toBeInTheDocument();
      expect(screen.getByRole("button")).toBeEnabled();
    });

    it("calls add to watchlist when clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(<WatchlistButton dramaId={dramaId} />);

      const button = screen.getByRole("button");
      await user.click(button);

      await waitFor(() => {
        expect(mockAddToWatchlist).toHaveBeenCalledWith(dramaId);
      });
    });

    it("has correct aria-label for add action", () => {
      renderWithProviders(<WatchlistButton dramaId={dramaId} />);

      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-label",
        "Add to watchlist",
      );
    });
  });

  describe("in watchlist state", () => {
    beforeEach(() => {
      vi.mocked(useWatchlistStatus).mockReturnValue({
        data: true,
        isLoading: false,
        isPending: false,
      } as any);

      vi.mocked(useAddToWatchlist).mockReturnValue({
        mutate: mockAddToWatchlist,
        isPending: false,
      } as any);

      vi.mocked(useRemoveFromWatchlist).mockReturnValue({
        mutate: mockRemoveFromWatchlist,
        isPending: false,
      } as any);
    });

    it("renders in watchlist button when drama is in watchlist", () => {
      renderWithProviders(<WatchlistButton dramaId={dramaId} />);

      expect(screen.getByText("In Watchlist")).toBeInTheDocument();
      expect(screen.getByRole("button")).toBeEnabled();
    });

    it("calls remove from watchlist when clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(<WatchlistButton dramaId={dramaId} />);

      const button = screen.getByRole("button");
      await user.click(button);

      await waitFor(() => {
        expect(mockRemoveFromWatchlist).toHaveBeenCalledWith(dramaId);
      });
    });

    it("has correct aria-label for remove action", () => {
      renderWithProviders(<WatchlistButton dramaId={dramaId} />);

      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-label",
        "Remove from watchlist",
      );
    });
  });

  describe("hover behavior", () => {
    beforeEach(() => {
      vi.mocked(useWatchlistStatus).mockReturnValue({
        data: true,
        isLoading: false,
        isPending: false,
      } as any);

      vi.mocked(useAddToWatchlist).mockReturnValue({
        mutate: mockAddToWatchlist,
        isPending: false,
      } as any);

      vi.mocked(useRemoveFromWatchlist).mockReturnValue({
        mutate: mockRemoveFromWatchlist,
        isPending: false,
      } as any);
    });

    it("shows remove text on hover when in watchlist", async () => {
      const user = userEvent.setup();
      renderWithProviders(<WatchlistButton dramaId={dramaId} />);

      const button = screen.getByRole("button");

      expect(screen.getByText("In Watchlist")).toBeInTheDocument();

      await user.hover(button);

      await waitFor(() => {
        expect(screen.getByText("Remove")).toBeInTheDocument();
      });
    });

    it("reverts to in watchlist text on mouse leave", async () => {
      const user = userEvent.setup();
      renderWithProviders(<WatchlistButton dramaId={dramaId} />);

      const button = screen.getByRole("button");

      await user.hover(button);
      await waitFor(() => {
        expect(screen.getByText("Remove")).toBeInTheDocument();
      });

      await user.unhover(button);

      await waitFor(() => {
        expect(screen.getByText("In Watchlist")).toBeInTheDocument();
      });
    });
  });

  describe("different sizes", () => {
    beforeEach(() => {
      vi.mocked(useWatchlistStatus).mockReturnValue({
        data: false,
        isLoading: false,
        isPending: false,
      } as any);

      vi.mocked(useAddToWatchlist).mockReturnValue({
        mutate: mockAddToWatchlist,
        isPending: false,
      } as any);

      vi.mocked(useRemoveFromWatchlist).mockReturnValue({
        mutate: mockRemoveFromWatchlist,
        isPending: false,
      } as any);
    });

    it("renders small size correctly", () => {
      renderWithProviders(<WatchlistButton dramaId={dramaId} size="sm" />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-8", "px-3", "text-xs");
    });

    it("renders medium size correctly", () => {
      renderWithProviders(<WatchlistButton dramaId={dramaId} size="md" />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-10", "px-4", "text-sm");
    });

    it("renders large size correctly", () => {
      renderWithProviders(<WatchlistButton dramaId={dramaId} size="lg" />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-12", "px-6", "text-base");
    });
  });
});
