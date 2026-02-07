export function formatDate(
  date: Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  };
  return new Intl.DateTimeFormat("en-US", defaultOptions).format(date);
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function generateUniqueSlug(
  title: string,
  existingSlugs: string[],
): string {
  let slug = generateSlug(title);
  let counter = 1;
  let uniqueSlug = slug;

  while (existingSlugs.includes(uniqueSlug)) {
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }

  return uniqueSlug;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function truncateText(
  text: string,
  maxLength: number,
  suffix = "...",
): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - suffix.length) + suffix;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    result[key] = obj[key];
  }
  return result;
}

export function omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete (result as Record<string, unknown>)[key as string];
  }
  return result;
}

export function groupBy<T, K extends string | number | symbol>(
  array: T[],
  keyFn: (item: T) => K,
): Record<K, T[]> {
  return array.reduce(
    (result, item) => {
      const key = keyFn(item);
      result[key] = result[key] ?? [];
      result[key].push(item);
      return result;
    },
    {} as Record<K, T[]>,
  );
}

export function uniqueBy<T, K extends string | number | symbol>(
  array: T[],
  keyFn: (item: T) => K,
): T[] {
  const seen = new Set<K>();
  return array.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function calculatePagination(
  total: number,
  page: number,
  pageSize: number,
) {
  const totalPages = Math.ceil(total / pageSize);
  const hasMore = page < totalPages;
  const offset = (page - 1) * pageSize;

  return {
    totalPages,
    hasMore,
    offset,
    limit: pageSize,
  };
}

/**
 * Parse play count string with M/K suffixes to integer
 * Examples: "14M" → 14000000, "3.4M" → 3400000, "317K" → 317000
 */
export function parsePlayCount(
  playCountStr: string | null | number,
): number | null {
  if (!playCountStr || playCountStr === "NULL") return null;
  if (typeof playCountStr === "number") return playCountStr;

  const str = playCountStr.toString().trim().toUpperCase();
  const match = str.match(/^([\d.]+)([MK])$/);

  if (!match) return null;

  const value = parseFloat(match[1]);
  const suffix = match[2];

  if (suffix === "M") return Math.round(value * 1_000_000);
  if (suffix === "K") return Math.round(value * 1_000);

  return null;
}

/**
 * Format play count number to human-readable string with M/K suffixes
 * Examples: 14000000 → "14M", 3400000 → "3.4M", 317000 → "317K"
 */
export function formatPlayCount(playCount: number | null): string {
  if (playCount === null || playCount === undefined) return "0";

  if (playCount >= 1_000_000) {
    const millions = playCount / 1_000_000;
    // Show decimal only if it's not a whole number and less than 10M
    if (millions < 10 && millions % 1 !== 0) {
      return `${millions.toFixed(1)}M`;
    }
    return `${Math.round(millions)}M`;
  }

  if (playCount >= 1_000) {
    return `${Math.round(playCount / 1_000)}K`;
  }

  return playCount.toString();
}
