import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, screen, waitFor } from "../../test/utils.js";
import { SearchIcon } from "../search-icon.js";

// Mock navigation for search param updates
const mockNavigate = vi.fn();

// Mutable state for mocking router
let mockSearchParams: Record<string, string | undefined> = {};
let mockPathname = "/";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useSearch: () => mockSearchParams,
  useLocation: () => ({ pathname: mockPathname }),
}));

describe("SearchIcon", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockSearchParams = {};
    mockPathname = "/";
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("rendering", () => {
    it("renders search icon button", () => {
      renderWithProviders(<SearchIcon />);

      const searchButton = screen.getByRole("button", {
        name: /toggle search/i,
      });
      expect(searchButton).toBeInTheDocument();
    });

    it("renders search icon SVG inside toggle button", () => {
      renderWithProviders(<SearchIcon />);

      const searchButton = screen.getByRole("button", {
        name: /toggle search/i,
      });
      expect(searchButton.querySelector("svg")).toBeInTheDocument();
    });
  });

  describe("expand/collapse behavior", () => {
    it("expands search box when icon is clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(<SearchIcon />);

      const searchButton = screen.getByRole("button", {
        name: /toggle search/i,
      });

      expect(screen.queryByPlaceholderText("Search dramas...")).not.toBeInTheDocument();

      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search dramas...")).toBeInTheDocument();
      });
    });

    it("collapses search box when clicking outside", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <div>
          <SearchIcon />
          <div data-testid="outside">Outside element</div>
        </div>,
      );

      const searchButton = screen.getByRole("button", {
        name: /toggle search/i,
      });
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search dramas...")).toBeInTheDocument();
      });

      const outsideElement = screen.getByTestId("outside");
      await user.click(outsideElement);

      await waitFor(() => {
        expect(screen.queryByPlaceholderText("Search dramas...")).not.toBeInTheDocument();
      });
    });

    it("collapses search box when escape key is pressed", async () => {
      const user = userEvent.setup();
      renderWithProviders(<SearchIcon />);

      const searchButton = screen.getByRole("button", {
        name: /toggle search/i,
      });
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search dramas...")).toBeInTheDocument();
      });

      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(screen.queryByPlaceholderText("Search dramas...")).not.toBeInTheDocument();
      });
    });
  });

  describe("search input behavior", () => {
    it("updates search param when typing in input", async () => {
      const user = userEvent.setup();
      renderWithProviders(<SearchIcon />);

      const searchButton = screen.getByRole("button", {
        name: /toggle search/i,
      });
      await user.click(searchButton);

      const searchInput = await screen.findByPlaceholderText("Search dramas...");
      await user.type(searchInput, "romance drama");

      expect(searchInput).toHaveValue("romance drama");
    });
  });

  describe("navigation behavior", () => {
    it("does not navigate on click", async () => {
      const user = userEvent.setup();
      renderWithProviders(<SearchIcon />);

      const searchButton = screen.getByRole("button", {
        name: /toggle search/i,
      });

      // Click to expand
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search dramas...")).toBeInTheDocument();
      });

      // Navigate should NOT be called on just opening
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("navigates to /dramas with search query when typing outside /dramas page", async () => {
      const user = userEvent.setup();

      // Start on home page (not /dramas)
      mockPathname = "/";
      mockSearchParams = {};

      renderWithProviders(<SearchIcon />);

      const searchButton = screen.getByRole("button", {
        name: /toggle search/i,
      });

      // Open search
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search dramas...")).toBeInTheDocument();
      });

      // Type a search query
      const searchInput = screen.getByPlaceholderText("Search dramas...");
      await user.type(searchInput, "romance");

      // Navigate should NOT be called immediately (debounce)
      expect(mockNavigate).not.toHaveBeenCalled();

      // Advance timers past debounce (300ms)
      vi.advanceTimersByTime(350);

      // Now navigation should occur
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledTimes(1);
      });

      expect(mockNavigate).toHaveBeenLastCalledWith({
        to: "/dramas",
        search: { q: "romance" },
      });
    });

    it("debounces navigation while typing", async () => {
      const user = userEvent.setup();

      mockPathname = "/";
      mockSearchParams = {};

      renderWithProviders(<SearchIcon />);

      const searchButton = screen.getByRole("button", {
        name: /toggle search/i,
      });

      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search dramas...")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search dramas...");

      // Type character by character
      await user.type(searchInput, "r");
      vi.advanceTimersByTime(100);

      await user.type(searchInput, "o");
      vi.advanceTimersByTime(100);

      await user.type(searchInput, "m");
      vi.advanceTimersByTime(100);

      // Should not have navigated yet (still within debounce window)
      expect(mockNavigate).not.toHaveBeenCalled();

      // Complete the word and wait for full debounce
      await user.type(searchInput, "ance");
      vi.advanceTimersByTime(350);

      // Should navigate only once with final value
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledTimes(1);
      });

      expect(mockNavigate).toHaveBeenLastCalledWith({
        to: "/dramas",
        search: { q: "romance" },
      });
    });

    it("navigates without search param when input is cleared", async () => {
      const user = userEvent.setup();

      mockPathname = "/";
      mockSearchParams = {};

      renderWithProviders(<SearchIcon />);

      const searchButton = screen.getByRole("button", {
        name: /toggle search/i,
      });

      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search dramas...")).toBeInTheDocument();
      });

      // Type something first
      const searchInput = screen.getByPlaceholderText("Search dramas...");
      await user.type(searchInput, "test");
      vi.advanceTimersByTime(350);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });

      // Clear the search
      const clearButton = screen.getByRole("button", { name: /clear search/i });
      await user.click(clearButton);

      vi.advanceTimersByTime(350);

      // Should navigate with empty search
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledTimes(2);
      });

      expect(mockNavigate).toHaveBeenLastCalledWith({
        to: "/dramas",
        search: {},
      });
    });
  });

  describe("search param clearing behavior", () => {
    it("clears t parameter when navigating with q", async () => {
      const user = userEvent.setup();

      // Start on dramas page with 't' parameter (e.g., trending tab)
      mockPathname = "/dramas";
      mockSearchParams = { t: "popular" };

      renderWithProviders(<SearchIcon />);

      const searchButton = screen.getByRole("button", {
        name: /toggle search/i,
      });

      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search dramas...")).toBeInTheDocument();
      });

      // Type a search query - this should clear the 't' param
      const searchInput = screen.getByPlaceholderText("Search dramas...");
      await user.type(searchInput, "action");

      vi.advanceTimersByTime(350);

      // Navigation should ONLY include 'q', not 't'
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledTimes(1);
      });

      expect(mockNavigate).toHaveBeenLastCalledWith({
        to: "/dramas",
        search: { q: "action" },
      });

      // IMPORTANT: Verify 't' is NOT in the search params
      const lastCall = mockNavigate.mock.calls[0][0];
      expect(lastCall.search).not.toHaveProperty("t");
      expect(lastCall.search).toEqual({ q: "action" });
    });

    it("clears t parameter from existing search when typing on non-dramas page", async () => {
      const user = userEvent.setup();

      // On home page but with existing t param in state
      mockPathname = "/";
      mockSearchParams = { t: "trending" };

      renderWithProviders(<SearchIcon />);

      const searchButton = screen.getByRole("button", {
        name: /toggle search/i,
      });

      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search dramas...")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search dramas...");
      await user.type(searchInput, "comedy");

      vi.advanceTimersByTime(350);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledTimes(1);
      });

      // Should navigate with only 'q', omitting 't'
      expect(mockNavigate).toHaveBeenLastCalledWith({
        to: "/dramas",
        search: { q: "comedy" },
      });

      const lastCall = mockNavigate.mock.calls[0][0];
      expect(lastCall.search).not.toHaveProperty("t");
    });

    it("navigates with only q when both q and t exist in current params", async () => {
      const user = userEvent.setup();

      mockPathname = "/dramas";
      // Existing state has both q and t
      mockSearchParams = { q: "old", t: "popular" };

      renderWithProviders(<SearchIcon />);

      const searchButton = screen.getByRole("button", {
        name: /toggle search/i,
      });

      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search dramas...")).toBeInTheDocument();
      });

      // Type new search
      const searchInput = screen.getByPlaceholderText("Search dramas...");
      await user.clear(searchInput);
      await user.type(searchInput, "new");

      vi.advanceTimersByTime(350);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledTimes(1);
      });

      // Should only have q="new", no t
      const lastCall = mockNavigate.mock.calls[0][0];
      expect(lastCall.search).toEqual({ q: "new" });
      expect(lastCall.search).not.toHaveProperty("t");
    });
  });

  describe("dramas page context behavior", () => {
    it("updates search on dramas page when typing", async () => {
      const user = userEvent.setup();

      mockPathname = "/dramas";
      mockSearchParams = {};

      renderWithProviders(<SearchIcon />);

      const searchButton = screen.getByRole("button", {
        name: /toggle search/i,
      });

      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search dramas...")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search dramas...");
      await user.type(searchInput, "thriller");

      vi.advanceTimersByTime(350);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledTimes(1);
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/dramas",
        search: { q: "thriller" },
      });
    });

    it("clears search when closing on dramas page with empty input", async () => {
      const user = userEvent.setup();

      mockPathname = "/dramas";
      mockSearchParams = { q: "romance" };

      renderWithProviders(<SearchIcon />);

      const searchButton = screen.getByRole("button", {
        name: /toggle search/i,
      });

      // Open and then close without typing
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search dramas...")).toBeInTheDocument();
      });

      // Close search by clicking button again
      await user.click(searchButton);

      // Should navigate to clear search when closing on dramas page
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({
          to: "/dramas",
          search: {},
        });
      });
    });
  });
});
