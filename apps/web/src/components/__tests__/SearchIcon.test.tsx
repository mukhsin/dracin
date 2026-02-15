import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, screen, waitFor } from "../../test/utils.js";
import { SearchIcon } from "../search-icon.js";

// Mock navigation for search param updates
const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useSearch: () => ({}),
}));

describe("SearchIcon", () => {
  beforeEach(() => {
    vi.resetAllMocks();
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

      expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();

      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByRole("searchbox")).toBeInTheDocument();
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
        expect(screen.getByRole("searchbox")).toBeInTheDocument();
      });

      const outsideElement = screen.getByTestId("outside");
      await user.click(outsideElement);

      await waitFor(() => {
        expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
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
        expect(screen.getByRole("searchbox")).toBeInTheDocument();
      });

      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
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

      const searchInput = await screen.findByRole("searchbox");
      await user.type(searchInput, "romance drama");

      expect(searchInput).toHaveValue("romance drama");
    });
  });
});
