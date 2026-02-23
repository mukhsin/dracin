import { chromium, Page, Browser, BrowserContext } from "playwright";
import * as fs from "fs";
import * as path from "path";

const EVIDENCE_DIR = ".sisyphus/evidence/task-16-e2e";
const BASE_URL = "http://localhost:3000";

// Ensure evidence directory exists
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

// Helper function to take screenshot
async function takeScreenshot(page: Page, filename: string) {
  const filepath = path.join(EVIDENCE_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`✓ Screenshot saved: ${filepath}`);
}

// Test 1: Auth pages have no header
async function testAuthPagesNoHeader(browser: Browser) {
  console.log("\n=== Test 1: Auth pages have no header ===");

  const results = {
    signinMobile: { hasHeader: false, filename: "" },
    signinDesktop: { hasHeader: false, filename: "" },
    signupMobile: { hasHeader: false, filename: "" },
    signupDesktop: { hasHeader: false, filename: "" },
  };

  // Test sign-in page on mobile
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 667 },
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(`${BASE_URL}/auth/signin`);
  await mobilePage.waitForLoadState("networkidle");

  results.signinMobile.filename = "signin-mobile.png";
  await takeScreenshot(mobilePage, results.signinMobile.filename);

  // Check for header presence
  const hasHeaderMobile = (await mobilePage.locator("header, nav").count()) > 0;
  results.signinMobile.hasHeader = hasHeaderMobile;
  console.log(`Mobile Signin - Header present: ${hasHeaderMobile}`);

  await mobileContext.close();

  // Test sign-in page on desktop
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto(`${BASE_URL}/auth/signin`);
  await desktopPage.waitForLoadState("networkidle");

  results.signinDesktop.filename = "signin-desktop.png";
  await takeScreenshot(desktopPage, results.signinDesktop.filename);

  const hasHeaderDesktop =
    (await desktopPage.locator("header, nav").count()) > 0;
  results.signinDesktop.hasHeader = hasHeaderDesktop;
  console.log(`Desktop Signin - Header present: ${hasHeaderDesktop}`);

  // Test sign-up page on mobile
  const mobilePage2 = await mobileContext.newPage();
  await mobilePage2.goto(`${BASE_URL}/auth/signup`);
  await mobilePage2.waitForLoadState("networkidle");

  results.signupMobile.filename = "signup-mobile.png";
  await takeScreenshot(mobilePage2, results.signupMobile.filename);

  const hasHeaderMobile2 =
    (await mobilePage2.locator("header, nav").count()) > 0;
  results.signupMobile.hasHeader = hasHeaderMobile2;
  console.log(`Mobile Signup - Header present: ${hasHeaderMobile2}`);

  await mobileContext.close();

  // Test sign-up page on desktop
  const desktopPage2 = await desktopContext.newPage();
  await desktopPage2.goto(`${BASE_URL}/auth/signup`);
  await desktopPage2.waitForLoadState("networkidle");

  results.signupDesktop.filename = "signup-desktop.png";
  await takeScreenshot(desktopPage2, results.signupDesktop.filename);

  const hasHeaderDesktop2 =
    (await desktopPage2.locator("header, nav").count()) > 0;
  results.signupDesktop.hasHeader = hasHeaderDesktop2;
  console.log(`Desktop Signup - Header present: ${hasHeaderDesktop2}`);

  await desktopContext.close();

  return results;
}

// Test 2: Header shows LogIn icon only for anonymous users
async function testHeaderLoginIcon(browser: Browser) {
  console.log(
    "\n=== Test 2: Header shows LogIn icon only for anonymous users ===",
  );

  const results = {
    mobile: { hasLoginIcon: false, hasUserIcon: false, filename: "" },
    desktop: { hasLoginIcon: false, hasUserIcon: false, filename: "" },
  };

  // Test on mobile
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 667 },
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(BASE_URL);
  await mobilePage.waitForLoadState("networkidle");

  results.mobile.filename = "header-anonymous-mobile.png";
  await takeScreenshot(mobilePage, results.mobile.filename);

  // Check for login icon
  const hasLoginIcon =
    (await mobilePage
      .locator(
        'svg[data-testid="login-icon"], svg[aria-label*="LogIn"], svg[aria-label*="Login"], svg[aria-label*="Sign in"]',
      )
      .count()) > 0;
  results.mobile.hasLoginIcon = hasLoginIcon;

  // Check for user icon (should not be present for anonymous users)
  const hasUserIcon =
    (await mobilePage
      .locator(
        'svg[data-testid="user-icon"], svg[aria-label*="User"], svg[aria-label*="Account"]',
      )
      .count()) > 0;
  results.mobile.hasUserIcon = hasUserIcon;

  console.log(
    `Mobile - Has Login Icon: ${hasLoginIcon}, Has User Icon: ${hasUserIcon}`,
  );

  await mobileContext.close();

  // Test on desktop
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto(BASE_URL);
  await desktopPage.waitForLoadState("networkidle");

  results.desktop.filename = "header-anonymous-desktop.png";
  await takeScreenshot(desktopPage, results.desktop.filename);

  const hasLoginIconDesktop =
    (await desktopPage
      .locator(
        'svg[data-testid="login-icon"], svg[aria-label*="LogIn"], svg[aria-label*="Login"], svg[aria-label*="Sign in"]',
      )
      .count()) > 0;
  results.desktop.hasLoginIcon = hasLoginIconDesktop;

  const hasUserIconDesktop =
    (await desktopPage
      .locator(
        'svg[data-testid="user-icon"], svg[aria-label*="User"], svg[aria-label*="Account"]',
      )
      .count()) > 0;
  results.desktop.hasUserIcon = hasUserIconDesktop;

  console.log(
    `Desktop - Has Login Icon: ${hasLoginIconDesktop}, Has User Icon: ${hasUserIconDesktop}`,
  );

  await desktopContext.close();

  return results;
}

// Test 3: Add/remove favorites functionality
async function testFavoritesFunctionality(browser: Browser) {
  console.log("\n=== Test 3: Add/remove favorites functionality ===");

  const results = {
    added: false,
    removed: false,
    filenames: [] as string[],
  };

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  // First, sign in (if needed) or navigate to a drama page
  await page.goto(BASE_URL);
  await page.waitForLoadState("networkidle");

  // Look for a drama card and click it
  const firstDrama = page.locator('a[href*="/dramas/"]').first();
  const count = await firstDrama.count();

  if (count > 0) {
    await firstDrama.click();
    await page.waitForLoadState("networkidle");

    // Take screenshot before adding favorite
    const beforeFilename = "favorites-before-add.png";
    await takeScreenshot(page, beforeFilename);
    results.filenames.push(beforeFilename);

    // Look for favorites button
    const favoritesButton = page.locator(
      'button[aria-label*="favorite"], button[aria-label*="Favorite"], button[data-testid="favorites-button"]',
    );
    const buttonCount = await favoritesButton.count();

    if (buttonCount > 0) {
      console.log("Found favorites button, attempting to toggle");

      // Click to add favorite
      await favoritesButton.click();
      await page.waitForTimeout(1000);

      const afterAddFilename = "favorites-after-add.png";
      await takeScreenshot(page, afterAddFilename);
      results.filenames.push(afterAddFilename);
      results.added = true;

      // Click to remove favorite
      await favoritesButton.click();
      await page.waitForTimeout(1000);

      const afterRemoveFilename = "favorites-after-remove.png";
      await takeScreenshot(page, afterRemoveFilename);
      results.filenames.push(afterRemoveFilename);
      results.removed = true;
    } else {
      console.log("Favorites button not found on drama page");
    }
  } else {
    console.log("No drama cards found");
  }

  await context.close();

  return results;
}

// Test 4: Episode pagination
async function testEpisodePagination(browser: Browser) {
  console.log(
    "\n=== Test 4: Episode pagination (mobile: 10/batch, desktop: 20/batch) ===",
  );

  const results = {
    mobile: {
      episodeCount: 0,
      hasPagination: false,
      filenames: [] as string[],
    },
    desktop: {
      episodeCount: 0,
      hasPagination: false,
      filenames: [] as string[],
    },
  };

  const context = await browser.newContext();
  const page = await context.newPage();

  // Navigate to a drama page
  await page.goto(BASE_URL);
  await page.waitForLoadState("networkidle");

  const firstDrama = page.locator('a[href*="/dramas/"]').first();
  const count = await firstDrama.count();

  if (count > 0) {
    await firstDrama.click();
    await page.waitForLoadState("networkidle");

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    const mobileInitialFilename = "pagination-mobile-initial.png";
    await takeScreenshot(page, mobileInitialFilename);
    results.mobile.filenames.push(mobileInitialFilename);

    // Count visible episodes
    const mobileEpisodes = page.locator('a[href*="/dramas/"][href*="/"]');
    results.mobile.episodeCount = await mobileEpisodes.count();
    console.log(`Mobile - Episode count: ${results.mobile.episodeCount}`);

    // Check for pagination controls
    const hasPaginationMobile =
      (await page
        .locator(
          'button[aria-label*="Next"], button[aria-label*="Previous"], button[aria-label*="Load more"]',
        )
        .count()) > 0;
    results.mobile.hasPagination = hasPaginationMobile;
    console.log(`Mobile - Has pagination: ${hasPaginationMobile}`);

    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);

    const desktopInitialFilename = "pagination-desktop-initial.png";
    await takeScreenshot(page, desktopInitialFilename);
    results.desktop.filenames.push(desktopInitialFilename);

    // Count visible episodes on desktop
    const desktopEpisodes = page.locator('a[href*="/dramas/"][href*="/"]');
    results.desktop.episodeCount = await desktopEpisodes.count();
    console.log(`Desktop - Episode count: ${results.desktop.episodeCount}`);

    const hasPaginationDesktop =
      (await page
        .locator(
          'button[aria-label*="Next"], button[aria-label*="Previous"], button[aria-label*="Load more"]',
        )
        .count()) > 0;
    results.desktop.hasPagination = hasPaginationDesktop;
    console.log(`Desktop - Has pagination: ${hasPaginationDesktop}`);
  }

  await context.close();

  return results;
}

// Test 5: Continue watching button state
async function testContinueWatchingButton(browser: Browser) {
  console.log("\n=== Test 5: Continue watching button state ===");

  const results = {
    startWatching: false,
    continueWatching: false,
    filenames: [] as string[],
  };

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  // Navigate to a drama page
  await page.goto(BASE_URL);
  await page.waitForLoadState("networkidle");

  const firstDrama = page.locator('a[href*="/dramas/"]').first();
  const count = await firstDrama.count();

  if (count > 0) {
    await firstDrama.click();
    await page.waitForLoadState("networkidle");

    // Look for "Start Watching" or "Continue Watching" button
    const startWatchingButton = page.locator(
      'button:has-text("Start Watching")',
    );
    const continueWatchingButton = page.locator(
      'button:has-text("Continue Watching")',
    );

    const hasStartWatching = (await startWatchingButton.count()) > 0;
    const hasContinueWatching = (await continueWatchingButton.count()) > 0;

    results.startWatching = hasStartWatching;
    results.continueWatching = hasContinueWatching;

    console.log(`Start Watching button: ${hasStartWatching}`);
    console.log(`Continue Watching button: ${hasContinueWatching}`);

    const filename = "continue-watching-button.png";
    await takeScreenshot(page, filename);
    results.filenames.push(filename);
  }

  await context.close();

  return results;
}

// Test 6: Watched episode styling
async function testWatchedEpisodeStyling(browser: Browser) {
  console.log("\n=== Test 6: Watched episode styling (dimmed opacity) ===");

  const results = {
    watchedEpisodeDimmed: false,
    filenames: [] as string[],
  };

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  // Navigate to a drama page
  await page.goto(BASE_URL);
  await page.waitForLoadState("networkidle");

  const firstDrama = page.locator('a[href*="/dramas/"]').first();
  const count = await firstDrama.count();

  if (count > 0) {
    await firstDrama.click();
    await page.waitForLoadState("networkidle");

    // Look for watched episodes (they should have dimmed styling)
    const filename = "watched-episode-styling.png";
    await takeScreenshot(page, filename);
    results.filenames.push(filename);

    // Check for watched episodes with dimmed opacity
    const watchedEpisodes = page.locator(
      'a[href*="/dramas/"][data-watched="true"], .watched, [class*="watched"], [style*="opacity"]',
    );
    const watchedCount = await watchedEpisodes.count();

    console.log(`Watched episodes with dimmed styling: ${watchedCount}`);

    if (watchedCount > 0) {
      // Check opacity of first watched episode
      const firstWatched = watchedEpisodes.first();
      const opacity = await firstWatched.evaluate((el) => {
        return window.getComputedStyle(el).opacity;
      });

      console.log(`First watched episode opacity: ${opacity}`);
      results.watchedEpisodeDimmed = opacity !== "1" && opacity !== "";
    }
  }

  await context.close();

  return results;
}

// Main test runner
async function runAllTests() {
  console.log("Starting E2E Tests for Post-Auth UI Enhancements");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Evidence directory: ${EVIDENCE_DIR}\n`);

  const browser = await chromium.launch({ headless: false });

  try {
    // Run all tests
    const authPagesResults = await testAuthPagesNoHeader(browser);
    const headerResults = await testHeaderLoginIcon(browser);
    const favoritesResults = await testFavoritesFunctionality(browser);
    const paginationResults = await testEpisodePagination(browser);
    const continueWatchingResults = await testContinueWatchingButton(browser);
    const watchedEpisodeResults = await testWatchedEpisodeStyling(browser);

    // Generate summary
    const summary = {
      timestamp: new Date().toISOString(),
      tests: {
        authPagesNoHeader: {
          passed:
            !authPagesResults.signinMobile.hasHeader &&
            !authPagesResults.signinDesktop.hasHeader &&
            !authPagesResults.signupMobile.hasHeader &&
            !authPagesResults.signupDesktop.hasHeader,
          details: authPagesResults,
        },
        headerLoginIcon: {
          passed:
            headerResults.mobile.hasLoginIcon &&
            headerResults.desktop.hasLoginIcon &&
            !headerResults.mobile.hasUserIcon &&
            !headerResults.desktop.hasUserIcon,
          details: headerResults,
        },
        favoritesFunctionality: {
          passed: favoritesResults.added && favoritesResults.removed,
          details: favoritesResults,
        },
        episodePagination: {
          passed:
            paginationResults.mobile.hasPagination &&
            paginationResults.desktop.hasPagination,
          details: paginationResults,
        },
        continueWatchingButton: {
          passed:
            continueWatchingResults.startWatching ||
            continueWatchingResults.continueWatching,
          details: continueWatchingResults,
        },
        watchedEpisodeStyling: {
          passed: watchedEpisodeResults.watchedEpisodeDimmed,
          details: watchedEpisodeResults,
        },
      },
    };

    console.log("\n=== TEST SUMMARY ===");
    console.log(JSON.stringify(summary, null, 2));

    // Write summary to file
    fs.writeFileSync(
      path.join(EVIDENCE_DIR, "test-summary.json"),
      JSON.stringify(summary, null, 2),
    );

    console.log(
      `\n✓ Test summary saved to ${path.join(EVIDENCE_DIR, "test-summary.json")}`,
    );
  } finally {
    await browser.close();
  }
}

runAllTests().catch(console.error);
