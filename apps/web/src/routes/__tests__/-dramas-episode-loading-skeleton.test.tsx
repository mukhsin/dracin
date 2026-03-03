import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const watchPageSourceCode = readFileSync(
  join(__dirname, "../dramas.$dramaSlug.$episodeNumber.tsx"),
  "utf-8",
);

describe("Watch page loading skeleton source-level verification", () => {
  it("uses full TanStack Query loading signal for skeleton gating", () => {
    expect(watchPageSourceCode).toContain("isPending");
    expect(watchPageSourceCode).toContain("isFetching");
    expect(watchPageSourceCode).toContain(
      "const isEpisodeLoading = isPending || isLoading || isFetching;",
    );
  });

  it("shows skeleton when min delay is not done or query is loading", () => {
    expect(watchPageSourceCode).toContain(
      "const showSkeleton = !minDelayDone || isEpisodeLoading;",
    );
    expect(watchPageSourceCode).toContain("if (showSkeleton)");
    expect(watchPageSourceCode).toContain("<WatchPageVideoSkeleton />");
  });
});
