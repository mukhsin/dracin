import { test, expect } from "@playwright/test";
import {
  waitForPageLoad,
  waitForVideoReady,
  clickDramaCard,
  getDramaCards,
  TEST_TIMEOUTS,
  SELECTORS,
} from "./utils";

test.describe("Watch URL Flow - Simple", () => {
  test("should navigate to drama page and verify URL structure", async ({
    page,
  }) => {
    // Navigate to dramas page
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

    // Verify drama page URL format
    const dramaUrl = page.url();
    expect(dramaUrl).toMatch(/\/dramas\/.+/);

    // Take screenshot
    await page.screenshot({
      path: ".sisyphus/evidence/task-12-drama-page-simple.png",
    });
  });

  test("should verify episode list exists on drama page", async ({ page }) => {
    // Navigate to dramas page
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

    // Verify episode list exists
    const episodeItems = page.locator(SELECTORS.episodeItem);
    const hasEpisodes = await episodeItems.count().catch(() => 0);
    expect(hasEpisodes).toBeGreaterThan(0);

    // Verify watch links exist
    const watchLinks = page.locator('a[href*="/dramas/"]');
    const hasWatchLinks = await watchLinks.count().catch(() => 0);
    expect(hasWatchLinks).toBeGreaterThan(0);

    // Take screenshot
    await page.screenshot({
      path: ".sisyphus/evidence/task-12-episode-list-simple.png",
    });
  });

  test("should show error for invalid watch URL", async ({ page }) => {
    // Navigate to invalid watch URL
    await page.goto("/dramas/nonexistent/999");
    await waitForPageLoad(page);

    // Verify error message appears
    const errorMessage = page.locator(
      "text=/Episode Not Found|episode not found|404|Not Found|Error/i",
    );
    const hasError = await errorMessage.isVisible().catch(() => false);
    expect(hasError).toBe(true);

    // Take screenshot
    await page.screenshot({
      path: ".sisyphus/evidence/task-12-error-page-simple.png",
    });
  });
});
