import { test as base, expect, Page, BrowserContext } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  password: "TestPassword123!",
  name: "Test User",
};

export type TestFixtures = {
  authenticatedPage: Page;
  testUser: typeof TEST_USER;
};

export const test = base.extend<TestFixtures>({
  testUser: async ({}, use) => {
    await use(TEST_USER);
  },

  authenticatedPage: async ({ browser, testUser }, use) => {
    const context = await browser.newContext({
      storageState: undefined,
    });
    const page = await context.newPage();

    await page.goto("/auth/signin");
    await page.waitForLoadState("networkidle");

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    const hasEmailInput = await emailInput.isVisible().catch(() => false);
    const hasPasswordInput = await passwordInput.isVisible().catch(() => false);

    if (!hasEmailInput || !hasPasswordInput) {
      const signUpLink = page
        .locator('a[href*="signup"], a[href*="register"]')
        .first();
      if (await signUpLink.isVisible().catch(() => false)) {
        await signUpLink.click();
        await page.waitForLoadState("networkidle");
      }

      const nameInput = page
        .locator('input[name="name"], input[placeholder*="name" i]')
        .first();
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill(testUser.name);
      }

      await page.locator('input[type="email"]').first().fill(testUser.email);
      await page
        .locator('input[type="password"]')
        .first()
        .fill(testUser.password);

      const confirmPassword = page
        .locator(
          'input[name="confirmPassword"], input[placeholder*="confirm" i]',
        )
        .first();
      if (await confirmPassword.isVisible().catch(() => false)) {
        await confirmPassword.fill(testUser.password);
      }

      await page.locator('button[type="submit"]').first().click();
    } else {
      await emailInput.fill(testUser.email);
      await passwordInput.fill(testUser.password);
      await submitButton.click();
    }

    await page.waitForURL(/^(?!.*\/(signin|signup|register)).*$/, {
      timeout: 10000,
    });
    await page.waitForLoadState("networkidle");

    await use(page);
    await context.close();
  },
});

export async function createAuthenticatedContext(
  browser: BrowserContext["browser"],
  email: string,
  password: string,
): Promise<BrowserContext> {
  if (!browser) {
    throw new Error("Browser instance is required");
  }

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("/auth/signin");
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator('input[type="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  const submitButton = page.locator('button[type="submit"]').first();

  const hasEmailInput = await emailInput.isVisible().catch(() => false);
  const hasPasswordInput = await passwordInput.isVisible().catch(() => false);

  if (!hasEmailInput || !hasPasswordInput) {
    const signUpLink = page
      .locator('a[href*="signup"], a[href*="register"]')
      .first();
    if (await signUpLink.isVisible().catch(() => false)) {
      await signUpLink.click();
      await page.waitForLoadState("networkidle");
    }

    const nameInput = page
      .locator('input[name="name"], input[placeholder*="name" i]')
      .first();
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill("Test User");
    }

    await page.locator('input[type="email"]').first().fill(email);
    await page.locator('input[type="password"]').first().fill(password);

    const confirmPassword = page
      .locator('input[name="confirmPassword"], input[placeholder*="confirm" i]')
      .first();
    if (await confirmPassword.isVisible().catch(() => false)) {
      await confirmPassword.fill(password);
    }

    await page.locator('button[type="submit"]').first().click();
  } else {
    await emailInput.fill(email);
    await passwordInput.fill(password);
    await submitButton.click();
  }

  await page.waitForURL(/^(?!.*\/(signin|signup|register)).*$/, {
    timeout: 10000,
  });
  await page.waitForLoadState("networkidle");

  const storageState = await context.storageState();
  await page.close();
  await context.close();

  const newContext = await browser.newContext({ storageState });
  return newContext;
}

export async function cleanupTestUser(
  apiUrl: string,
  email: string,
): Promise<void> {
  try {
    const response = await fetch(`${apiUrl}/api/test/cleanup-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      console.warn(`Failed to cleanup test user: ${response.statusText}`);
    }
  } catch (error) {
    console.warn("Error cleaning up test user:", error);
  }
}

export { expect };
