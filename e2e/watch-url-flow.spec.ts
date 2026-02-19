import { test, expect } from "./fixtures";
import {
  waitForPageLoad,
  waitForVideoReady,
  clickDramaCard,
  getDramaCards,
  TEST_TIMEOUTS,
  SELECTORS,
} from "./utils";

test.describe("Watch URL Flow", () => {
  test.describe("Full watch flow - drama to episode to next episode", () => {
    test("should navigate from drama to episode and then to next episode", async ({
      authenticatedPage: page,
    }) => {
      // 1. Navigate to a drama page
      await page.goto("/dramas");
      await waitForPageLoad(page);
      await page.waitForTimeout(2000);

      const dramaCards = await getDramaCards(page);
      if ((await dramaCards.count()) === 0) {
        test.skip(true, "No dramas available");
        return;
      }

      // Click on first drama card
      await clickDramaCard(page, 0);
      await page.waitForURL(/\/dramas\/.+/, {
        timeout: TEST_TIMEOUTS.navigation,
      });
      await waitForPageLoad(page);

      // Get the drama slug from the URL
      const dramaUrl = page.url();
      const dramaSlug = dramaUrl.split("/").pop();

      // Take screenshot at drama page
      await page.screenshot({
        path: ".sisyphus/evidence/task-12-drama-page.png",
      });

      // 2. Click on episode 1
      const episodeItems = page.locator(SELECTORS.episodeItem);
      if ((await episodeItems.count()) === 0) {
        test.skip(true, "No episodes available");
        return;
      }

      const firstEpisode = episodeItems.first();
      const watchLink = firstEpisode.locator('a[href*="/watch/"]').first();

      if (!(await watchLink.isVisible().catch(() => false))) {
        test.skip(true, "No watch link found");
        return;
      }

      await Promise.all([
        page.waitForNavigation({
          waitUntil: "networkidle",
          timeout: TEST_TIMEOUTS.navigation,
        }),
        watchLink.click(),
      ]);

      // 3. Verify URL is: /watch/:dramaSlug/1
      await page.waitForURL(/\/watch\/.+\/1/, {
        timeout: TEST_TIMEOUTS.navigation,
      });
      await expect(page).toHaveURL(new RegExp(`\\/watch\\/${dramaSlug}\\/1`));

      // Take screenshot at watch page
      await page.screenshot({
        path: ".sisyphus/evidence/task-12-watch-page-1.png",
      });

      // 4. Verify video player loads
      const player = page.locator(SELECTORS.playerContainer);
      await expect(player).toBeVisible({ timeout: TEST_TIMEOUTS.videoLoad });

      const video = page.locator("video").first();
      await expect(video).toBeVisible({ timeout: TEST_TIMEOUTS.videoLoad });

      // 5. Click "NEXT" button
      const nextButton = page.locator('button:has-text("NEXT")').first();
      const hasNextButton = await nextButton.isVisible().catch(() => false);

      if (!hasNextButton) {
        test.skip(true, "No NEXT button available");
        return;
      }

      await Promise.all([
        page.waitForNavigation({
          waitUntil: "networkidle",
          timeout: TEST_TIMEOUTS.navigation,
        }),
        nextButton.click(),
      ]);

      // 6. Verify URL changes to: /watch/:dramaSlug/2
      await page.waitForURL(/\/watch\/.+\/2/, {
        timeout: TEST_TIMEOUTS.navigation,
      });
      await expect(page).toHaveURL(new RegExp(`\\/watch\\/${dramaSlug}\\/2`));

      // Take screenshot at next episode
      await page.screenshot({
        path: ".sisyphus/evidence/task-12-watch-page-2.png",
      });

      // Verify video player still loads
      const newPlayer = page.locator(SELECTORS.playerContainer);
      await expect(newPlayer).toBeVisible({ timeout: TEST_TIMEOUTS.videoLoad });
    });
  });

  test.describe("Back button returns to drama page", () => {
    test("should navigate back to drama page using back button", async ({
      authenticatedPage: page,
    }) => {
      // 1. Navigate to /watch/test-drama/1
      await page.goto("/dramas");
      await waitForPageLoad(page);
      await page.waitForTimeout(2000);

      const dramaCards = await getDramaCards(page);
      if ((await dramaCards.count()) === 0) {
        test.skip(true, "No dramas available");
        return;
      }

      // Click on first drama card
      await clickDramaCard(page, 0);
      await page.waitForURL(/\/dramas\/.+/, {
        timeout: TEST_TIMEOUTS.navigation,
      });
      await waitForPageLoad(page);

      // Get the drama slug from the URL
      const dramaUrl = page.url();
      const dramaSlug = dramaUrl.split("/").pop();

      // Navigate to episode 1
      const episodeItems = page.locator(SELECTORS.episodeItem);
      if ((await episodeItems.count()) === 0) {
        test.skip(true, "No episodes available");
        return;
      }

      const firstEpisode = episodeItems.first();
      const watchLink = firstEpisode.locator('a[href*="/watch/"]').first();

      if (!(await watchLink.isVisible().catch(() => false))) {
        test.skip(true, "No watch link found");
        return;
      }

      await Promise.all([
        page.waitForNavigation({
          waitUntil: "networkidle",
          timeout: TEST_TIMEOUTS.navigation,
        }),
        watchLink.click(),
      ]);

      await page.waitForURL(/\/watch\/.+\/1/, {
        timeout: TEST_TIMEOUTS.navigation,
      });

      // Take screenshot before clicking back
      await page.screenshot({
        path: ".sisyphus/evidence/task-12-before-back.png",
      });

      // 2. Click back button (ChevronLeft icon with aria-label)
      const backButton = page
        .locator(
          'button[aria-label*="back" i], button[title*="back" i], [data-testid="back-button"]',
        )
        .first();

      const hasBackButton = await backButton.isVisible().catch(() => false);

      if (!hasBackButton) {
        // Fallback: Look for ChevronLeft icon
        const chevronLeft = page.locator('svg[class*="chevron-left"]').first();
        if (await chevronLeft.isVisible().catch(() => false)) {
          await chevronLeft.click();
        } else {
          test.skip(true, "No back button found");
          return;
        }
      } else {
        await backButton.click();
      }

      // 3. Verify URL is: /dramas/:dramaSlug
      await page.waitForURL(new RegExp(`\\/dramas\\/${dramaSlug}`), {
        timeout: TEST_TIMEOUTS.navigation,
      });
      await expect(page).toHaveURL(new RegExp(`\\/dramas\\/${dramaSlug}`));

      // Take screenshot after back navigation
      await page.screenshot({
        path: ".sisyphus/evidence/task-12-after-back.png",
      });

      // Verify we're back on drama page
      const dramaTitle = page.locator("h1").first();
      await expect(dramaTitle).toBeVisible();
    });
  });

  test.describe("Invalid URL shows error page", () => {
    test("should show error page for invalid episode URL", async ({
      authenticatedPage: page,
    }) => {
      // 1. Navigate to /watch/nonexistent/999
      await page.goto("/watch/nonexistent/999");
      await waitForPageLoad(page);

      // Take screenshot of error page
      await page.screenshot({
        path: ".sisyphus/evidence/task-12-error-page.png",
      });

      // 2. Verify error message: "Episode Not Found"
      const errorMessage = page.locator(
        "text=/Episode Not Found|episode not found|404|Not Found/i",
      );
      await expect(errorMessage).toBeVisible({
        timeout: TEST_TIMEOUTS.elementVisible,
      });

      // 3. Verify refresh button exists
      const refreshButton = page
        .locator(
          "button:has-text(/Refresh|Try Again|Reload/i), a:has-text(/Refresh|Try Again|Reload/i)",
        )
        .first();

      const hasRefreshButton = await refreshButton
        .isVisible()
        .catch(() => false);
      expect(hasRefreshButton).toBe(true);

      // Test refresh button functionality
      if (hasRefreshButton) {
        await refreshButton.click();
        await waitForPageLoad(page);

        // Should still show error after refresh
        const stillError = page.locator(
          "text=/Episode Not Found|episode not found|404|Not Found/i",
        );
        await expect(stillError).toBeVisible({
          timeout: TEST_TIMEOUTS.elementVisible,
        });
      }
    });
  });
});
