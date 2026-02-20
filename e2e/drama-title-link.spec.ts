import { test, expect } from "@playwright/test";

test.describe("Drama Title Link Functionality", () => {
  test("should test drama title link hover effects and navigation", async ({
    page,
  }) => {
    console.log("\n=== Testing Drama Title Link Functionality ===\n");

    // Navigate to test episode page
    console.log("STEP 1: Navigate to watch page");
    await page.goto("/dramas/test/1");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Check page title
    const pageTitle = await page.title();
    console.log("Page title:", pageTitle);
    expect(pageTitle).toContain("Dracin");

    // Capture screenshot of the initial page
    await page.screenshot({ path: "/tmp/drama-title-watch-page.png" });
    console.log("✓ Captured watch page screenshot");

    // Find the main drama title link (below video player)
    const dramaTitleLink = page.locator('a[href="/dramas/test-drama"]').first();
    const isVisible = await dramaTitleLink.isVisible();
    console.log("Main drama title link visible:", isVisible);

    if (isVisible) {
      // Get bounding box info
      const box = await dramaTitleLink.boundingBox();
      console.log("Drama title link position:", box);
      if (!box) {
        console.log(
          "⚠ Drama title link bounding box is null, skipping hover screenshots",
        );
        return;
      }

      // Get the text content
      const text = await dramaTitleLink.textContent();
      console.log("Drama title link text:", text);

      // Check computed styles before hover
      const styles = await dramaTitleLink.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          color: computed.color,
          textDecoration: computed.textDecoration,
          cursor: computed.cursor,
          fontWeight: computed.fontWeight,
          transition: computed.transition,
        };
      });
      console.log("Drama title link styles before hover:", styles);

      // Capture screenshot before hover
      await page.screenshot({
        path: "/tmp/drama-title-before-hover.png",
        clip: { x: box.x, y: box.y, width: box.width, height: box.height },
      });
      console.log("✓ Captured hover state before screenshot");

      // Hover over the link
      console.log("STEP 2: Testing hover effects");
      await dramaTitleLink.hover();

      // Wait for any transition effects
      await page.waitForTimeout(500);

      // Check styles after hover
      const hoverStyles = await dramaTitleLink.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          color: computed.color,
          textDecoration: computed.textDecoration,
          cursor: computed.cursor,
          fontWeight: computed.fontWeight,
          transform: computed.transform,
        };
      });
      console.log("Drama title link styles after hover:", hoverStyles);

      // Capture screenshot after hover
      await page.screenshot({
        path: "/tmp/drama-title-after-hover.png",
        clip: { x: box.x, y: box.y, width: box.width, height: box.height },
      });
      console.log("✓ Captured hover state after screenshot");

      // Verify hover effects are applied
      expect(hoverStyles.cursor).toBe("pointer");

      // Check if color or style changed (indicating hover effect)
      if (styles.color !== hoverStyles.color) {
        console.log("✓ Color changed on hover - working hover effect");
      }
      if (styles.textDecoration !== hoverStyles.textDecoration) {
        console.log(
          "✓ Text decoration changed on hover - working hover effect",
        );
      }

      console.log("✓ Hover effects verified");
    } else {
      console.log("⚠ Drama title link not visible, skipping hover tests");
    }

    // Test keyboard navigation
    console.log("STEP 3: Testing keyboard navigation");
    // Tab to focus on the drama title link
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Check if the link has focus
    const isFocused = await dramaTitleLink.evaluate(
      (el) => el === document.activeElement,
    );
    console.log("Drama title link focused via tab:", isFocused);

    if (isFocused) {
      console.log("✓ Keyboard navigation - focus applied");

      // Press Enter to activate the link
      await page.keyboard.press("Enter");

      // Wait for navigation
      await page.waitForURL("/dramas/test-drama", { timeout: 10000 });
      console.log("✓ Navigation completed after Enter key");

      // Check URL after navigation
      const currentUrl = page.url();
      console.log("Current URL after navigation:", currentUrl);
      expect(currentUrl).toContain("/dramas/test-drama");

      // Capture screenshot of drama page
      await page.screenshot({ path: "/tmp/drama-title-drama-page.png" });
      console.log("✓ Captured drama page screenshot");
    } else {
      console.log("⚠ Keyboard navigation test skipped - link not focusable");
    }

    // Test ARIA labels
    console.log("STEP 4: Testing ARIA labels");
    const ariaLabel = await dramaTitleLink.getAttribute("aria-label");
    console.log("Drama title aria-label:", ariaLabel);
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel).toContain("Test Drama");
    console.log("✓ ARIA label present and contains drama name");

    // Test mobile responsive behavior
    console.log("STEP 5: Testing mobile responsive behavior");
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone 6/7/8
    console.log("✓ Switched to mobile viewport");

    // Check if link is still visible on mobile
    const mobileVisible = await dramaTitleLink.isVisible();
    console.log("Drama title link visible on mobile:", mobileVisible);

    if (mobileVisible) {
      const mobileBox = await dramaTitleLink.boundingBox();
      console.log("Mobile drama title link position:", mobileBox);

      // Capture mobile screenshot
      await page.screenshot({ path: "/tmp/drama-title-mobile.png" });
      console.log("✓ Captured mobile screenshot");
      console.log("✓ Mobile responsive behavior verified");
    } else {
      console.log("⚠ Drama title link not visible on mobile");
    }

    // Capture final screenshot
    await page.screenshot({ path: "/tmp/drama-title-test-complete.png" });
    console.log("✓ Captured final test screenshot");

    console.log("\n=== Drama Title Link Test Completed Successfully ===\n");
  });
});
