import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, screen, waitFor } from "../../test/utils.js";
import { QualitySelector, type VideoUrls } from "../quality-selector.js";

describe("QualitySelector", () => {
  const mockOnQualityChange = vi.fn();
  const defaultVideoUrls: VideoUrls = {
    "240p": "https://example.com/video-240p.mp4",
    "360p": "https://example.com/video-360p.mp4",
    "480p": "https://example.com/video-480p.mp4",
    "720p": "https://example.com/video-720p.mp4",
    "1080p": "https://example.com/video-1080p.mp4",
    "4k": "https://example.com/video-4k.mp4",
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("rendering", () => {
    it("renders all available quality options in dropdown when clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <QualitySelector
          videoUrls={defaultVideoUrls}
          currentQuality="720p"
          onQualityChange={mockOnQualityChange}
        />,
      );

      const settingsButton = screen.getByRole("button", {
        name: /video quality settings/i,
      });
      await user.click(settingsButton);

      expect(screen.getByRole("option", { name: /4K/i })).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: /1080p HD/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: /720p HD/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /480p/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /360p/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /240p/i })).toBeInTheDocument();
    });

    it("renders only available qualities based on videoUrls", async () => {
      const user = userEvent.setup();
      const limitedUrls: VideoUrls = {
        "720p": "https://example.com/video-720p.mp4",
        "1080p": "https://example.com/video-1080p.mp4",
      };

      renderWithProviders(
        <QualitySelector
          videoUrls={limitedUrls}
          currentQuality="720p"
          onQualityChange={mockOnQualityChange}
        />,
      );

      const settingsButton = screen.getByRole("button", {
        name: /video quality settings/i,
      });
      await user.click(settingsButton);

      expect(
        screen.getByRole("option", { name: /1080p HD/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: /720p HD/i }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("option", { name: /480p/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("option", { name: /4K/i }),
      ).not.toBeInTheDocument();
    });

    it("returns null when no qualities are available", () => {
      const { container } = renderWithProviders(
        <QualitySelector
          videoUrls={{}}
          currentQuality="720p"
          onQualityChange={mockOnQualityChange}
        />,
      );

      expect(container.firstChild).toBeNull();
    });

    it("displays current quality label on button", () => {
      renderWithProviders(
        <QualitySelector
          videoUrls={defaultVideoUrls}
          currentQuality="1080p"
          onQualityChange={mockOnQualityChange}
        />,
      );

      const button = screen.getByRole("button", {
        name: /video quality settings/i,
      });
      expect(button).toHaveTextContent("1080p");
    });
  });

  describe("HD badge rendering", () => {
    it("renders HD badge for 720p quality", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <QualitySelector
          videoUrls={defaultVideoUrls}
          currentQuality="480p"
          onQualityChange={mockOnQualityChange}
        />,
      );

      const settingsButton = screen.getByRole("button", {
        name: /video quality settings/i,
      });
      await user.click(settingsButton);

      const option720p = screen.getByRole("option", { name: /720p HD/i });
      expect(option720p).toHaveTextContent("HD");
    });

    it("renders HD badge for 1080p quality", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <QualitySelector
          videoUrls={defaultVideoUrls}
          currentQuality="480p"
          onQualityChange={mockOnQualityChange}
        />,
      );

      const settingsButton = screen.getByRole("button", {
        name: /video quality settings/i,
      });
      await user.click(settingsButton);

      const option1080p = screen.getByRole("option", { name: /1080p HD/i });
      expect(option1080p).toHaveTextContent("HD");
    });

    it("does not render HD badge for non-HD qualities", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <QualitySelector
          videoUrls={defaultVideoUrls}
          currentQuality="720p"
          onQualityChange={mockOnQualityChange}
        />,
      );

      const settingsButton = screen.getByRole("button", {
        name: /video quality settings/i,
      });
      await user.click(settingsButton);

      const option480p = screen.getByRole("option", { name: /480p/i });
      expect(option480p).not.toHaveTextContent("HD");
    });
  });

  describe("4K badge rendering", () => {
    it("renders 4K badge for 4k quality", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <QualitySelector
          videoUrls={defaultVideoUrls}
          currentQuality="720p"
          onQualityChange={mockOnQualityChange}
        />,
      );

      const settingsButton = screen.getByRole("button", {
        name: /video quality settings/i,
      });
      await user.click(settingsButton);

      const option4k = screen.getByRole("option", { name: /4K/i });
      expect(option4k).toHaveTextContent("4K");
    });

    it("does not render 4K badge for other qualities", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <QualitySelector
          videoUrls={defaultVideoUrls}
          currentQuality="4k"
          onQualityChange={mockOnQualityChange}
        />,
      );

      const settingsButton = screen.getByRole("button", {
        name: /video quality settings/i,
      });
      await user.click(settingsButton);

      const option1080p = screen.getByRole("option", { name: /1080p HD/i });
      expect(option1080p).not.toHaveTextContent("4K");
    });

    it("displays 4K label on button when 4k is selected", () => {
      renderWithProviders(
        <QualitySelector
          videoUrls={defaultVideoUrls}
          currentQuality="4k"
          onQualityChange={mockOnQualityChange}
        />,
      );

      const button = screen.getByRole("button", {
        name: /video quality settings/i,
      });
      expect(button).toHaveTextContent("4K");
    });
  });

  describe("current quality highlighting", () => {
    it("highlights current quality in dropdown", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <QualitySelector
          videoUrls={defaultVideoUrls}
          currentQuality="720p"
          onQualityChange={mockOnQualityChange}
        />,
      );

      const settingsButton = screen.getByRole("button", {
        name: /video quality settings/i,
      });
      await user.click(settingsButton);

      const option720p = screen.getByRole("option", { name: /720p HD/i });
      expect(option720p).toHaveAttribute("aria-selected", "true");
    });

    it("shows checkmark for current quality", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <QualitySelector
          videoUrls={defaultVideoUrls}
          currentQuality="1080p"
          onQualityChange={mockOnQualityChange}
        />,
      );

      const settingsButton = screen.getByRole("button", {
        name: /video quality settings/i,
      });
      await user.click(settingsButton);

      const option1080p = screen.getByRole("option", { name: /1080p HD/i });
      expect(option1080p.querySelector("svg")).toBeInTheDocument();
    });

    it("does not highlight other qualities", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <QualitySelector
          videoUrls={defaultVideoUrls}
          currentQuality="720p"
          onQualityChange={mockOnQualityChange}
        />,
      );

      const settingsButton = screen.getByRole("button", {
        name: /video quality settings/i,
      });
      await user.click(settingsButton);

      const option480p = screen.getByRole("option", { name: /480p/i });
      expect(option480p).toHaveAttribute("aria-selected", "false");
    });
  });

  describe("quality selection callback", () => {
    it("calls onQualityChange when different quality is selected", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <QualitySelector
          videoUrls={defaultVideoUrls}
          currentQuality="720p"
          onQualityChange={mockOnQualityChange}
        />,
      );

      const settingsButton = screen.getByRole("button", {
        name: /video quality settings/i,
      });
      await user.click(settingsButton);

      const option1080p = screen.getByRole("option", { name: /1080p HD/i });
      await user.click(option1080p);

      await waitFor(() => {
        expect(mockOnQualityChange).toHaveBeenCalledWith("1080p");
      });
    });

    it("does not call onQualityChange when same quality is selected", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <QualitySelector
          videoUrls={defaultVideoUrls}
          currentQuality="720p"
          onQualityChange={mockOnQualityChange}
        />,
      );

      const settingsButton = screen.getByRole("button", {
        name: /video quality settings/i,
      });
      await user.click(settingsButton);

      const option720p = screen.getByRole("option", { name: /720p HD/i });
      await user.click(option720p);

      expect(mockOnQualityChange).not.toHaveBeenCalled();
    });

    it("closes dropdown after selection", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <QualitySelector
          videoUrls={defaultVideoUrls}
          currentQuality="720p"
          onQualityChange={mockOnQualityChange}
        />,
      );

      const settingsButton = screen.getByRole("button", {
        name: /video quality settings/i,
      });
      await user.click(settingsButton);
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      const option1080p = screen.getByRole("option", { name: /1080p HD/i });
      await user.click(option1080p);

      await waitFor(() => {
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      });
    });
  });

  describe("dropdown open/close behavior", () => {
    it("opens dropdown when button is clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <QualitySelector
          videoUrls={defaultVideoUrls}
          currentQuality="720p"
          onQualityChange={mockOnQualityChange}
        />,
      );

      const settingsButton = screen.getByRole("button", {
        name: /video quality settings/i,
      });
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

      await user.click(settingsButton);

      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("closes dropdown when clicked outside", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <div>
          <QualitySelector
            videoUrls={defaultVideoUrls}
            currentQuality="720p"
            onQualityChange={mockOnQualityChange}
          />
          <div data-testid="outside">Outside element</div>
        </div>,
      );

      const settingsButton = screen.getByRole("button", {
        name: /video quality settings/i,
      });
      await user.click(settingsButton);
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      const outsideElement = screen.getByTestId("outside");
      await user.click(outsideElement);

      await waitFor(() => {
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      });
    });

    it("toggles dropdown when button is clicked multiple times", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <QualitySelector
          videoUrls={defaultVideoUrls}
          currentQuality="720p"
          onQualityChange={mockOnQualityChange}
        />,
      );

      const settingsButton = screen.getByRole("button", {
        name: /video quality settings/i,
      });

      await user.click(settingsButton);
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      await user.click(settingsButton);
      await waitFor(() => {
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      });
    });

    it("has correct ARIA attributes when closed", () => {
      renderWithProviders(
        <QualitySelector
          videoUrls={defaultVideoUrls}
          currentQuality="720p"
          onQualityChange={mockOnQualityChange}
        />,
      );

      const button = screen.getByRole("button", {
        name: /video quality settings/i,
      });
      expect(button).toHaveAttribute("aria-expanded", "false");
      expect(button).toHaveAttribute("aria-haspopup", "listbox");
    });

    it("has correct ARIA attributes when open", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <QualitySelector
          videoUrls={defaultVideoUrls}
          currentQuality="720p"
          onQualityChange={mockOnQualityChange}
        />,
      );

      const button = screen.getByRole("button", {
        name: /video quality settings/i,
      });
      await user.click(button);

      expect(button).toHaveAttribute("aria-expanded", "true");
    });

    it("dropdown has correct ARIA label", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <QualitySelector
          videoUrls={defaultVideoUrls}
          currentQuality="720p"
          onQualityChange={mockOnQualityChange}
        />,
      );

      const button = screen.getByRole("button", {
        name: /video quality settings/i,
      });
      await user.click(button);

      const listbox = screen.getByRole("listbox");
      expect(listbox).toHaveAttribute("aria-label", "Select video quality");
    });
  });

  describe("disabled state", () => {
    it("disables button when disabled prop is true", () => {
      renderWithProviders(
        <QualitySelector
          videoUrls={defaultVideoUrls}
          currentQuality="720p"
          onQualityChange={mockOnQualityChange}
          disabled={true}
        />,
      );

      const button = screen.getByRole("button", {
        name: /video quality settings/i,
      });
      expect(button).toBeDisabled();
    });

    it("does not open dropdown when disabled", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <QualitySelector
          videoUrls={defaultVideoUrls}
          currentQuality="720p"
          onQualityChange={mockOnQualityChange}
          disabled={true}
        />,
      );

      const button = screen.getByRole("button", {
        name: /video quality settings/i,
      });
      await user.click(button);

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("applies disabled styles when disabled", () => {
      renderWithProviders(
        <QualitySelector
          videoUrls={defaultVideoUrls}
          currentQuality="720p"
          onQualityChange={mockOnQualityChange}
          disabled={true}
        />,
      );

      const button = screen.getByRole("button", {
        name: /video quality settings/i,
      });
      expect(button).toHaveClass("opacity-40", "cursor-not-allowed");
    });
  });

  describe("quality ordering", () => {
    it("displays qualities in descending order (highest to lowest)", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <QualitySelector
          videoUrls={defaultVideoUrls}
          currentQuality="720p"
          onQualityChange={mockOnQualityChange}
        />,
      );

      const settingsButton = screen.getByRole("button", {
        name: /video quality settings/i,
      });
      await user.click(settingsButton);

      const options = screen.getAllByRole("option");
      const qualities = options.map((opt) => opt.textContent);

      expect(qualities[0]).toContain("4K");
      expect(qualities[1]).toContain("1080p");
      expect(qualities[2]).toContain("720p");
      expect(qualities[3]).toContain("480p");
      expect(qualities[4]).toContain("360p");
      expect(qualities[5]).toContain("240p");
    });
  });

  describe("edge cases", () => {
    it("handles single quality option", async () => {
      const user = userEvent.setup();
      const singleUrl: VideoUrls = {
        "720p": "https://example.com/video-720p.mp4",
      };

      renderWithProviders(
        <QualitySelector
          videoUrls={singleUrl}
          currentQuality="720p"
          onQualityChange={mockOnQualityChange}
        />,
      );

      const settingsButton = screen.getByRole("button", {
        name: /video quality settings/i,
      });
      await user.click(settingsButton);

      expect(screen.getAllByRole("option")).toHaveLength(1);
      expect(
        screen.getByRole("option", { name: /720p HD/i }),
      ).toBeInTheDocument();
    });

    it("handles quality labels correctly for all types", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <QualitySelector
          videoUrls={defaultVideoUrls}
          currentQuality="720p"
          onQualityChange={mockOnQualityChange}
        />,
      );

      const settingsButton = screen.getByRole("button", {
        name: /video quality settings/i,
      });
      await user.click(settingsButton);

      const options = screen.getAllByRole("option");
      expect(options).toHaveLength(6);
      expect(options[0]).toHaveTextContent("4K");
      expect(options[1]).toHaveTextContent("1080p");
      expect(options[2]).toHaveTextContent("720p");
      expect(options[3]).toHaveTextContent("480p");
      expect(options[4]).toHaveTextContent("360p");
      expect(options[5]).toHaveTextContent("240p");
    });
  });
});
