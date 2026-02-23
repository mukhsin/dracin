import { useEffect, useRef, useState } from "react";

interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderColor?: string;
}

export function ProgressiveImage({
  src,
  alt,
  className = "",
  placeholderColor = "#1f2937", // gray-800
}: ProgressiveImageProps) {
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lazy-load trigger with IntersectionObserver
  useEffect(() => {
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
        rootMargin: "100px",
        threshold: 0.1,
      },
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden w-full h-full ${className}`}
    >
      {/* Placeholder layer */}
      <div
        className={`
          absolute inset-0
          transition-opacity duration-500 ease-out
          ${isLoaded ? "opacity-0" : "opacity-100"}
        `}
        style={{ backgroundColor: placeholderColor }}
      />

      {/* Actual image - only render when in view */}
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
    </div>
  );
}
