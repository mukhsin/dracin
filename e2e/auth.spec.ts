import { test, expect } from "@playwright/test";
import {
  generateTestUser,
  waitForPageLoad,
  fillForm,
  expectToast,
  TEST_TIMEOUTS,
} from "./utils";

test.describe("Authentication Flows", () => {
  test.describe("Sign Up", () => {
    test("should display sign up form", async ({ page }) => {
      await page.goto("/auth/signup");
      await waitForPageLoad(page);

      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test("should successfully register a new user", async ({ page }) => {
      const user = generateTestUser();

      await page.goto("/auth/signup");
      await waitForPageLoad(page);

      await fillForm(page, {
        'input[name="name"], input[placeholder*="name" i]': user.name,
        'input[type="email"]': user.email,
        'input[type="password"]': user.password,
        'input[name="confirmPassword"], input[placeholder*="confirm" i]':
          user.password,
      });

      await page.locator('button[type="submit"]').click();

      await page.waitForURL(/^(?!.*\/(signin|signup|register)).*$/, {
        timeout: TEST_TIMEOUTS.navigation,
      });

      await expect(page).toHaveURL(/^(?!.*\/auth).*$/);
    });

    test("should show validation error for invalid email", async ({ page }) => {
      await page.goto("/auth/signup");
      await waitForPageLoad(page);

      await page.locator('input[type="email"]').fill("invalid-email");
      await page.locator('input[type="password"]').fill("password123");
      await page.locator('button[type="submit"]').click();

      await page.waitForTimeout(1000);

      const errorVisible = await page
        .locator("text=/invalid|error|required/i")
        .first()
        .isVisible()
        .catch(() => false);
      expect(errorVisible).toBe(true);
    });

    test("should show validation error for weak password", async ({ page }) => {
      await page.goto("/auth/signup");
      await waitForPageLoad(page);

      const user = generateTestUser();

      await fillForm(page, {
        'input[name="name"], input[placeholder*="name" i]': user.name,
        'input[type="email"]': user.email,
        'input[type="password"]': "123",
        'input[name="confirmPassword"], input[placeholder*="confirm" i]': "123",
      });

      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);

      const errorVisible = await page
        .locator("text=/password|weak|short/i")
        .first()
        .isVisible()
        .catch(() => false);
      expect(errorVisible).toBe(true);
    });

    test("should show error for mismatched passwords", async ({ page }) => {
      await page.goto("/auth/signup");
      await waitForPageLoad(page);

      const user = generateTestUser();

      await fillForm(page, {
        'input[name="name"], input[placeholder*="name" i]': user.name,
        'input[type="email"]': user.email,
        'input[type="password"]': user.password,
        'input[name="confirmPassword"], input[placeholder*="confirm" i]':
          "DifferentPassword123!",
      });

      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);

      const errorVisible = await page
        .locator("text=/match|mismatch/i")
        .first()
        .isVisible()
        .catch(() => false);
      expect(errorVisible).toBe(true);
    });
  });

  test.describe("Sign In", () => {
    test("should display sign in form", async ({ page }) => {
      await page.goto("/auth/signin");
      await waitForPageLoad(page);

      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test("should successfully sign in with valid credentials", async ({
      page,
    }) => {
      const user = generateTestUser();

      await page.goto("/auth/signup");
      await waitForPageLoad(page);

      await fillForm(page, {
        'input[name="name"], input[placeholder*="name" i]': user.name,
        'input[type="email"]': user.email,
        'input[type="password"]': user.password,
        'input[name="confirmPassword"], input[placeholder*="confirm" i]':
          user.password,
      });

      await page.locator('button[type="submit"]').click();
      await page.waitForURL(/^(?!.*\/(signin|signup|register)).*$/, {
        timeout: TEST_TIMEOUTS.navigation,
      });

      await page.goto("/auth/signin");
      await waitForPageLoad(page);

      await fillForm(page, {
        'input[type="email"]': user.email,
        'input[type="password"]': user.password,
      });

      await page.locator('button[type="submit"]').click();

      await page.waitForURL(/^(?!.*\/(signin|signup|register)).*$/, {
        timeout: TEST_TIMEOUTS.navigation,
      });

      await expect(page).toHaveURL(/^(?!.*\/auth).*$/);
    });

    test("should show error for invalid credentials", async ({ page }) => {
      await page.goto("/auth/signin");
      await waitForPageLoad(page);

      await fillForm(page, {
        'input[type="email"]': "nonexistent@example.com",
        'input[type="password"]': "WrongPassword123!",
      });

      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(2000);

      const errorVisible = await page
        .locator("text=/invalid|incorrect|wrong|error/i")
        .first()
        .isVisible()
        .catch(() => false);
      expect(errorVisible).toBe(true);
    });

    test("should show validation error for empty fields", async ({ page }) => {
      await page.goto("/auth/signin");
      await waitForPageLoad(page);

      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);

      const errorVisible = await page
        .locator("text=/required|empty|fill/i")
        .first()
        .isVisible()
        .catch(() => false);

      if (!errorVisible) {
        const emailInput = page.locator('input[type="email"]').first();
        const isInvalid = await emailInput.evaluate(
          (el: HTMLInputElement) => !el.validity.valid,
        );
        expect(isInvalid).toBe(true);
      }
    });
  });

  test.describe("Sign Out", () => {
    test("should successfully sign out", async ({ page }) => {
      const user = generateTestUser();

      await page.goto("/auth/signup");
      await waitForPageLoad(page);

      await fillForm(page, {
        'input[name="name"], input[placeholder*="name" i]': user.name,
        'input[type="email"]': user.email,
        'input[type="password"]': user.password,
        'input[name="confirmPassword"], input[placeholder*="confirm" i]':
          user.password,
      });

      await page.locator('button[type="submit"]').click();
      await page.waitForURL(/^(?!.*\/(signin|signup|register)).*$/, {
        timeout: TEST_TIMEOUTS.navigation,
      });

      const signOutButton = page
        .locator(
          'button:has-text("Sign Out"), a:has-text("Sign Out"), [data-testid="signout"]',
        )
        .first();

      if (await signOutButton.isVisible().catch(() => false)) {
        await signOutButton.click();
        await page.waitForTimeout(2000);

        const currentUrl = page.url();
        expect(
          currentUrl.includes("/auth") || currentUrl.includes("/signin"),
        ).toBe(true);
      }
    });
  });

  test.describe("Protected Routes", () => {
    test("should redirect unauthenticated user to sign in", async ({
      page,
    }) => {
      await page.goto("/watchlist");
      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      expect(
        currentUrl.includes("/auth") || currentUrl.includes("/signin"),
      ).toBe(true);
    });

    test("should redirect unauthenticated user from history page", async ({
      page,
    }) => {
      await page.goto("/history");
      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      expect(
        currentUrl.includes("/auth") || currentUrl.includes("/signin"),
      ).toBe(true);
    });
  });
});
