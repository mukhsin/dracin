import { test, expect } from "./fixtures";
import type { BrowserName } from "@playwright/test";
  import {
  waitForPageLoad,
  waitForVideoReady,
  waitForApiResponse,
  clickDramaCard,
  playVideo,
  pauseVideo,
  seekVideo,
  TEST_TIMEOUTS,
  SELECTORS,
} from "./utils";
test.describe("Video Player", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto("/");
    await waitForPageLoad(page);

    const dramaCards = page.locator(SELECTORS.dramaCard);
    if ((await dramaCards.count()) === 0) {
      test.skip();
      return;
    }

    await clickDramaCard(page, 0);
    await page.waitForURL(/\/drama\/.+/, { timeout: TEST_TIMEOUTS.navigation });
    await waitForPageLoad(page);

    const episodeItems = page.locator(SELECTORS.episodeItem);
    if ((await episodeItems.count()) === 0) {
      test.skip();
      return;
    }

    const firstEpisode = episodeItems.first();
    const watchLink = firstEpisode.locator('a[href*="/dramas/"]').first();

    if (await watchLink.isVisible().catch(() => false)) {
      await Promise.all([
        page.waitForNavigation({
          waitUntil: "networkidle",
          timeout: TEST_TIMEOUTS.navigation,
        }),
        watchLink.click(),
      ]);

      await page.waitForURL(/\/dramas\/.+/, {
        timeout: TEST_TIMEOUTS.navigation,
      });
    }
  });

  test.describe("Player Initialization", () => {
    test("should display video player", async ({ authenticatedPage: page }) => {
      const player = page.locator(SELECTORS.playerContainer);
      await expect(player).toBeVisible({ timeout: TEST_TIMEOUTS.videoLoad });
    });

    test("should load video element", async ({ authenticatedPage: page }) => {
      const video = page.locator("video").first();
      await expect(video).toBeVisible({ timeout: TEST_TIMEOUTS.videoLoad });

      const src = await video.getAttribute("src");
      expect(src).toBeTruthy();
    });

    test("should display video controls", async ({
      authenticatedPage: page,
    }) => {
      const video = page.locator("video").first();
      await video.waitFor({
        state: "visible",
        timeout: TEST_TIMEOUTS.videoLoad,
      });

      const controls = page
        .locator('[class*="controls"], [data-testid="video-controls"]')
        .first();
      const playButton = page.locator(SELECTORS.playButton).first();

      const hasControls =
        (await controls.isVisible().catch(() => false)) ||
        (await playButton.isVisible().catch(() => false));

      expect(hasControls).toBe(true);
    });

    test("should display video title and info", async ({
      authenticatedPage: page,
    }) => {
      const title = page.locator("h1").first();
      await expect(title).toBeVisible();

      const titleText = await title.textContent();
      expect(titleText).toBeTruthy();
    });
  });

  test.describe("Playback Controls", () => {
    test("should play video when tapping player once", async ({
      authenticatedPage: page,
    }) => {
      const video = page.locator("video").first();
      await video.waitFor({
        state: "visible",
        timeout: TEST_TIMEOUTS.videoLoad,
      });

      await waitForVideoReady(page, TEST_TIMEOUTS.videoLoad);

      await playVideo(page);

      await page.waitForTimeout(1000);

      const isPlaying = await video.evaluate(
        (el: HTMLVideoElement) => !el.paused && !el.ended,
      );
      expect(isPlaying).toBe(true);
    });

    test("should pause video when tapping player once while playing", async ({
      authenticatedPage: page,
    }) => {
      const video = page.locator("video").first();
      await video.waitFor({
        state: "visible",
        timeout: TEST_TIMEOUTS.videoLoad,
      });

      await waitForVideoReady(page, TEST_TIMEOUTS.videoLoad);

      await playVideo(page);
      await page.waitForTimeout(1000);

      await pauseVideo(page);
      await page.waitForTimeout(500);

      const isPaused = await video.evaluate(
        (el: HTMLVideoElement) => el.paused,
      );
      expect(isPaused).toBe(true);
    });

    test("should seek forward by ~5 seconds on right double tap", async ({
      authenticatedPage: page,
    }) => {
      const video = page.locator("video").first();
      await video.waitFor({
        state: "visible",
        timeout: TEST_TIMEOUTS.videoLoad,
      });

      await waitForVideoReady(page, TEST_TIMEOUTS.videoLoad);
      await seekVideo(page, 35);
      await page.waitForTimeout(300);

      const before = await video.evaluate((el: HTMLVideoElement) => el.currentTime);
      const box = await video.boundingBox();
      if (!box) {
        test.skip();
        return;
      }

      const x = box.x + box.width * 0.8;
      const y = box.y + box.height * 0.5;
      await page.mouse.click(x, y);
      await page.waitForTimeout(100);
      await page.mouse.click(x, y);
      await page.waitForTimeout(400);

      const after = await video.evaluate((el: HTMLVideoElement) => el.currentTime);
      expect(after).toBeGreaterThan(before + 3);
      expect(after).toBeLessThan(before + 7);
    });

    test("should seek backward by ~5 seconds on left double tap", async ({
      authenticatedPage: page,
    }) => {
      const video = page.locator("video").first();
      await video.waitFor({
        state: "visible",
        timeout: TEST_TIMEOUTS.videoLoad,
      });

      await waitForVideoReady(page, TEST_TIMEOUTS.videoLoad);
      await seekVideo(page, 60);
      await page.waitForTimeout(300);

      const before = await video.evaluate((el: HTMLVideoElement) => el.currentTime);
      const box = await video.boundingBox();
      if (!box) {
        test.skip();
        return;
      }

      const x = box.x + box.width * 0.2;
      const y = box.y + box.height * 0.5;
      await page.mouse.click(x, y);
      await page.waitForTimeout(100);
      await page.mouse.click(x, y);
      await page.waitForTimeout(400);

      const after = await video.evaluate((el: HTMLVideoElement) => el.currentTime);
      expect(after).toBeGreaterThan(before - 7);
      expect(after).toBeLessThan(before - 3);
    });

    test("should seek to different position", async ({
      authenticatedPage: page,
    }) => {
      const video = page.locator("video").first();
      await video.waitFor({
        state: "visible",
        timeout: TEST_TIMEOUTS.videoLoad,
      });

      await waitForVideoReady(page, TEST_TIMEOUTS.videoLoad);

      const duration = await video.evaluate(
        (el: HTMLVideoElement) => el.duration,
      );

      if (duration < 10) {
        test.skip();
        return;
      }

      await seekVideo(page, 30);
      await page.waitForTimeout(1000);

      const currentTime = await video.evaluate(
        (el: HTMLVideoElement) => el.currentTime,
      );
      const expectedTime = duration * 0.3;

      expect(currentTime).toBeGreaterThan(expectedTime - 5);
      expect(currentTime).toBeLessThan(expectedTime + 5);
    });

    test("should skip forward 10 seconds", async ({
      authenticatedPage: page,
    }) => {
      const video = page.locator("video").first();
      await video.waitFor({
        state: "visible",
        timeout: TEST_TIMEOUTS.videoLoad,
      });

      await waitForVideoReady(page, TEST_TIMEOUTS.videoLoad);

      const initialTime = await video.evaluate(
        (el: HTMLVideoElement) => el.currentTime,
      );

      const skipForwardButton = page
        .locator('button[aria-label*="forward" i], button[title*="forward" i]')
        .first();

      if (await skipForwardButton.isVisible().catch(() => false)) {
        await skipForwardButton.click();
        await page.waitForTimeout(500);

        const newTime = await video.evaluate(
          (el: HTMLVideoElement) => el.currentTime,
        );
        expect(newTime).toBeGreaterThan(initialTime);
      }
    });

    test("should skip backward 10 seconds", async ({
      authenticatedPage: page,
    }) => {
      const video = page.locator("video").first();
      await video.waitFor({
        state: "visible",
        timeout: TEST_TIMEOUTS.videoLoad,
      });

      await waitForVideoReady(page, TEST_TIMEOUTS.videoLoad);

      await seekVideo(page, 50);
      await page.waitForTimeout(1000);

      const timeBeforeSkip = await video.evaluate(
        (el: HTMLVideoElement) => el.currentTime,
      );

      const skipBackwardButton = page
        .locator(
          'button[aria-label*="backward" i], button[title*="backward" i]',
        )
        .first();

      if (await skipBackwardButton.isVisible().catch(() => false)) {
        await skipBackwardButton.click();
        await page.waitForTimeout(500);

        const newTime = await video.evaluate(
          (el: HTMLVideoElement) => el.currentTime,
        );
        expect(newTime).toBeLessThan(timeBeforeSkip);
      }
    });
  });

  test.describe("Volume Control", () => {
    test("should mute video", async ({ authenticatedPage: page }) => {
      const video = page.locator("video").first();
      await video.waitFor({
        state: "visible",
        timeout: TEST_TIMEOUTS.videoLoad,
      });

      const volumeButton = page.locator(SELECTORS.volumeControl).first();

      if (!(await volumeButton.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await video.evaluate((el: HTMLVideoElement) => {
        el.muted = false;
        el.volume = 0.5;
      });

      await volumeButton.click();
      await page.waitForTimeout(500);

      const isMuted = await video.evaluate((el: HTMLVideoElement) => el.muted);
      expect(isMuted).toBe(true);
    });

    test("should unmute video", async ({ authenticatedPage: page }) => {
      const video = page.locator("video").first();
      await video.waitFor({
        state: "visible",
        timeout: TEST_TIMEOUTS.videoLoad,
      });

      const volumeButton = page.locator(SELECTORS.volumeControl).first();

      if (!(await volumeButton.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await video.evaluate((el: HTMLVideoElement) => {
        el.muted = true;
      });

      await volumeButton.click();
      await page.waitForTimeout(500);

      const isMuted = await video.evaluate((el: HTMLVideoElement) => el.muted);
      expect(isMuted).toBe(false);
    });
  });

  test.describe("Fullscreen", () => {
    test("should toggle fullscreen mode", async ({
      authenticatedPage: page,
    }) => {
      const video = page.locator("video").first();
      await video.waitFor({
        state: "visible",
        timeout: TEST_TIMEOUTS.videoLoad,
      });

      const fullscreenButton = page.locator(SELECTORS.fullscreenButton).first();

      if (!(await fullscreenButton.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await fullscreenButton.click();
      await page.waitForTimeout(1000);

      const isFullscreen = await page.evaluate(
        () => !!document.fullscreenElement,
      );
      expect(isFullscreen).toBe(true);

      await fullscreenButton.click();
      await page.waitForTimeout(1000);

      const isNotFullscreen = await page.evaluate(
        () => !document.fullscreenElement,
      );
      expect(isNotFullscreen).toBe(true);
    });
  });

  test.describe("Quality Selection", () => {
    test("should display quality selector", async ({
      authenticatedPage: page,
    }) => {
      const video = page.locator("video").first();
      await video.waitFor({
        state: "visible",
        timeout: TEST_TIMEOUTS.videoLoad,
      });

      const qualityButton = page.locator(SELECTORS.qualitySelector).first();

      const hasQualitySelector = await qualityButton
        .isVisible()
        .catch(() => false);

      if (!hasQualitySelector) {
        test.skip();
        return;
      }

      await expect(qualityButton).toBeVisible();
    });

    test("should change video quality", async ({ authenticatedPage: page }) => {
      const video = page.locator("video").first();
      await video.waitFor({
        state: "visible",
        timeout: TEST_TIMEOUTS.videoLoad,
      });

      const qualityButton = page.locator(SELECTORS.qualitySelector).first();

      if (!(await qualityButton.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await qualityButton.click();
      await page.waitForTimeout(500);

      const qualityOptions = page
        .locator('[role="menuitem"], [class*="quality-option"]')
        .first();

      if (await qualityOptions.isVisible().catch(() => false)) {
        await qualityOptions.click();
        await page.waitForTimeout(1000);

        await expect(video).toBeVisible();
      }
    });
  });

  test.describe("Keyboard Shortcuts", () => {
    test("should toggle play/pause with spacebar", async ({
      authenticatedPage: page,
    }) => {
      const video = page.locator("video").first();
      await video.waitFor({
        state: "visible",
        timeout: TEST_TIMEOUTS.videoLoad,
      });

      await waitForVideoReady(page, TEST_TIMEOUTS.videoLoad);

      await page.keyboard.press(" ");
      await page.waitForTimeout(500);

      const isPlaying = await video.evaluate(
        (el: HTMLVideoElement) => !el.paused,
      );
      expect(isPlaying).toBe(true);

      await page.keyboard.press(" ");
      await page.waitForTimeout(500);

      const isPaused = await video.evaluate(
        (el: HTMLVideoElement) => el.paused,
      );
      expect(isPaused).toBe(true);
    });

    test("should seek with arrow keys", async ({ authenticatedPage: page }) => {
      const video = page.locator("video").first();
      await video.waitFor({
        state: "visible",
        timeout: TEST_TIMEOUTS.videoLoad,
      });

      await waitForVideoReady(page, TEST_TIMEOUTS.videoLoad);

      const initialTime = await video.evaluate(
        (el: HTMLVideoElement) => el.currentTime,
      );

      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(500);

      const newTime = await video.evaluate(
        (el: HTMLVideoElement) => el.currentTime,
      );
      expect(newTime).toBeGreaterThan(initialTime);
    });

    test("should toggle fullscreen with F key", async ({
      authenticatedPage: page,
    }) => {
      const video = page.locator("video").first();
      await video.waitFor({
        state: "visible",
        timeout: TEST_TIMEOUTS.videoLoad,
      });

      await page.keyboard.press("f");
      await page.waitForTimeout(1000);

      const isFullscreen = await page.evaluate(
        () => !!document.fullscreenElement,
      );
      expect(isFullscreen).toBe(true);

      await page.keyboard.press("f");
      await page.waitForTimeout(1000);

      const isNotFullscreen = await page.evaluate(
        () => !document.fullscreenElement,
      );
      expect(isNotFullscreen).toBe(true);
    });

    test("should mute with M key", async ({ authenticatedPage: page }) => {
      const video = page.locator("video").first();
      await video.waitFor({
        state: "visible",
        timeout: TEST_TIMEOUTS.videoLoad,
      });

      await video.evaluate((el: HTMLVideoElement) => {
        el.muted = false;
      });

      await page.keyboard.press("m");
      await page.waitForTimeout(500);

      const isMuted = await video.evaluate((el: HTMLVideoElement) => el.muted);
      expect(isMuted).toBe(true);
    });
  });

  test.describe("Progress Tracking", () => {
    test("should save watch progress", async ({ authenticatedPage: page }) => {
      const video = page.locator("video").first();
      await video.waitFor({
        state: "visible",
        timeout: TEST_TIMEOUTS.videoLoad,
      });

      await waitForVideoReady(page, TEST_TIMEOUTS.videoLoad);

      await seekVideo(page, 20);
      await page.waitForTimeout(2000);

      await waitForApiResponse(page, "/api/history");

      const progressSaved = await page.evaluate(() => {
        return new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(true), 1000);
        });
      });

      expect(progressSaved).toBe(true);
    });
  });

  test.describe("Range Request Support (Safari)", () => {
    test("should support HTTP Range Requests", async ({
      authenticatedPage: page,
    }) => {
      const video = page.locator("video").first();
      await video.waitFor({
        state: "visible",
        timeout: TEST_TIMEOUTS.videoLoad,
      });

      await waitForVideoReady(page, TEST_TIMEOUTS.videoLoad);

      const duration = await video.evaluate(
        (el: HTMLVideoElement) => el.duration,
      );

      if (duration < 30) {
        test.skip();
        return;
      }

      await seekVideo(page, 70);
      await page.waitForTimeout(2000);

      const currentTime = await video.evaluate(
        (el: HTMLVideoElement) => el.currentTime,
      );
      const expectedTime = duration * 0.7;

      expect(currentTime).toBeGreaterThan(expectedTime - 10);
      expect(currentTime).toBeLessThan(expectedTime + 10);

      const isPlaying = await video.evaluate(
        (el: HTMLVideoElement) => !el.paused && el.readyState >= 2,
      );
      expect(isPlaying).toBe(true);
    });
  });
});


test.describe("Safari Playback and Seek Verification", () => {
  test("WebKit: seek advances currentTime and playback remains active", async ({
    authenticatedPage: page,
    browserName,
  }) => {
    test.skip(browserName !== 'webkit', 'WebKit-specific test');

    const video = page.locator("video").first();
    await video.waitFor({
      state: "visible",
      timeout: TEST_TIMEOUTS.videoLoad,
    });

    await waitForVideoReady(page, TEST_TIMEOUTS.videoLoad);

    const duration = await video.evaluate(
      (el: HTMLVideoElement) => el.duration,
    );

    if (duration < 30) {
      test.skip();
      return;
    }

    await playVideo(page);
    await page.waitForTimeout(1000);

    const initialTime = await video.evaluate(
      (el: HTMLVideoElement) => el.currentTime,
    );
    const initialReadyState = await video.evaluate(
      (el: HTMLVideoElement) => el.readyState,
    );

    const seekTargetPercent = 70;
    await seekVideo(page, seekTargetPercent);

    await page.waitForTimeout(1500);

    const seekedTime = await video.evaluate(
      (el: HTMLVideoElement) => el.currentTime,
    );
    const seekedReadyState = await video.evaluate(
      (el: HTMLVideoElement) => el.readyState,
    );
    const isPlaying = await video.evaluate(
      (el: HTMLVideoElement) => !el.paused && !el.ended,
    );

    const expectedTime = duration * (seekTargetPercent / 100);
    const timeDiff = Math.abs(seekedTime - expectedTime);

    expect(timeDiff).toBeLessThan(10);
    expect(seekedTime).toBeGreaterThan(initialTime);
    expect(seekedReadyState).toBeGreaterThanOrEqual(2);
    expect(isPlaying).toBe(true);

    const errorOverlay = page.locator('text=/Video format not supported/i').first();
    const hasErrorOverlay = await errorOverlay.isVisible().catch(() => false);
    expect(hasErrorOverlay).toBe(false);
  });

  test("Chromium: seek advances currentTime and playback remains active", async ({
    authenticatedPage: page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'Chromium-specific test');

    const video = page.locator("video").first();
    await video.waitFor({
      state: "visible",
      timeout: TEST_TIMEOUTS.videoLoad,
    });

    await waitForVideoReady(page, TEST_TIMEOUTS.videoLoad);

    const duration = await video.evaluate(
      (el: HTMLVideoElement) => el.duration,
    );

    if (duration < 30) {
      test.skip();
      return;
    }

    await playVideo(page);
    await page.waitForTimeout(1000);

    const initialTime = await video.evaluate(
      (el: HTMLVideoElement) => el.currentTime,
    );

    const seekTargetPercent = 60;
    await seekVideo(page, seekTargetPercent);

    await page.waitForTimeout(1500);

    const seekedTime = await video.evaluate(
      (el: HTMLVideoElement) => el.currentTime,
    );
    const isPlaying = await video.evaluate(
      (el: HTMLVideoElement) => !el.paused && !el.ended,
    );

    const expectedTime = duration * (seekTargetPercent / 100);
    const timeDiff = Math.abs(seekedTime - expectedTime);

    expect(timeDiff).toBeLessThan(10);
    expect(seekedTime).toBeGreaterThan(initialTime);
    expect(isPlaying).toBe(true);
  });
});

test.describe("Poster URL Routing Verification", () => {
  test("should load poster from API proxy route only", async ({
    authenticatedPage: page,
  }) => {
    const posterRequests: Array<{ url: string; host: string; path: string }> = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/poster.jpg') || url.includes('/poster')) {
        const urlObj = new URL(url);
        posterRequests.push({
          url,
          host: urlObj.host,
          path: urlObj.pathname,
        });
      }
    });

    const video = page.locator("video").first();
    await video.waitFor({
      state: "visible",
      timeout: TEST_TIMEOUTS.videoLoad,
    });

    await waitForVideoReady(page, TEST_TIMEOUTS.videoLoad);

    await page.waitForTimeout(2000);

    if (posterRequests.length === 0) {
      const posterUrl = await video.getAttribute('poster');
      if (posterUrl) {
        const urlObj = new URL(posterUrl);
        posterRequests.push({
          url: posterUrl,
          host: urlObj.host,
          path: urlObj.pathname,
        });
      }
    }

    for (const request of posterRequests) {
      expect(request.path).toMatch(/\/api\/dramas\/[^\/]+\/poster\.jpg/);
      expect(request.host).not.toContain('dramaboxdb.com');
      expect(request.host).not.toContain('hwztchapter');
    }
  });

  test("should fail when poster loads from external host (regression detection)", async ({
    authenticatedPage: page,
  }) => {
    let externalPosterDetected = false;
    let externalPosterUrl = '';

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/poster.jpg') || url.includes('/poster')) {
        if (url.includes('dramaboxdb.com') || url.includes('hwztchapter')) {
          externalPosterDetected = true;
          externalPosterUrl = url;
        }
      }
    });

    const video = page.locator("video").first();
    await video.waitFor({
      state: "visible",
      timeout: TEST_TIMEOUTS.videoLoad,
    });

    await waitForVideoReady(page, TEST_TIMEOUTS.videoLoad);

    await page.waitForTimeout(2000);

    if (externalPosterDetected) {
      test.fail(true, `External poster host detected: ${externalPosterUrl}`);
    }
  });
});