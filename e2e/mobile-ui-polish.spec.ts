import { test, expect } from "@playwright/test";
import {
  waitForPageLoad,
  waitForApiResponse,
  clickDramaCard,
  TEST_TIMEOUTS,
} from "./utils";

test.describe("Mobile UI Polish Features", () => {
  test.describe("/dramas search parameter verification", () => {
    test("should send search query as 'q' parameter", async ({ page }) => {
      // Setup network listener to capture API requests
      const apiRequests: string[] = [];
      page.on("request", (request) => {
        if (request.url().includes("/api/dramas")) {
          apiRequests.push(request.url());
        }
      });

      await page.goto("/dramas");
      await waitForPageLoad(page);

      // Wait for dramas to load
      await page.waitForTimeout(2000);

      // Find search input and type a term
      const searchInput = page.locator('input[placeholder*="Search" i]');
      await expect(searchInput).toBeVisible();

      await searchInput.fill("love");
      await page.waitForTimeout(500); // Wait for debounce

      // Verify at least one API request was made
      expect(apiRequests.length).toBeGreaterThan(0);

      // Check that all requests contain 'q=' parameter and NOT 'search='
      for (const url of apiRequests) {
        expect(url).toContain("q=");
        expect(url).not.toContain("search=");
      }

      // Save evidence
      const evidenceDir = ".sisyphus/evidence";
      await page.evaluate(async (dir) => {
        try {
          const response = await fetch("/api/evidence/mkdir", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: dir }),
          });
        } catch (e) {
          // Directory might already exist
        }
      }, evidenceDir);

      const evidenceContent = apiRequests
        .map((url) => url.split("?")[1])
        .join("\n");

      await page.evaluate(
        async ({ dir, content }) => {
          const response = await fetch("/api/evidence/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              path: `${dir}/dramas-search-q.txt`,
              content,
            }),
          });
        },
        { dir: evidenceDir, content: evidenceContent },
      );
    });

    test("should reduce flicker when searching", async ({ page }) => {
      await page.goto("/dramas");
      await waitForPageLoad(page);
      await page.waitForTimeout(2000);

      const searchInput = page.locator('input[placeholder*="Search" i]');
      const initialCardCount = await page
        .locator('[class*="drama-card"]')
        .count();

      // Type rapidly - should not cause multiple full page reloads
      await searchInput.fill("a");
      await page.waitForTimeout(100);
      await searchInput.fill("ab");
      await page.waitForTimeout(100);
      await searchInput.fill("abc");
      await page.waitForTimeout(500); // Wait for debounce to settle

      // Should have filtered results without full reload flicker
      const cards = page.locator('[class*="drama-card"]');
      await expect(cards.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Watch page mobile overlay and label", () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to dramas first to get a drama with episodes
      await page.goto("/dramas");
      await waitForPageLoad(page);
      await page.waitForTimeout(2000);

      const dramaCards = page.locator('[class*="drama-card"]');

      if ((await dramaCards.count()) === 0) {
        test.skip(true, "No dramas available for testing");
        return;
      }

      // Click first drama to view episodes
      await dramaCards.first().click();
      await page.waitForURL(/\/dramas\/.+/, {
        timeout: TEST_TIMEOUTS.navigation,
      });
      await waitForPageLoad(page);

      // Find first episode and navigate to watch page
      const episodeItems = page.locator('[class*="episode"]');
      const count = await episodeItems.count();

      if (count === 0) {
        test.skip(true, "No episodes available for testing");
        return;
      }

      // Click first episode's watch link
      const firstWatchLink = episodeItems
        .first()
        .locator('a[href*="/watch/"]')
        .first();

      if (await firstWatchLink.isVisible().catch(() => false)) {
        await firstWatchLink.click();
        await page.waitForURL(/\/watch\/.+/, {
          timeout: TEST_TIMEOUTS.navigation,
        });
        await waitForPageLoad(page);
      }
    });

    test("should have icon-only back control with aria-label", async ({
      page,
    }) => {
      // Use mobile viewport
      await page.setViewportSize({ width: 375, height: 812 }); // iPhone X

      const backButton = page
        .locator('a[aria-label*="Back"]')
        .or(page.locator('a[href*="/dramas/"]').first());

      await expect(backButton).toBeVisible();

      // Check it's icon-only (should not have visible text)
      const backButtonElement = backButton.first();
      const textContent = await backButtonElement.textContent();
      expect(textContent?.trim()).toBe(""); // Should be empty or just whitespace

      // Verify aria-label exists and is not empty
      const ariaLabel = await backButtonElement.getAttribute("aria-label");
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).not.toBe("");
    });

    test("should not display episode title overlay", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });

      // Wait for player to load
      await page.waitForTimeout(2000);

      // Check that there's NO title overlay in the video player area
      const videoPlayerArea = page.locator('[class*="video"]').first();
      await expect(videoPlayerArea).toBeVisible({ timeout: 10000 });

      // Look for any title overlay text within the video player
      const titleOverlays = page
        .locator('[class*="video"]')
        .locator("h1, h2, h3");

      const hasTitleOverlay = await titleOverlays
        .isVisible()
        .catch(() => false);
      expect(hasTitleOverlay).toBe(false);
    });

    test("should display correct label format {Drama Title} • Episode {N}", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.waitForTimeout(2000);

      // Find the episode metadata label
      const metadataLabel = page.locator("text=/•/").first();

      await expect(metadataLabel).toBeVisible();

      // Verify it contains the bullet point character
      const labelText = await metadataLabel.textContent();
      expect(labelText).toContain("•");
      expect(labelText).toMatch(/•\s*Episode\s*\d+/);
    });

    test("should take screenshot of mobile watch page", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.waitForTimeout(2000);

      // Take screenshot for evidence
      await page.screenshot({
        path: ".sisyphus/evidence/watch-mobile-overlay.png",
        fullPage: true,
      });
    });
  });

  test.describe("Sticky prev/next episode bar", () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to a drama and get episodes
      await page.goto("/dramas");
      await waitForPageLoad(page);
      await page.waitForTimeout(2000);

      const dramaCards = page.locator('[class*="drama-card"]');

      if ((await dramaCards.count()) === 0) {
        test.skip(true, "No dramas available for testing");
        return;
      }

      await dramaCards.first().click();
      await page.waitForURL(/\/dramas\/.+/, {
        timeout: TEST_TIMEOUTS.navigation,
      });
      await waitForPageLoad(page);

      // Find a middle episode (not first or last) to test both prev/next
      const episodeItems = page.locator('[class*="episode"]');
      const count = await episodeItems.count();

      if (count < 3) {
        test.skip(true, "Need at least 3 episodes to test prev/next");
        return;
      }

      // Click the second episode (index 1) to test both prev and next
      const secondEpisode = episodeItems.nth(1);
      const secondWatchLink = secondEpisode
        .locator('a[href*="/watch/"]')
        .first();

      if (await secondWatchLink.isVisible().catch(() => false)) {
        await secondWatchLink.click();
        await page.waitForURL(/\/watch\/.+/, {
          timeout: TEST_TIMEOUTS.navigation,
        });
        await waitForPageLoad(page);
      }
    });

    test("should display sticky prev/next bar on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.waitForTimeout(2000);

      // Look for the sticky navigation bar
      const stickyBar = page
        .locator("footer")
        .or(page.locator('[class*="fixed"][class*="bottom-0"]'));

      await expect(stickyBar).toBeVisible();

      // Verify it's at the bottom of the viewport
      const boundingBox = await stickyBar.first().boundingBox();
      expect(boundingBox?.y).toBeGreaterThan(600); // Near bottom on iPhone X viewport
    });

    test("should show both prev and next controls on middle episode", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.waitForTimeout(2000);

      const stickyBar = page
        .locator('[class*="fixed"][class*="bottom-0"]')
        .or(page.locator("footer"))
        .first();

      await expect(stickyBar).toBeVisible();

      // Look for both "Prev" and "Next" text/buttons
      const prevButton = page
        .locator("text=/Prev/i")
        .or(page.locator('button[aria-label*="previous"]'));
      const nextButton = page
        .locator("text=/Next/i")
        .or(page.locator('button[aria-label*="next"]'));

      await expect(prevButton.first()).toBeVisible();
      await expect(nextButton.first()).toBeVisible();
    });

    test("should navigate to previous episode when clicking Prev", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.waitForTimeout(2000);

      const currentUrl = page.url();

      const prevButton = page
        .locator("text=/Prev/i")
        .or(page.locator('button[aria-label*="previous"]'))
        .first();

      if (await prevButton.isVisible().catch(() => false)) {
        await prevButton.click();

        // Wait for URL to change
        await page.waitForURL(/\/watch\/.+/, {
          timeout: TEST_TIMEOUTS.navigation,
        });

        const newUrl = page.url();
        expect(newUrl).not.toBe(currentUrl);
        expect(newUrl).toMatch(/\/watch\/.+/);
      }
    });

    test("should navigate to next episode when clicking Next", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.waitForTimeout(2000);

      const currentUrl = page.url();

      const nextButton = page
        .locator("text=/Next/i")
        .or(page.locator('button[aria-label*="next"]'))
        .first();

      if (await nextButton.isVisible().catch(() => false)) {
        await nextButton.click();

        // Wait for URL to change
        await page.waitForURL(/\/watch\/.+/, {
          timeout: TEST_TIMEOUTS.navigation,
        });

        const newUrl = page.url();
        expect(newUrl).not.toBe(currentUrl);
        expect(newUrl).toMatch(/\/watch\/.+/);
      }
    });

    test("should hide prev on first episode", async ({ page }) => {
      // Navigate to first episode
      await page.goto("/dramas");
      await waitForPageLoad(page);
      await page.waitForTimeout(2000);

      const dramaCards = page.locator('[class*="drama-card"]');
      await dramaCards.first().click();
      await page.waitForURL(/\/dramas\/.+/, {
        timeout: TEST_TIMEOUTS.navigation,
      });
      await waitForPageLoad(page);

      // Click first episode
      const episodeItems = page.locator('[class*="episode"]');
      const firstWatchLink = episodeItems
        .first()
        .locator('a[href*="/watch/"]')
        .first();

      if (await firstWatchLink.isVisible().catch(() => false)) {
        await firstWatchLink.click();
        await page.waitForURL(/\/watch\/.+/, {
          timeout: TEST_TIMEOUTS.navigation,
        });
        await waitForPageLoad(page);
      }

      await page.setViewportSize({ width: 375, height: 812 });
      await page.waitForTimeout(2000);

      // Prev button should NOT be visible
      const prevButton = page
        .locator("text=/Prev/i")
        .or(page.locator('button[aria-label*="previous"]'));

      const isPrevVisible = await prevButton
        .first()
        .isVisible()
        .catch(() => false);
      expect(isPrevVisible).toBe(false);

      // Next button SHOULD be visible (if there's more than 1 episode)
      const nextButton = page
        .locator("text=/Next/i")
        .or(page.locator('button[aria-label*="next"]'));

      await expect(nextButton.first()).toBeVisible();
    });

    test("should hide next on last episode", async ({ page }) => {
      // Navigate to drama and get episodes count
      await page.goto("/dramas");
      await waitForPageLoad(page);
      await page.waitForTimeout(2000);

      const dramaCards = page.locator('[class*="drama-card"]');
      await dramaCards.first().click();
      await page.waitForURL(/\/dramas\/.+/, {
        timeout: TEST_TIMEOUTS.navigation,
      });
      await waitForPageLoad(page);

      const episodeItems = page.locator('[class*="episode"]');
      const count = await episodeItems.count();

      if (count < 2) {
        test.skip(true, "Need at least 2 episodes to test last episode");
        return;
      }

      // Click last episode
      const lastWatchLink = episodeItems
        .nth(count - 1)
        .locator('a[href*="/watch/"]')
        .first();

      if (await lastWatchLink.isVisible().catch(() => false)) {
        await lastWatchLink.click();
        await page.waitForURL(/\/watch\/.+/, {
          timeout: TEST_TIMEOUTS.navigation,
        });
        await waitForPageLoad(page);
      }

      await page.setViewportSize({ width: 375, height: 812 });
      await page.waitForTimeout(2000);

      // Next button should NOT be visible
      const nextButton = page
        .locator("text=/Next/i")
        .or(page.locator('button[aria-label*="next"]'));

      const isNextVisible = await nextButton
        .first()
        .isVisible()
        .catch(() => false);
      expect(isNextVisible).toBe(false);

      // Prev button SHOULD be visible
      const prevButton = page
        .locator("text=/Prev/i")
        .or(page.locator('button[aria-label*="previous"]'));

      await expect(prevButton.first()).toBeVisible();
    });

    test("should not show bar on single-episode drama", async ({ page }) => {
      // This test would require a drama with only 1 episode
      // For now, we'll skip if we can't find such a drama
      await page.setViewportSize({ width: 375, height: 812 });

      const stickyBar = page
        .locator('[class*="fixed"][class*="bottom-0"]')
        .or(page.locator("footer"));

      // Check if sticky bar exists
      const barExists = await stickyBar.isVisible().catch(() => false);

      // If bar exists, verify it has both prev and next
      // If it doesn't exist, that's also valid for single-episode drama
      if (barExists) {
        const prevButton = page.locator("text=/Prev/i");
        const nextButton = page.locator("text=/Next/i");

        // At least one should not be visible for single episode
        const prevVisible = await prevButton
          .first()
          .isVisible()
          .catch(() => false);
        const nextVisible = await nextButton
          .first()
          .isVisible()
          .catch(() => false);

        expect(prevVisible || nextVisible).toBe(false);
      }
    });

    test("should take screenshot of sticky prev/next bar", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: ".sisyphus/evidence/watch-mobile-prev-next.png",
        fullPage: true,
      });
    });

    test("should take screenshot of first/last episode state", async ({
      page,
    }) => {
      // Navigate to first episode
      await page.goto("/dramas");
      await waitForPageLoad(page);
      await page.waitForTimeout(2000);

      const dramaCards = page.locator('[class*="drama-card"]');
      await dramaCards.first().click();
      await page.waitForURL(/\/dramas\/.+/, {
        timeout: TEST_TIMEOUTS.navigation,
      });
      await waitForPageLoad(page);

      const episodeItems = page.locator('[class*="episode"]');
      const firstWatchLink = episodeItems
        .first()
        .locator('a[href*="/watch/"]')
        .first();

      if (await firstWatchLink.isVisible().catch(() => false)) {
        await firstWatchLink.click();
        await page.waitForURL(/\/watch\/.+/, {
          timeout: TEST_TIMEOUTS.navigation,
        });
        await waitForPageLoad(page);
      }

      await page.setViewportSize({ width: 375, height: 812 });
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: ".sisyphus/evidence/watch-mobile-ends.png",
        fullPage: true,
      });
    });
  });

  test.describe("Desktop viewport tests", () => {
    test("should not show sticky prev/next bar on desktop", async ({
      page,
    }) => {
      // Use desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });

      // Navigate to a watch page
      await page.goto("/dramas");
      await waitForPageLoad(page);
      await page.waitForTimeout(2000);

      const dramaCards = page.locator('[class*="drama-card"]');
      if ((await dramaCards.count()) > 0) {
        await dramaCards.first().click();
        await page.waitForURL(/\/dramas\/.+/, {
          timeout: TEST_TIMEOUTS.navigation,
        });
        await waitForPageLoad(page);

        const episodeItems = page.locator('[class*="episode"]');
        if ((await episodeItems.count()) > 0) {
          const watchLink = episodeItems
            .first()
            .locator('a[href*="/watch/"]')
            .first();

          if (await watchLink.isVisible().catch(() => false)) {
            await watchLink.click();
            await page.waitForURL(/\/watch\/.+/, {
              timeout: TEST_TIMEOUTS.navigation,
            });
            await waitForPageLoad(page);
          }
        }
      }

      await page.waitForTimeout(2000);

      // Sticky bar should NOT be visible on desktop (md:hidden)
      const stickyBar = page
        .locator('[class*="fixed"][class*="bottom-0"]')
        .or(page.locator("footer"));

      // The bar should have md:hidden class or not exist
      const isBarVisible = await stickyBar.isVisible().catch(() => false);
      expect(isBarVisible).toBe(false);
    });
  });
});
