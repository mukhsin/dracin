const DEFAULT_TIMEOUT_MS = 5000;

export async function validateVideoUrl(url: string): Promise<boolean> {
  if (!url || url.trim() === "") {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "manual",
    });

    clearTimeout(timeoutId);

    return response.ok || (response.status >= 300 && response.status < 400);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.log(`[URLValidator] Timeout validating URL: ${url}`);
    }
    return false;
  }
}

export function getHighestQualityUrl(
  videoUrls:
    | Partial<
        Record<"240p" | "360p" | "480p" | "720p" | "1080p" | "4k", string>
      >
    | null
    | undefined,
): string | null {
  if (!videoUrls) return null;

  const qualityPriority: Array<
    "1080p" | "720p" | "480p" | "360p" | "240p" | "4k"
  > = ["1080p", "720p", "480p", "360p", "240p", "4k"];

  for (const quality of qualityPriority) {
    const url = videoUrls[quality];
    if (url && url.trim() !== "") {
      return url;
    }
  }

  return null;
}

export function hasAnyVideoUrl(
  videoUrls:
    | Partial<
        Record<"240p" | "360p" | "480p" | "720p" | "1080p" | "4k", string>
      >
    | null
    | undefined,
): boolean {
  if (!videoUrls) return false;
  return Object.values(videoUrls).some((url) => url && url.trim() !== "");
}
