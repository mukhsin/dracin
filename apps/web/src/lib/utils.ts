import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function decodeHtmlEntities(url: string): string {
  return url
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function decodeVideoUrls(
  videoUrls: Record<string, string | undefined>,
): Record<string, string | undefined> {
  const decoded: Record<string, string | undefined> = {};
  for (const quality in videoUrls) {
    const url = videoUrls[quality];
    decoded[quality] = url ? decodeHtmlEntities(url) : undefined;
  }
  return decoded;
}
