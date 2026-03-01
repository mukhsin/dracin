import React from "react";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, waitFor } from "../../test/utils.js";
import userEvent from "@testing-library/user-event";

const mockNavigate = vi.fn();
const signInEmail = vi.fn();
const signUpEmail = vi.fn();
const serializeMergePayload = vi.fn();
const clearAfterMerge = vi.fn();
const mockFetch = vi.fn();

let currentSearch: { redirect?: string } = {};
let currentLocationState: { redirect?: string } | undefined;

const originalFetch = globalThis.fetch;

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router");

  return {
    ...actual,
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
      <a href={to} className={className}>
        {children}
      </a>
    ),
    useLocation: () => ({ state: currentLocationState }),
    useNavigate: () => mockNavigate,
    useSearch: () => currentSearch,
  };
});

vi.mock("../../lib/auth-client.js", () => ({
  default: {
    signIn: {
      email: signInEmail,
      social: vi.fn(),
    },
    signUp: {
      email: signUpEmail,
    },
  },
}));

vi.mock("../../lib/guest-watch-storage.js", () => ({
  guestWatchStorage: {
    serializeMergePayload,
    clearAfterMerge,
  },
}));

describe("auth guest merge continuation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSearch = {};
    currentLocationState = undefined;
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    serializeMergePayload.mockReturnValue(
      '{"version":1,"episodeIds":["episode-1"]}',
    );
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it("merges guest history once after successful sign in, clears storage on success, and preserves redirect navigation", async () => {
    signInEmail.mockResolvedValue({ error: null });
    mockFetch.mockResolvedValue({ ok: true });

    const module = await import("../auth.signin.js");
    const SignInPage = (
      module.Route as unknown as { component: React.ComponentType }
    ).component;
    const user = userEvent.setup();

    currentSearch = { redirect: "/profile/watchlist" };

    renderWithProviders(<SignInPage />);

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/password/i), "secret123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(signInEmail).toHaveBeenCalledTimes(1);
    });

    expect(serializeMergePayload).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/history/merge-guest",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: '{"entries":[{"episodeId":"episode-1","progress":0,"completed":false}]}',
      },
    );
    expect(clearAfterMerge).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/profile/watchlist" });
    });
  });

  it("keeps guest storage when merge returns non-ok during sign up and still navigates", async () => {
    signUpEmail.mockResolvedValue({ error: null });
    mockFetch.mockResolvedValue({ ok: false });

    const module = await import("../auth.signup.js");
    const SignUpPage = (
      module.Route as unknown as { component: React.ComponentType }
    ).component;
    const user = userEvent.setup();

    currentLocationState = { redirect: "/dramas/custom" };

    renderWithProviders(<SignUpPage />);

    await user.type(screen.getByLabelText(/^name$/i), "Test User");
    await user.type(screen.getByLabelText(/^email$/i), "new@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "secret123");
    await user.type(screen.getByLabelText(/confirm password/i), "secret123");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(signUpEmail).toHaveBeenCalledTimes(1);
    });

    expect(serializeMergePayload).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(clearAfterMerge).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/dramas/custom" });
    });
  });

  it("keeps guest storage and still navigates when merge request throws", async () => {
    signInEmail.mockResolvedValue({ error: null });
    mockFetch.mockRejectedValue(new Error("network failed"));

    const module = await import("../auth.signin.js");
    const SignInPage = (
      module.Route as unknown as { component: React.ComponentType }
    ).component;
    const user = userEvent.setup();

    renderWithProviders(<SignInPage />);

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/password/i), "secret123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(signInEmail).toHaveBeenCalledTimes(1);
    });

    expect(serializeMergePayload).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(clearAfterMerge).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/dramas" });
    });
  });
});
