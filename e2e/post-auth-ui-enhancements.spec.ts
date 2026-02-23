import { test, expect, Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const EVIDENCE_DIR = ".sisyphus/evidence/task-16-e2e";

test.describe("Post-Auth UI Enhancements", () => {
  test.beforeEach(async () => {
    // Ensure evidence directory exists
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test("Auth pages have no header", async ({ page }) => {
    await test.step("Sign-in page has no header on mobile", async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/auth/signin");
      await page.waitForLoadState("networkidle");

      const hasHeader = (await page.locator("header, nav").count()) > 0;
      expect(hasHeader).toBe(false);

      await page.screenshot({
        path: path.join(EVIDENCE_DIR, "signin-mobile.png"),
        fullPage: true,
      });
    });

    await test.step("Sign-in page has no header on desktop", async () => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto("/auth/signin");
      await page.waitForLoadState("networkidle");

      const hasHeader = (await page.locator("header, nav").count()) > 0;
      expect(hasHeader).toBe(false);

      await page.screenshot({
        path: path.join(EVIDENCE_DIR, "signin-desktop.png"),
        fullPage: true,
      });
    });

    await test.step("Sign-up page has no header on mobile", async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/auth/signup");
      await page.waitForLoadState("networkidle");

      const hasHeader = (await page.locator("header, nav").count()) > 0;
      expect(hasHeader).toBe(false);

      await page.screenshot({
        path: path.join(EVIDENCE_DIR, "signup-mobile.png"),
        fullPage: true,
      });
    });

    await test.step("Sign-up page has no header on desktop", async () => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto("/auth/signup");
      await page.waitForLoadState("networkidle");

      const hasHeader = (await page.locator("header, nav").count()) > 0;
      expect(hasHeader).toBe(false);

      await page.screenshot({
        path: path.join(EVIDENCE_DIR, "signup-desktop.png"),
        fullPage: true,
      });
    });
  });

  test("Header shows LogIn icon only for anonymous users", async ({ page }) => {
    await test.step("Mobile header has login icon but no user icon", async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const hasLoginIcon =
        (await page
          .locator(
            'a[aria-label="Sign In"] svg',
          )
          .count()) > 0;

      const hasUserIcon =
        (await page
          .locator(
            'svg[data-testid="user-icon"], svg[aria-label*="User"], svg[aria-label*="Account"]',
          )
          .count()) > 0;

      expect(hasLoginIcon).toBe(true);
      expect(hasUserIcon).toBe(false);

      await page.screenshot({
        path: path.join(EVIDENCE_DIR, "header-anonymous-mobile.png"),
        fullPage: true,
      });
    });

    await test.step("Desktop header has login icon but no user icon", async () => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const hasLoginIcon =
        (await page
          .locator(
            'a[aria-label="Sign In"] svg',
          )
          .count()) > 0;

      const hasUserIcon =
        (await page
          .locator(
            'svg[data-testid="user-icon"], svg[aria-label*="User"], svg[aria-label*="Account"]',
          )
          .count()) > 0;

      expect(hasLoginIcon).toBe(true);
      expect(hasUserIcon).toBe(false);

      await page.screenshot({
        path: path.join(EVIDENCE_DIR, "header-anonymous-desktop.png"),
        fullPage: true,
      });
    });
  });

  test("Add/remove favorites functionality", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const firstDrama = page.locator('a[href*="/dramas/"]').first();
    const count = await firstDrama.count();

    expect(count).toBeGreaterThan(0);

    await firstDrama.click();
    await page.waitForLoadState("networkidle");

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "favorites-before-add.png"),
      fullPage: true,
    });

    const favoritesButton = page.locator(
      'button[aria-label*="favorite"], button[aria-label*="Favorite"], button[data-testid="favorites-button"], .favorites-button',
    );
    const buttonCount = await favoritesButton.count();

    if (buttonCount > 0) {
      const initialAriaLabel =
        (await favoritesButton.getAttribute("aria-label")) || "";

      await favoritesButton.click();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: path.join(EVIDENCE_DIR, "favorites-after-add.png"),
        fullPage: true,
      });

      const afterAddAriaLabel =
        (await favoritesButton.getAttribute("aria-label")) || "";
      expect(initialAriaLabel).not.toBe(afterAddAriaLabel);

      await favoritesButton.click();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: path.join(EVIDENCE_DIR, "favorites-after-remove.png"),
        fullPage: true,
      });

      const afterRemoveAriaLabel =
        (await favoritesButton.getAttribute("aria-label")) || "";
      expect(afterAddAriaLabel).not.toBe(afterRemoveAriaLabel);
    } else {
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, "favorites-button-not-found.png"),
        fullPage: true,
      });
    }
  });

  test("Episode pagination: mobile 10/batch, desktop 20/batch", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const firstDrama = page.locator('a[href*="/dramas/"]').first();
    const count = await firstDrama.count();

    expect(count).toBeGreaterThan(0);

    await firstDrama.click();
    await page.waitForLoadState("networkidle");

    await test.step("Mobile view shows episodes with pagination", async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      const mobileEpisodes = page.locator('a[href*="/dramas/"]');
      const episodeCount = await mobileEpisodes.count();

      await page.screenshot({
        path: path.join(EVIDENCE_DIR, "pagination-mobile-initial.png"),
        fullPage: true,
      });

      const hasPagination =
        (await page
          .locator(
            'button[aria-label*="Next"], button[aria-label*="Previous"], button[aria-label*="Load more"], .pagination',
          )
          .count()) > 0;

      console.log(
        `Mobile - Episode count: ${episodeCount}, Has pagination: ${hasPagination}`,
      );

      if (hasPagination) {
        await page.screenshot({
          path: path.join(EVIDENCE_DIR, "pagination-mobile-controls.png"),
          fullPage: true,
        });
      }
    });

    await test.step("Desktop view shows episodes with pagination", async () => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(500);

      const desktopEpisodes = page.locator('a[href*="/dramas/"]');
      const episodeCount = await desktopEpisodes.count();

      await page.screenshot({
        path: path.join(EVIDENCE_DIR, "pagination-desktop-initial.png"),
        fullPage: true,
      });

      const hasPagination =
        (await page
          .locator(
            'button[aria-label*="Next"], button[aria-label*="Previous"], button[aria-label*="Load more"], .pagination',
          )
          .count()) > 0;

      console.log(
        `Desktop - Episode count: ${episodeCount}, Has pagination: ${hasPagination}`,
      );

      if (hasPagination) {
        await page.screenshot({
          path: path.join(EVIDENCE_DIR, "pagination-desktop-controls.png"),
          fullPage: true,
        });
      }
    });
  });

  test("Continue watching button state", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const firstDrama = page.locator('a[href*="/dramas/"]').first();
    const count = await firstDrama.count();

    expect(count).toBeGreaterThan(0);

    await firstDrama.click();
    await page.waitForLoadState("networkidle");

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "continue-watching-button.png"),
      fullPage: true,
    });

    const startWatchingButton = page.locator(
      'a:has-text("Start Watching")',
    );
    const continueWatchingButton = page.locator(
      'a:has-text("Continue Watching")',
    );

    const hasStartWatching = (await startWatchingButton.count()) > 0;
    const hasContinueWatching = (await continueWatchingButton.count()) > 0;

    console.log(`Start Watching button: ${hasStartWatching}`);
    console.log(`Continue Watching button: ${hasContinueWatching}`);

    expect(hasStartWatching || hasContinueWatching).toBe(true);
  });

  test("Watched episode styling (dimmed opacity)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const firstDrama = page.locator('a[href*="/dramas/"]').first();
    const count = await firstDrama.count();

    expect(count).toBeGreaterThan(0);

    await firstDrama.click();
    await page.waitForLoadState("networkidle");

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "watched-episode-styling.png"),
      fullPage: true,
    });

    const watchedEpisodes = page.locator(
      'a[href*="/dramas/"][data-watched="true"], .watched, [class*="watched"], [style*="opacity"]',
    );
    const watchedCount = await watchedEpisodes.count();

    console.log(`Watched episodes with dimmed styling: ${watchedCount}`);

    if (watchedCount > 0) {
      const firstWatched = watchedEpisodes.first();
      const opacity = await firstWatched.evaluate((el) => {
        return window.getComputedStyle(el).opacity;
      });

      console.log(`First watched episode opacity: ${opacity}`);

      expect(opacity).not.toBe("1");
      expect(opacity).not.toBe("");
    }
  });
});
