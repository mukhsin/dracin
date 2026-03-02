/**
 * Drama Card Skeleton
 * Used for: favorites, watchlist, drama lists
 * Shows portrait poster + title layout
 */

/**
 * Drama Card Skeleton
 * Used for: favorites, watchlist, drama lists
 * Shows portrait poster + title layout
 */
export function DramaCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[2/3] bg-gray-800 mb-3" />
      <div className="h-4 w-full bg-gray-800 mb-2" />
      <div className="h-3 w-2/3 bg-gray-800" />
    </div>
  );
}

/**
 * Continue Watching Card Skeleton
 * Used for: history page, continue watching section
 * Shows portrait poster + content with episode number and progress
 */
export function ContinueWatchingCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex gap-3">
        <div className="w-24 aspect-[2/3] flex-shrink-0 bg-gray-800" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-4 w-3/4 bg-gray-800" />
          <div className="h-3 w-1/2 bg-gray-800" />
          <div className="mt-3 space-y-2">
            <div className="h-1 w-full bg-gray-800" />
            <div className="h-3 w-1/3 bg-gray-800" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hero Skeleton
 * Used for: home page hero section
 * Shows large hero with gradient and text content
 */
export function HeroSkeleton() {
  return (
    <div className="w-full bg-[#0A0A0A] overflow-hidden animate-pulse">
      <div className="aspect-[3/4] md:aspect-video lg:aspect-[18/9] bg-gradient-to-b md:bg-gradient-to-r from-gray-900 to-gray-800">
        <div className="h-full flex flex-col justify-end md:justify-center md:flex-row md:items-center px-6 sm:px-8 lg:px-12 pb-8 md:pb-0">
          <div className="w-full max-w-2xl space-y-4">
            <div className="h-8 md:h-12 w-full max-w-[24rem] bg-gray-800" />
            <div className="space-y-2">
              <div className="h-4 w-full bg-gray-800" />
              <div className="h-4 w-3/4 bg-gray-800" />
              <div className="h-4 w-1/2 bg-gray-800" />
            </div>
            <div className="h-12 w-40 bg-primary/50" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Section Skeleton
 * Used for: home page content sections
 * Shows section header + horizontal card list
 */
export function SectionSkeleton() {
  return (
    <section className="py-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-48 bg-gray-800" />
        <div className="h-4 w-16 bg-gray-800" />
      </div>
      <div className="flex gap-3 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex-[0_0_auto] w-40 md:w-48">
            <div className="aspect-[2/3] bg-gray-800 mb-3" />
            <div className="h-4 w-full bg-gray-800 mb-2" />
            <div className="h-3 w-2/3 bg-gray-800" />
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Page Header Skeleton
 * Used for: page titles and descriptions
 */
export function PageHeaderSkeleton() {
  return (
    <div className="mb-8 animate-pulse">
      <div className="h-8 w-48 bg-gray-800 mb-2" />
      <div className="h-4 w-32 bg-gray-800" />
    </div>
  );
}

/**
 * Episode Grid Skeleton
 * Used for: drama details page episode grid
 * Shows grid of episode squares
 */
export function EpisodeGridSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-10 gap-2">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={`episode-skel-${i}-${20}`}
            className="bg-gray-800 aspect-square"
            style={{ borderRadius: "0" }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Episode Grid Mobile Skeleton
 * Used for: drama details page mobile episode grid
 */
export function EpisodeGridMobileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={`episode-mobile-skel-${i}-${15}`}
            className="bg-gray-800 aspect-square"
            style={{ borderRadius: "0" }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Drama Details Info Skeleton
 * Used for: drama details page info section
 * Shows title, badges, description
 */
export function DramaDetailsInfoSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Title */}
      <div
        className="h-10 md:h-12 w-3/4 bg-gray-800"
        style={{ borderRadius: "0" }}
      />

      {/* Status Badges */}
      <div className="flex gap-3">
        <div className="h-8 w-24 bg-gray-800" style={{ borderRadius: "0" }} />
        <div className="h-8 w-20 bg-gray-800" style={{ borderRadius: "0" }} />
        <div className="h-8 w-28 bg-gray-800" style={{ borderRadius: "0" }} />
      </div>

      {/* Description */}
      <div className="space-y-2 pt-2">
        <div className="h-4 w-full bg-gray-800" style={{ borderRadius: "0" }} />
        <div className="h-4 w-full bg-gray-800" style={{ borderRadius: "0" }} />
        <div className="h-4 w-2/3 bg-gray-800" style={{ borderRadius: "0" }} />
      </div>
    </div>
  );
}

/**
 * Watch Page Video Skeleton
 * Used for: watch page video player
 */
export function WatchPageVideoSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[9/16] max-h-[70vh] w-full max-w-md bg-gray-800" />
    </div>
  );
}

/**
 * Watch Page Navigation Skeleton
 * Used for: watch page navigation bar
 */
export function WatchPageNavigationSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="h-10 bg-gray-800" style={{ borderRadius: "0" }} />
        </div>
        <div className="flex-1 flex flex-col items-center gap-2">
          <div className="h-8 w-24 bg-gray-800" />
          <div className="h-4 w-16 bg-gray-800" />
        </div>
        <div className="flex-1">
          <div className="h-10 bg-gray-800" style={{ borderRadius: "0" }} />
        </div>
      </div>
    </div>
  );
}

/**
 * Back Button Skeleton
 * Used for: drama details back button
 */
export function BackButtonSkeleton() {
  return (
    <div
      className="h-6 w-32 bg-gray-800 mb-6 animate-pulse"
      style={{ borderRadius: "0" }}
    />
  );
}

export function ProfileGridSkeleton({ count = 12 }: { count?: number }) {
  const keys = Array.from(
    { length: count },
    (_, i) => `profile-grid-skel-${i}`,
  );
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {keys.map((key) => (
          <DramaCardSkeleton key={key} />
        ))}
      </div>
    </div>
  );
}

export function ProfileHistorySkeleton({ count = 6 }: { count?: number }) {
  const keys = Array.from(
    { length: count },
    (_, i) => `profile-history-skel-${i}`,
  );
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {keys.map((key) => (
          <ContinueWatchingCardSkeleton key={key} />
        ))}
      </div>
    </div>
  );
}
