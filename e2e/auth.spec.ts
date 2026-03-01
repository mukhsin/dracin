import { test, expect, type Request } from "@playwright/test";
import {
  generateTestUser,
  waitForPageLoad,
  fillForm,
  TEST_TIMEOUTS,
} from "./utils";

type SocialInitCapture = {
  method: string;
  provider: string | null;
  callbackOrRedirect: string | null;
  url: string;
};

async function captureSocialInitRequest(
  request: Request,
): Promise<SocialInitCapture> {
  const requestUrl = new URL(request.url());
  const params = new URLSearchParams(requestUrl.search);
  const contentType = (await request.headerValue("content-type")) || "";
  const postData = request.postData() || "";

  const bodyParams = new URLSearchParams();

  if (postData) {
    if (contentType.includes("application/json")) {
      try {
        const json = JSON.parse(postData) as Record<string, unknown>;
        for (const [key, value] of Object.entries(json)) {
          if (typeof value === "string") {
            bodyParams.set(key, value);
          }
        }
      } catch {}
    }

    if (bodyParams.size === 0) {
      const urlEncoded = new URLSearchParams(postData);
      for (const [key, value] of urlEncoded.entries()) {
        bodyParams.set(key, value);
      }
    }
  }

  const pickValue = (...keys: string[]): string | null => {
    for (const key of keys) {
      const fromUrl = params.get(key);
      if (fromUrl) {
        return fromUrl;
      }

      const fromBody = bodyParams.get(key);
      if (fromBody) {
        return fromBody;
      }
    }

    return null;
  };

  return {
    method: request.method(),
    provider: pickValue("provider"),
    callbackOrRedirect: pickValue(
      "callbackURL",
      "callbackUrl",
      "redirectTo",
      "redirect",
    ),
    url: request.url(),
  };
}

test.describe("Authentication Flows", () => {
  test.describe("Sign Up", () => {
    test("should display sign up form", async ({ page }) => {
      await page.goto("/auth/signup");
      await waitForPageLoad(page);

      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator("#password")).toBeVisible();
      await expect(page.locator("#confirmPassword")).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test("should successfully register a new user", async ({ page }) => {
      const user = generateTestUser();

      await page.goto("/auth/signup");
      await waitForPageLoad(page);

      await fillForm(page, {
        'input[name="name"], input[placeholder*="name" i]': user.name,
        'input[type="email"]': user.email,
        "#password": user.password,
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
      await page.locator("#password").fill("password123");
      await page.locator("#confirmPassword").fill("password123");
      await page.locator('button[type="submit"]').click();

      await page.waitForTimeout(1000);

      const errorVisible = await page
        .locator("text=/invalid|error|required/i")
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

    test("should show validation error for weak password", async ({ page }) => {
      await page.goto("/auth/signup");
      await waitForPageLoad(page);

      const user = generateTestUser();

      await fillForm(page, {
        'input[name="name"], input[placeholder*="name" i]': user.name,
        'input[type="email"]': user.email,
        "#password": "123",
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
        "#password": user.password,
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

    test("Google initiation path from Sign Up includes provider and callback intent", async ({
      page,
    }) => {
      const socialRequestCapture: { value: SocialInitCapture | null } = {
        value: null,
      };

      await page.route("**/api/auth/sign-in/social**", async (route) => {
        socialRequestCapture.value = await captureSocialInitRequest(
          route.request(),
        );
        await route.abort("failed");
      });

      await page.goto("/auth/signup");
      await waitForPageLoad(page);

      await page.getByRole("button", { name: "Continue with Google" }).click();

      await expect.poll(() => socialRequestCapture.value !== null).toBe(true);
      if (!socialRequestCapture.value) {
        throw new Error(
          "Expected Google social initiation request to be captured",
        );
      }

      const parsedSocialRequest = socialRequestCapture.value;
      expect(parsedSocialRequest.provider).toBe("google");
      expect(parsedSocialRequest.callbackOrRedirect).toContain("/dramas");
      expect(parsedSocialRequest.url).toContain("/api/auth/sign-in/social");
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
        "#password": user.password,
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

    test("Google initiation path from Sign In includes provider and callback intent", async ({
      page,
    }) => {
      const socialRequestCapture: { value: SocialInitCapture | null } = {
        value: null,
      };

      await page.route("**/api/auth/sign-in/social**", async (route) => {
        socialRequestCapture.value = await captureSocialInitRequest(
          route.request(),
        );
        await route.abort("failed");
      });

      await page.goto("/auth/signin");
      await waitForPageLoad(page);

      await page.getByRole("button", { name: "Continue with Google" }).click();

      await expect.poll(() => socialRequestCapture.value !== null).toBe(true);
      if (!socialRequestCapture.value) {
        throw new Error(
          "Expected Google social initiation request to be captured",
        );
      }

      const parsedSocialRequest = socialRequestCapture.value;
      expect(parsedSocialRequest.provider).toBe("google");
      expect(parsedSocialRequest.callbackOrRedirect).toContain("/dramas");
      expect(parsedSocialRequest.url).toContain("/api/auth/sign-in/social");
    });

    test("Google initiation preserves redirect parameter in request", async ({
      page,
    }) => {
      const redirectTarget = "/watchlist";
      const socialRequestCapture: { value: SocialInitCapture | null } = {
        value: null,
      };

      await page.route("**/api/auth/sign-in/social**", async (route) => {
        socialRequestCapture.value = await captureSocialInitRequest(
          route.request(),
        );
        await route.abort("failed");
      });

      await page.goto(
        `/auth/signin?redirect=${encodeURIComponent(redirectTarget)}`,
      );
      await waitForPageLoad(page);

      await page.getByRole("button", { name: "Continue with Google" }).click();

      await expect.poll(() => socialRequestCapture.value !== null).toBe(true);
      if (!socialRequestCapture.value) {
        throw new Error(
          "Expected Google social initiation request to be captured",
        );
      }

      const parsedSocialRequest = socialRequestCapture.value;
      expect(parsedSocialRequest.provider).toBe("google");
      expect(parsedSocialRequest.callbackOrRedirect).toContain(redirectTarget);
    });

    test("Google initiation failure shows error and keeps Sign In usable", async ({
      page,
    }) => {
      await page.route("**/api/auth/sign-in/social**", async (route) => {
        await route.abort("failed");
      });

      await page.goto("/auth/signin");
      await waitForPageLoad(page);

      await page.getByRole("button", { name: "Continue with Google" }).click();

      await expect(page.getByRole("alert")).toContainText(
        "Could not start Google sign in. Please try again.",
      );

      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      await emailInput.fill("still-usable@example.com");
      await passwordInput.fill("TestPassword123!");

      await expect(emailInput).toHaveValue("still-usable@example.com");
      await expect(passwordInput).toHaveValue("TestPassword123!");
      await expect(page.locator('button[type="submit"]').first()).toBeEnabled();
      await expect(
        page.getByRole("button", { name: "Continue with Google" }),
      ).toBeEnabled();
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
        "#password": user.password,
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
