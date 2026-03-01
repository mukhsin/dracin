import { test, expect } from "./fixtures";
import { SELECTORS, TEST_TIMEOUTS, playVideo, waitForPageLoad } from "./utils";

const APP_ORIGIN = "http://localhost:3000";
const API_ORIGIN = "http://localhost:3001";
const GUEST_CAP = 10;
const BLOCKED_ATTEMPT_EPISODE = 11;

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toWatchPath(episodeNumber: number): string {
  return `/dramas/guest-watch-cap-limit/${episodeNumber}`;
}

function readGuestEpisodeIds(): string[] {
  try {
    const raw = window.localStorage.getItem("guest-watch-history");

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as
      | { version?: number; episodeIds?: unknown }
      | unknown[];

    if (Array.isArray(parsed)) {
      return parsed.filter(
        (value): value is string => typeof value === "string",
      );
    }

    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray(parsed.episodeIds)
    ) {
      return parsed.episodeIds.filter(
        (value): value is string => typeof value === "string",
      );
    }

    return [];
  } catch {
    return [];
  }
}

function makeEpisodeResponse(url: string) {
  const parts = url.split("/");
  const episodeParam = parts[parts.length - 1] || "1";
  const episodeNumber = Number.parseInt(episodeParam, 10) || 1;

  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        id: `episode-${episodeNumber}`,
        dramaId: "drama-guest-watch-cap-limit",
        bookId: null,
        number: episodeNumber,
        title: `Episode ${episodeNumber}`,
        description: `Guest cap scenario episode ${episodeNumber}`,
        duration: 120,
        sourceUrl: null,
        createdAt: new Date().toISOString(),
        drama: {
          id: "drama-guest-watch-cap-limit",
          title: "Guest Watch Cap Limit",
          slug: "guest-watch-cap-limit",
          posterUrl: null,
          totalEpisodes: 11,
        },
        navigation: {
          prevEpisode:
            episodeNumber > 1
              ? {
                  number: episodeNumber - 1,
                  title: `Episode ${episodeNumber - 1}`,
                }
              : null,
          nextEpisode:
            episodeNumber < BLOCKED_ATTEMPT_EPISODE
              ? {
                  number: episodeNumber + 1,
                  title: `Episode ${episodeNumber + 1}`,
                }
              : null,
        },
        video: {
          urls: {
            "720p": `${API_ORIGIN}/api/video/guest-watch-cap-limit.${episodeNumber}.720p.mp4`,
          },
        },
      },
    }),
  };
}

test.describe("Guest watch cap gating", () => {
  test("guest can start playback for 10 unique episodes, then the 11th play attempt is gated with preserved redirect", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(HTMLMediaElement.prototype, "play", {
        configurable: true,
        value: function play() {
          this.dispatchEvent(new Event("play"));
          return Promise.resolve();
        },
      });
    });

    await page.route("**/api/auth/get-session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: null }),
      });
    });

    await page.route(
      "**/api/dramas/guest-watch-cap-limit/episodes/*",
      async (route) => {
        await route.fulfill(makeEpisodeResponse(route.request().url()));
      },
    );

    for (let episode = 1; episode <= GUEST_CAP; episode += 1) {
      const watchPath = toWatchPath(episode);
      await page.goto(`${APP_ORIGIN}${watchPath}`);
      await waitForPageLoad(page);

      await expect(page.locator(SELECTORS.playerContainer).first()).toBeVisible(
        {
          timeout: TEST_TIMEOUTS.videoLoad,
        },
      );

      await playVideo(page);

      await expect(
        page,
        `Guest should remain on the watch route after starting playback for attempt ${episode}.`,
      ).toHaveURL(new RegExp(`${escapeForRegExp(watchPath)}$`), {
        timeout: TEST_TIMEOUTS.navigation,
      });

      const storedEpisodeIds = await page.evaluate(readGuestEpisodeIds);

      expect(
        storedEpisodeIds,
        `Playback start for attempt ${episode} should persist the guest watch history entry.`,
      ).toEqual(
        Array.from({ length: episode }, (_, index) => `episode-${index + 1}`),
      );
    }

    const blockedPath = toWatchPath(BLOCKED_ATTEMPT_EPISODE);
    const blockedUrl = `${APP_ORIGIN}${blockedPath}`;
    const expectedSigninHref = `/auth/signin?redirect=${encodeURIComponent(blockedPath)}`;

    await page.goto(blockedUrl);
    await waitForPageLoad(page);

    await expect(page.locator(SELECTORS.playerContainer).first()).toBeVisible({
      timeout: TEST_TIMEOUTS.videoLoad,
    });

    await playVideo(page);

    const signInRequiredDialog = page
      .locator('[role="dialog"][aria-modal="true"]')
      .first();
    const dialogVisible = await signInRequiredDialog
      .isVisible()
      .catch(() => false);

    if (dialogVisible) {
      await expect(signInRequiredDialog).toContainText(/sign in required/i);
      await expect(
        signInRequiredDialog.getByRole("link", { name: /^sign in$/i }),
      ).toHaveAttribute("href", expectedSigninHref);

      const storedEpisodeIds = await page.evaluate(readGuestEpisodeIds);
      expect(storedEpisodeIds).toHaveLength(GUEST_CAP);
      expect(storedEpisodeIds[storedEpisodeIds.length - 1]).toBe(
        `episode-${GUEST_CAP}`,
      );
      return;
    }

    await expect(
      page,
      "11th unique guest playback attempt must trigger sign-in gating and preserve redirect intent.",
    ).toHaveURL(
      new RegExp(
        `/auth/signin\\?redirect=${escapeForRegExp(encodeURIComponent(blockedPath))}$`,
      ),
      {
        timeout: TEST_TIMEOUTS.navigation,
      },
    );
  });
});
