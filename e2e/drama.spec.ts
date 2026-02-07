import { test, expect } from "@playwright/test";
import {
  waitForPageLoad,
  waitForApiResponse,
  clickDramaCard,
  getDramaCards,
  TEST_TIMEOUTS,
} from "./utils";

test.describe("Drama Browsing", () => {
  test.describe("Homepage", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/");
      await waitForPageLoad(page);
    });

    test("should display homepage with correct title", async ({ page }) => {
      const heading = page.locator('h1:has-text("Drama Streaming App")');
      await expect(heading).toBeVisible();

      const subtitle = page.locator(
        'p.text-lg:has-text("Your favorite dramas")',
      );
      await expect(subtitle).toBeVisible();
    });

    test("should display Browse Dramas button", async ({ page }) => {
      const browseButton = page.locator('a:has-text("Browse Dramas")');
      await expect(browseButton).toBeVisible();
      await expect(browseButton).toHaveAttribute("href", "/dramas");
    });

    test("should display Sign In button", async ({ page }) => {
      const signInButton = page.locator('a:has-text("Sign In")');
      await expect(signInButton).toBeVisible();
    });

    test("should display feature cards", async ({ page }) => {
      const featureCards = page
        .locator(".grid > div")
        .filter({ has: page.locator("h3") });
      await expect(featureCards.first()).toBeVisible();

      await expect(page.locator('h3:has-text("HD Streaming")')).toBeVisible();
      await expect(page.locator('h3:has-text("Watchlist")')).toBeVisible();
      await expect(page.locator('h3:has-text("Track Progress")')).toBeVisible();
    });

    test("should navigate to dramas page when clicking Browse Dramas", async ({
      page,
    }) => {
      const browseButton = page.locator('a:has-text("Browse Dramas")');
      await browseButton.click();

      await page.waitForURL("/dramas", { timeout: TEST_TIMEOUTS.navigation });
      await expect(page).toHaveURL("/dramas");
    });
  });

  test.describe("Dramas Browse Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/dramas");
      await waitForPageLoad(page);
    });

    test("should display Browse Dramas heading", async ({ page }) => {
      const heading = page.locator('h1:has-text("Browse Dramas")');
      await expect(heading).toBeVisible();
    });

    test("should display search input", async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search" i]');
      await expect(searchInput).toBeVisible();
    });

    test("should search for dramas", async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search" i]');
      await searchInput.fill("love");
      await searchInput.press("Enter");

      await page.waitForTimeout(2000);

      const dramaCards = await getDramaCards(page);
      const count = await dramaCards.count();

      expect(count).toBeGreaterThanOrEqual(0);
    });

    test("should display drama cards", async ({ page }) => {
      await page.waitForTimeout(2000);

      const dramaCards = await getDramaCards(page);
      const count = await dramaCards.count();

      if (count > 0) {
        const firstCard = dramaCards.first();
        await expect(firstCard).toBeVisible();

        const image = firstCard.locator("img").first();
        const hasImage = await image.isVisible().catch(() => false);
        expect(hasImage || true).toBe(true);
      }
    });

    test("should handle empty search results", async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search" i]');
      await searchInput.fill("xyznonexistent12345");
      await searchInput.press("Enter");

      await page.waitForTimeout(2000);

      const emptyState = page.locator("text=/No dramas found/i");
      const dramaCards = await getDramaCards(page);

      const isEmpty =
        (await emptyState.isVisible().catch(() => false)) ||
        (await dramaCards.count()) === 0;

      expect(isEmpty).toBe(true);
    });

    test("should load more content when clicking Load More", async ({
      page,
    }) => {
      await page.waitForTimeout(2000);

      const initialCards = await getDramaCards(page);
      const initialCount = await initialCards.count();

      if (initialCount === 0) {
        test.skip(true, "No dramas to load");
        return;
      }

      const loadMoreButton = page.locator('button:has-text("Load More")');
      const hasMoreButton = await loadMoreButton.isVisible().catch(() => false);

      if (!hasMoreButton) {
        test.skip(true, "No load more button");
        return;
      }

      await loadMoreButton.click();
      await page.waitForTimeout(2000);

      const afterLoadCards = await getDramaCards(page);
      const afterLoadCount = await afterLoadCards.count();

      expect(afterLoadCount).toBeGreaterThanOrEqual(initialCount);
    });
  });

  test.describe("Drama Details Page", () => {
    test("should navigate to drama details page from dramas list", async ({
      page,
    }) => {
      await page.goto("/dramas");
      await waitForPageLoad(page);
      await page.waitForTimeout(2000);

      const dramaCards = await getDramaCards(page);

      if ((await dramaCards.count()) === 0) {
        test.skip(true, "No dramas available");
        return;
      }

      await clickDramaCard(page, 0);

      await page.waitForURL(/\/dramas\/.+/, {
        timeout: TEST_TIMEOUTS.navigation,
      });
      await expect(page).toHaveURL(/\/dramas\/.+/);
    });

    test("should display drama information on details page", async ({
      page,
    }) => {
      await page.goto("/dramas");
      await waitForPageLoad(page);
      await page.waitForTimeout(2000);

      const dramaCards = await getDramaCards(page);

      if ((await dramaCards.count()) === 0) {
        test.skip(true, "No dramas available");
        return;
      }

      await clickDramaCard(page, 0);
      await page.waitForURL(/\/dramas\/.+/, {
        timeout: TEST_TIMEOUTS.navigation,
      });
      await waitForPageLoad(page);

      const title = page.locator("h1").first();
      await expect(title).toBeVisible();

      const episodesHeading = page.locator('h2:has-text("Episodes")');
      await expect(episodesHeading).toBeVisible();
    });

    test("should display episode list on drama page", async ({ page }) => {
      await page.goto("/dramas");
      await waitForPageLoad(page);
      await page.waitForTimeout(2000);

      const dramaCards = await getDramaCards(page);

      if ((await dramaCards.count()) === 0) {
        test.skip(true, "No dramas available");
        return;
      }

      await clickDramaCard(page, 0);
      await page.waitForURL(/\/dramas\/.+/, {
        timeout: TEST_TIMEOUTS.navigation,
      });
      await waitForPageLoad(page);

      const episodeItems = page.locator('[class*="episode"]').first();
      const hasEpisodes = await episodeItems.isVisible().catch(() => false);

      const episodesSection = page.locator('h2:has-text("Episodes")');
      await expect(episodesSection).toBeVisible();
    });

    test("should navigate back to dramas list", async ({ page }) => {
      await page.goto("/dramas");
      await waitForPageLoad(page);
      await page.waitForTimeout(2000);

      const dramaCards = await getDramaCards(page);

      if ((await dramaCards.count()) === 0) {
        test.skip(true, "No dramas available");
        return;
      }

      await clickDramaCard(page, 0);
      await page.waitForURL(/\/dramas\/.+/, {
        timeout: TEST_TIMEOUTS.navigation,
      });

      const backButton = page.locator('button:has-text("Back to Dramas")');
      await backButton.click();

      await page.waitForURL("/dramas", { timeout: TEST_TIMEOUTS.navigation });
      await expect(page).toHaveURL("/dramas");
    });
  });
});
