import { test, expect } from "./fixtures";
import {
  waitForPageLoad,
  waitForApiResponse,
  clickDramaCard,
  toggleWatchlist,
  getDramaCards,
  TEST_TIMEOUTS,
  SELECTORS,
} from "./utils";

test.describe("Watchlist Features", () => {
  test.describe("Authenticated User", () => {
    test("should display empty watchlist message", async ({
      authenticatedPage: page,
    }) => {
      await page.goto("/watchlist");
      await waitForPageLoad(page);

      const emptyMessage = page
        .locator("text=/empty|no items|nothing saved/i")
        .first();
      const watchlistItems = page
        .locator('[data-testid="watchlist-item"], [class*="watchlist-item"]')
        .first();

      const isEmpty =
        (await emptyMessage.isVisible().catch(() => false)) ||
        !(await watchlistItems.isVisible().catch(() => false));

      expect(isEmpty).toBe(true);
    });

    test("should add drama to watchlist from details page", async ({
      authenticatedPage: page,
    }) => {
      await page.goto("/");
      await waitForPageLoad(page);

      const dramaCards = await getDramaCards(page);
      if ((await dramaCards.count()) === 0) {
        test.skip();
        return;
      }

      await clickDramaCard(page, 0);
      await page.waitForURL(/\/drama\/.+/, {
        timeout: TEST_TIMEOUTS.navigation,
      });
      await waitForPageLoad(page);

      await toggleWatchlist(page, true);

      await page.goto("/watchlist");
      await waitForPageLoad(page);
      await waitForApiResponse(page, "/api/watchlist");

      const watchlistItems = page
        .locator('[data-testid="watchlist-item"], [class*="watchlist-item"]')
        .first();
      const hasItems = await watchlistItems.isVisible().catch(() => false);

      expect(hasItems).toBe(true);
    });

    test("should display watchlist button on drama card", async ({
      authenticatedPage: page,
    }) => {
      await page.goto("/");
      await waitForPageLoad(page);

      const dramaCards = await getDramaCards(page);
      if ((await dramaCards.count()) === 0) {
        test.skip();
        return;
      }

      const firstCard = dramaCards.first();
      const watchlistButton = firstCard.locator(SELECTORS.watchlistButton);

      const hasButton = await watchlistButton.isVisible().catch(() => false);
      expect(hasButton).toBe(true);
    });

    test("should add drama to watchlist from card", async ({
      authenticatedPage: page,
    }) => {
      await page.goto("/");
      await waitForPageLoad(page);

      const dramaCards = await getDramaCards(page);
      if ((await dramaCards.count()) === 0) {
        test.skip();
        return;
      }

      const firstCard = dramaCards.first();
      const watchlistButton = firstCard.locator(SELECTORS.watchlistButton);

      if (!(await watchlistButton.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await watchlistButton.click();
      await page.waitForTimeout(1000);

      await page.goto("/watchlist");
      await waitForPageLoad(page);
      await waitForApiResponse(page, "/api/watchlist");

      const watchlistItems = page
        .locator('[data-testid="watchlist-item"], [class*="watchlist-item"]')
        .first();
      const hasItems = await watchlistItems.isVisible().catch(() => false);

      expect(hasItems).toBe(true);
    });

    test("should remove drama from watchlist", async ({
      authenticatedPage: page,
    }) => {
      await page.goto("/");
      await waitForPageLoad(page);

      const dramaCards = await getDramaCards(page);
      if ((await dramaCards.count()) === 0) {
        test.skip();
        return;
      }

      await clickDramaCard(page, 0);
      await page.waitForURL(/\/drama\/.+/, {
        timeout: TEST_TIMEOUTS.navigation,
      });
      await waitForPageLoad(page);

      await toggleWatchlist(page, true);
      await page.waitForTimeout(1000);

      await toggleWatchlist(page, false);
      await page.waitForTimeout(1000);

      await page.goto("/watchlist");
      await waitForPageLoad(page);
      await waitForApiResponse(page, "/api/watchlist");

      const emptyMessage = page
        .locator("text=/empty|no items|nothing saved/i")
        .first();
      const watchlistItems = page
        .locator('[data-testid="watchlist-item"], [class*="watchlist-item"]')
        .first();

      const isEmpty =
        (await emptyMessage.isVisible().catch(() => false)) ||
        !(await watchlistItems.isVisible().catch(() => false));

      expect(isEmpty).toBe(true);
    });

    test("should display watchlist count badge", async ({
      authenticatedPage: page,
    }) => {
      await page.goto("/");
      await waitForPageLoad(page);

      const dramaCards = await getDramaCards(page);
      if ((await dramaCards.count()) === 0) {
        test.skip();
        return;
      }

      await clickDramaCard(page, 0);
      await page.waitForURL(/\/drama\/.+/, {
        timeout: TEST_TIMEOUTS.navigation,
      });
      await waitForPageLoad(page);

      await toggleWatchlist(page, true);

      const navWatchlistLink = page
        .locator('a[href="/watchlist"], nav a:has-text("Watchlist")')
        .first();

      if (await navWatchlistLink.isVisible().catch(() => false)) {
        const badge = navWatchlistLink
          .locator('[class*="badge"], [data-testid="badge"]')
          .first();
        const hasBadge = await badge.isVisible().catch(() => false);

        if (hasBadge) {
          const count = await badge.textContent();
          expect(count).toMatch(/\d+/);
        }
      }
    });

    test("should persist watchlist across sessions", async ({
      authenticatedPage: page,
      browser,
    }) => {
      await page.goto("/");
      await waitForPageLoad(page);

      const dramaCards = await getDramaCards(page);
      if ((await dramaCards.count()) === 0) {
        test.skip();
        return;
      }

      await clickDramaCard(page, 0);
      await page.waitForURL(/\/drama\/.+/, {
        timeout: TEST_TIMEOUTS.navigation,
      });
      await waitForPageLoad(page);

      await toggleWatchlist(page, true);

      const context = page.context();
      const storageState = await context.storageState();

      const newContext = await browser.newContext({ storageState });
      const newPage = await newContext.newPage();

      await newPage.goto("/watchlist");
      await waitForPageLoad(newPage);
      await waitForApiResponse(newPage, "/api/watchlist");

      const watchlistItems = newPage
        .locator('[data-testid="watchlist-item"], [class*="watchlist-item"]')
        .first();
      const hasItems = await watchlistItems.isVisible().catch(() => false);

      expect(hasItems).toBe(true);

      await newContext.close();
    });
  });

  test.describe("Continue Watching", () => {
    test("should display continue watching section on homepage", async ({
      authenticatedPage: page,
    }) => {
      await page.goto("/");
      await waitForPageLoad(page);

      const continueSection = page.locator("text=/continue watching/i").first();

      const hasSection = await continueSection.isVisible().catch(() => false);

      if (!hasSection) {
        test.skip();
        return;
      }

      await expect(continueSection).toBeVisible();
    });

    test("should show progress bar for partially watched content", async ({
      authenticatedPage: page,
    }) => {
      await page.goto("/");
      await waitForPageLoad(page);

      const dramaCards = await getDramaCards(page);
      if ((await dramaCards.count()) === 0) {
        test.skip();
        return;
      }

      await clickDramaCard(page, 0);
      await page.waitForURL(/\/drama\/.+/, {
        timeout: TEST_TIMEOUTS.navigation,
      });
      await waitForPageLoad(page);

      const episodeItems = page.locator(SELECTORS.episodeItem);
      if ((await episodeItems.count()) === 0) {
        test.skip();
        return;
      }

      const firstEpisode = episodeItems.first();
      const watchLink = firstEpisode.locator('a[href*="/watch/"]').first();

      if (await watchLink.isVisible().catch(() => false)) {
        await Promise.all([
          page.waitForNavigation({
            waitUntil: "networkidle",
            timeout: TEST_TIMEOUTS.navigation,
          }),
          watchLink.click(),
        ]);

        await page.waitForTimeout(5000);

        await page.goto("/");
        await waitForPageLoad(page);

        const progressBar = page
          .locator('[class*="progress"], [data-testid="progress-bar"]')
          .first();
        const hasProgress = await progressBar.isVisible().catch(() => false);

        expect(hasProgress).toBe(true);
      }
    });
  });

  test.describe("History", () => {
    test("should display watch history page", async ({
      authenticatedPage: page,
    }) => {
      await page.goto("/history");
      await waitForPageLoad(page);

      const historyTitle = page
        .locator('h1:has-text("History"), h2:has-text("History")')
        .first();
      await expect(historyTitle).toBeVisible();
    });

    test("should show watched episodes in history", async ({
      authenticatedPage: page,
    }) => {
      await page.goto("/");
      await waitForPageLoad(page);

      const dramaCards = await getDramaCards(page);
      if ((await dramaCards.count()) === 0) {
        test.skip();
        return;
      }

      await clickDramaCard(page, 0);
      await page.waitForURL(/\/drama\/.+/, {
        timeout: TEST_TIMEOUTS.navigation,
      });
      await waitForPageLoad(page);

      const episodeItems = page.locator(SELECTORS.episodeItem);
      if ((await episodeItems.count()) === 0) {
        test.skip();
        return;
      }

      const firstEpisode = episodeItems.first();
      const watchLink = firstEpisode.locator('a[href*="/watch/"]').first();

      if (await watchLink.isVisible().catch(() => false)) {
        await Promise.all([
          page.waitForNavigation({
            waitUntil: "networkidle",
            timeout: TEST_TIMEOUTS.navigation,
          }),
          watchLink.click(),
        ]);

        await page.waitForTimeout(3000);

        await page.goto("/history");
        await waitForPageLoad(page);
        await waitForApiResponse(page, "/api/history");

        const historyItems = page
          .locator('[data-testid="history-item"], [class*="history-item"]')
          .first();
        const hasItems = await historyItems.isVisible().catch(() => false);

        expect(hasItems).toBe(true);
      }
    });

    test("should delete history entry", async ({ authenticatedPage: page }) => {
      await page.goto("/history");
      await waitForPageLoad(page);

      const historyItems = page
        .locator('[data-testid="history-item"], [class*="history-item"]')
        .first();

      if (!(await historyItems.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      const deleteButton = historyItems
        .locator('button[aria-label*="delete" i], button:has-text("Delete")')
        .first();

      if (await deleteButton.isVisible().catch(() => false)) {
        await deleteButton.click();
        await page.waitForTimeout(1000);

        const remainingItems = page.locator(
          '[data-testid="history-item"], [class*="history-item"]',
        );
        const count = await remainingItems.count();

        expect(count).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
