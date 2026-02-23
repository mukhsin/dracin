You want two things: avoid the “chunky/partial” paint and make the image appear with a smooth transition (fade / blur-up), even though it’s coming through your own proxy API.

Below is a minimal pattern you can drop into your React + Tailwind stack; you don’t need a CDN or Unpic for this to feel smooth. The key ideas are:

- Reserve layout space (no jumpy layout).
- Use a low‑quality placeholder (solid color, blurhash, or tiny image).
- Cross‑fade from placeholder to the real image once it’s fully loaded. [github](https://github.com/FormidableLabs/react-progressive-image)

***

## 1. A reusable ProgressiveImage component

This version:

- Uses `IntersectionObserver` so images only start loading when almost in view. [linkedin](https://www.linkedin.com/pulse/implementing-lazy-loading-images-intersection-observer-vivek-neupane-fgnbc)
- Shows a blurred placeholder first, then smoothly fades the real image in. [dev](https://dev.to/jacksonkasi/how-to-make-smooth-progressive-image-loading-in-react-js-25ac)
- Works with any URL (including proxied image URLs from your API).

```tsx
import React from "react";

type ProgressiveImageProps = {
  src: string;              // your proxied image URL
  alt?: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  placeholderColor?: string; // Tailwind color or hex
};

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt = "",
  width = "100%",
  height = "100%",
  className = "",
  placeholderColor = "#e5e7eb", // default gray-200
}) => {
  const [isInView, setIsInView] = React.useState(false);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  // Lazy-load trigger with IntersectionObserver
  React.useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        root: null,
        rootMargin: "100px", // start loading a bit before it enters viewport
        threshold: 0.1,
      }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width, height }}
      className={`relative overflow-hidden ${className}`}
    >
      {/* Placeholder layer (colored + blur) */}
      <div
        className={`
          absolute inset-0
          transition-opacity duration-500 ease-out
          ${isLoaded ? "opacity-0" : "opacity-100"}
        `}
        style={{
          backgroundColor: placeholderColor,
        }}
      />

      {/* Actual image */}
      {isInView && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          className={`
            h-full w-full object-cover
            transform-gpu
            transition-opacity duration-500 ease-out
            ${isLoaded ? "opacity-100" : "opacity-0"}
          `}
        />
      )}
    </div>
  );
};
```

Usage in your component (for example with TanStack data):

```tsx
// inside your list / grid
<ProgressiveImage
  src={`/api/proxy/image?id=${item.id}`} // your API proxy URL
  alt={item.title}
  width={300}
  height={200}
  className="rounded-lg"
/>
```

This avoids the “parsial load” feel because the placeholder is full‑size from the start, and the real image fades in only when fully loaded. [dev](https://dev.to/benhoneywill/easy-blur-up-image-loading-with-react-hooks-513c)

***

## 2. If you want blur‑up (not just fade)

If you’re okay generating tiny versions of each image (or a blurhash), you can blur the placeholder, then remove blur on load for a more “premium” feel. [youtube](https://www.youtube.com/watch?v=VyUJUD5gyoo)

Replace the two layers with something like:

```tsx
{/* Blurred placeholder (full size) */}
<div
  className={`
    absolute inset-0
    transition-opacity duration-500 ease-out
    ${isLoaded ? "opacity-0" : "opacity-100"}
  `}
  style={{
    backgroundColor: placeholderColor,
    filter: "blur(20px)",
  }}
/>

{/* Real image, fading in */}
{isInView && (
  <img
    src={src}
    alt={alt}
    loading="lazy"
    onLoad={() => setIsLoaded(true)}
    className={`
      h-full w-full object-cover
      transition-opacity duration-500 ease-out
      ${isLoaded ? "opacity-100" : "opacity-0"}
    `}
  />
)}
```

For an even nicer effect, you could use a small base64 thumbnail or blurhash instead of a flat color, but the mechanics stay the same. [dev](https://dev.to/benhoneywill/easy-blur-up-image-loading-with-react-hooks-513c)

***

## 3. Common gotchas with proxied images

Check these if it still feels “chunky”:

- Ensure your proxy sets correct `Content-Type: image/*` and supports range/streaming properly so the browser can decode progressively. [coreui](https://coreui.io/answers/how-to-lazy-load-images-in-react/)
- Don’t render `<img>` until you’re ready; use a wrapper with fixed width/height so layout stays stable and you just animate opacity. [kentcdodds](https://kentcdodds.com/blog/building-an-awesome-image-loading-experience)
- Avoid animating `width`/`height` on load; only animate opacity or filter to keep transitions smooth. [dev](https://dev.to/melvin2016/progressive-image-loading-in-reactjs-3ik6)

If you paste your current image JSX and how you call your API (just the code, no secrets), I can refactor it into a drop‑in `ProgressiveImage` tailored to your setup.
