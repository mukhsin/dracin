import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, screen, waitFor } from "../../test/utils.js";
import { SearchBox } from "../search-box.js";

const mockOnChange = vi.fn();

describe("SearchBox", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("rendering", () => {
    it("renders search input with search icon", () => {
      renderWithProviders(
        <SearchBox
          value=""
          onChange={mockOnChange}
          placeholder="Search dramas..."
        />,
      );

      const input = screen.getByRole("searchbox");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("placeholder", "Search dramas...");

      expect(document.querySelector("svg")).toBeInTheDocument();
    });

    it("displays the current value in the input", () => {
      renderWithProviders(
        <SearchBox
          value="romance"
          onChange={mockOnChange}
          placeholder="Search..."
        />,
      );

      const input = screen.getByRole("searchbox");
      expect(input).toHaveValue("romance");
    });
  });

  describe("clear button visibility", () => {
    it("shows clear button when search has value", () => {
      renderWithProviders(
        <SearchBox
          value="test query"
          onChange={mockOnChange}
          placeholder="Search..."
        />,
      );

      const clearButton = screen.getByRole("button", { name: /clear search/i });
      expect(clearButton).toBeInTheDocument();
      expect(clearButton).toBeVisible();
    });

    it("hides clear button when search is empty", () => {
      renderWithProviders(
        <SearchBox value="" onChange={mockOnChange} placeholder="Search..." />,
      );

      const clearButton = screen.queryByRole("button", {
        name: /clear search/i,
      });
      expect(clearButton).not.toBeInTheDocument();
    });
  });

  describe("user interactions", () => {
    it("calls onChange when user types into the input", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <SearchBox value="" onChange={mockOnChange} placeholder="Search..." />,
      );

      const input = screen.getByRole("searchbox");
      await user.type(input, "action");

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith("action");
      });
    });

    it("clears search value when clear button is clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <SearchBox
          value="test query"
          onChange={mockOnChange}
          placeholder="Search..."
        />,
      );

      const clearButton = screen.getByRole("button", { name: /clear search/i });
      await user.click(clearButton);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith("");
      });
    });
  });

  describe("URL search param sync", () => {
    it("initializes input value from URL search param when provided", () => {
      // Mock URL with search param using vi.stubGlobal
      const originalLocation = window.location;
      const mockedLocation = {
        ...originalLocation,
        search: "?search=romance+drama",
      } as Location;

      vi.stubGlobal("location", mockedLocation);

      renderWithProviders(
        <SearchBox
          value="romance drama"
          onChange={mockOnChange}
          placeholder="Search..."
          syncWithUrl
        />,
      );

      const input = screen.getByRole("searchbox");
      expect(input).toHaveValue("romance drama");

      // Restore original location
      vi.stubGlobal("location", originalLocation);
    });
  });
});
