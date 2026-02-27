import { Page, Locator, expect } from "@playwright/test";

export const TEST_TIMEOUTS = {
  navigation: 30000,
  videoLoad: 60000,
  apiResponse: 10000,
  animation: 5000,
  elementVisible: 5000,
};

export const SELECTORS = {
  header: 'header, [role="banner"]',
  nav: 'nav, [role="navigation"]',
  main: 'main, [role="main"]',
  footer: 'footer, [role="contentinfo"]',
  searchInput: 'input[type="search"], input[placeholder*="search" i]',
  dramaCard: '[data-testid="drama-card"], .drama-card, [class*="drama-card"]',
  dramaTitle: '[data-testid="drama-title"], h3, h2',
  watchlistButton:
    '[data-testid="watchlist-button"], button[aria-label*="watchlist" i]',
  playerContainer:
    '[data-testid="video-player"], video, [class*="video-player"]',
  playButton: 'button[aria-label*="play" i], [data-testid="play-button"]',
  pauseButton: 'button[aria-label*="pause" i], [data-testid="pause-button"]',
  progressBar:
    '[role="slider"], input[type="range"], [data-testid="progress-bar"]',
  volumeControl:
    'button[aria-label*="volume" i], [data-testid="volume-control"]',
  fullscreenButton:
    'button[aria-label*="fullscreen" i], [data-testid="fullscreen"]',
  qualitySelector:
    'button[aria-label*="quality" i], [data-testid="quality-selector"]',
  episodeList: '[data-testid="episode-list"], [class*="episode-list"]',
  episodeItem: '[data-testid="episode-item"], [class*="episode-item"]',
};

export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle", {
    timeout: TEST_TIMEOUTS.navigation,
  });
  await page.waitForLoadState("domcontentloaded", {
    timeout: TEST_TIMEOUTS.navigation,
  });
}

export async function waitForVideoReady(
  page: Page,
  timeout: number = TEST_TIMEOUTS.videoLoad,
): Promise<void> {
  const video = page.locator("video").first();

  await video.waitFor({ state: "visible", timeout });

  await video.evaluate((el: HTMLVideoElement) => {
    return new Promise<void>((resolve, reject) => {
      if (el.readyState >= 3) {
        resolve();
        return;
      }

      const onCanPlay = () => {
        el.removeEventListener("canplay", onCanPlay);
        el.removeEventListener("error", onError);
        resolve();
      };

      const onError = () => {
        el.removeEventListener("canplay", onCanPlay);
        el.removeEventListener("error", onError);
        reject(new Error("Video failed to load"));
      };

      el.addEventListener("canplay", onCanPlay);
      el.addEventListener("error", onError);

      setTimeout(() => {
        el.removeEventListener("canplay", onCanPlay);
        el.removeEventListener("error", onError);
        reject(new Error("Video load timeout"));
      }, timeout);
    });
  });
}

export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeout: number = TEST_TIMEOUTS.apiResponse,
): Promise<void> {
  await page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === "string") {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout },
  );
}

export async function clickAndWait(
  page: Page,
  locator: Locator | string,
  waitForNavigation: boolean = true,
): Promise<void> {
  const target =
    typeof locator === "string" ? page.locator(locator).first() : locator;

  if (waitForNavigation) {
    await Promise.all([
      page.waitForNavigation({
        waitUntil: "networkidle",
        timeout: TEST_TIMEOUTS.navigation,
      }),
      target.click(),
    ]);
  } else {
    await target.click();
    await page.waitForTimeout(500);
  }
}

export async function fillForm(
  page: Page,
  fields: Record<string, string>,
): Promise<void> {
  for (const [selector, value] of Object.entries(fields)) {
    const input = page.locator(selector).first();
    await input.waitFor({
      state: "visible",
      timeout: TEST_TIMEOUTS.elementVisible,
    });
    await input.fill(value);
  }
}

export async function expectToast(
  page: Page,
  messagePattern: string | RegExp,
  timeout: number = TEST_TIMEOUTS.elementVisible,
): Promise<void> {
  const toastSelectors = [
    '[role="alert"]',
    '[data-testid="toast"]',
    ".toast",
    '[class*="toast"]',
    '[class*="notification"]',
  ];

  for (const selector of toastSelectors) {
    const toast = page.locator(selector).first();
    try {
      await toast.waitFor({ state: "visible", timeout: 2000 });
      const text = await toast.textContent();
      if (text) {
        if (typeof messagePattern === "string") {
          expect(text.toLowerCase()).toContain(messagePattern.toLowerCase());
        } else {
          expect(text).toMatch(messagePattern);
        }
        return;
      }
    } catch {
      continue;
    }
  }

  throw new Error(`Toast with message matching "${messagePattern}" not found`);
}

export async function scrollToBottom(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForTimeout(500);
}

export async function scrollToElement(
  page: Page,
  locator: Locator | string,
): Promise<void> {
  const element =
    typeof locator === "string" ? page.locator(locator).first() : locator;
  await element.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
}

export async function getDramaCards(page: Page): Promise<Locator> {
  return page.locator(SELECTORS.dramaCard);
}

export async function clickDramaCard(
  page: Page,
  index: number = 0,
): Promise<void> {
  const cards = page.locator(SELECTORS.dramaCard);
  const card = cards.nth(index);
  await card.waitFor({
    state: "visible",
    timeout: TEST_TIMEOUTS.elementVisible,
  });
  await clickAndWait(page, card);
}

export async function searchForDrama(page: Page, query: string): Promise<void> {
  const searchInput = page.locator(SELECTORS.searchInput).first();
  await searchInput.waitFor({
    state: "visible",
    timeout: TEST_TIMEOUTS.elementVisible,
  });
  await searchInput.fill(query);
  await searchInput.press("Enter");
  await waitForApiResponse(page, "/api/dramas");
  await page.waitForTimeout(1000);
}

export async function toggleWatchlist(
  page: Page,
  expectAdded: boolean = true,
): Promise<void> {
  const button = page.locator(SELECTORS.watchlistButton).first();
  await button.waitFor({
    state: "visible",
    timeout: TEST_TIMEOUTS.elementVisible,
  });

  const initialText = (await button.textContent()) || "";
  await button.click();

  await page.waitForTimeout(1000);

  const newText = (await button.textContent()) || "";
  if (expectAdded) {
    expect(newText.toLowerCase()).not.toBe(initialText.toLowerCase());
  }
}

export async function playVideo(page: Page): Promise<void> {
  const video = page.locator("video").first();
  const playButton = page.locator('button[aria-label="Play"]').first();

  const isPlaying = await video.evaluate((el: HTMLVideoElement) => !el.paused);

  if (!isPlaying) {
    if (await playButton.isVisible().catch(() => false)) {
      await playButton.click();
    } else {
      await video.click();
    }
    await page.waitForTimeout(500);
  }
}

export async function pauseVideo(page: Page): Promise<void> {
  const video = page.locator("video").first();
  const isPlaying = await video.evaluate((el: HTMLVideoElement) => !el.paused);

  if (isPlaying) {
    await video.click();
    await page.waitForTimeout(500);
  }
}

export async function seekVideo(page: Page, percentage: number): Promise<void> {
  const video = page.locator("video").first();
  const progressBar = page.locator(SELECTORS.progressBar).first();

  const duration = await video.evaluate((el: HTMLVideoElement) => el.duration);
  const targetTime = duration * (percentage / 100);

  const box = await progressBar.boundingBox();
  if (box) {
    const x = box.x + box.width * (percentage / 100);
    const y = box.y + box.height / 2;
    await page.mouse.click(x, y);
  } else {
    await video.evaluate((el: HTMLVideoElement, time: number) => {
      el.currentTime = time;
    }, targetTime);
  }

  await page.waitForTimeout(500);
}

export function generateTestUser(): {
  email: string;
  password: string;
  name: string;
} {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return {
    email: `test-${timestamp}-${random}@example.com`,
    password: "TestPassword123!",
    name: `Test User ${random}`,
  };
}

export async function clearInput(page: Page, selector: string): Promise<void> {
  const input = page.locator(selector).first();
  await input.fill("");
  await input.clear();
}

export async function waitForElementToBeVisible(
  page: Page,
  selector: string,
  timeout: number = TEST_TIMEOUTS.elementVisible,
): Promise<Locator> {
  const element = page.locator(selector).first();
  await element.waitFor({ state: "visible", timeout });
  return element;
}

export async function waitForElementToDisappear(
  page: Page,
  selector: string,
  timeout: number = TEST_TIMEOUTS.elementVisible,
): Promise<void> {
  const element = page.locator(selector).first();
  await element.waitFor({ state: "hidden", timeout });
}
