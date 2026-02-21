import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";

interface HeroCarouselProps {
  dramas: {
    id: string;
    title: string;
    slug: string;
    description?: string;
    posterUrl?: string;
  }[];
}

export default function HeroCarousel({ dramas }: HeroCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start" },
    [Autoplay({ delay: 5000, stopOnInteraction: false })],
  );

  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi],
  );

  if (dramas.length === 0) return null;

  return (
    <div className="relative w-full bg-[#0A0A0A] overflow-hidden">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {dramas.map((drama) => (
            <div
              key={drama.id}
              className="flex-[0_0_100%] min-w-0 relative aspect-[4/5] sm:aspect-[16/9] lg:aspect-[2/1]"
            >
              <div className="absolute inset-0 lg:hidden">
                {drama.posterUrl ? (
                  <Image
                    src={drama.posterUrl}
                    alt={drama.title}
                    layout="fullWidth"
                    className="w-full h-full object-cover"
                    priority
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
              </div>

              <div className="hidden lg:block absolute inset-0">
                <div className="absolute inset-0 bg-black" />

                {drama.posterUrl ? (
                  <div className="absolute right-0 top-0 w-1/2 h-full px-12">
                    <Image
                      src={drama.posterUrl}
                      alt={drama.title}
                      layout="fullWidth"
                      className="w-full h-full object-contain"
                      priority
                    />
                  </div>
                ) : (
                  <div className="absolute right-0 top-0 w-1/2 h-full px-12 bg-gradient-to-br from-gray-800 to-gray-900" />
                )}

                <div className="absolute inset-0 bg-gradient-to-r from-black via-black via-35% via-black/80 via-55% to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-l from-black via-transparent via-20% to-transparent" />
              </div>

              <div className="relative h-full flex items-center">
                <div className="container mx-auto px-6 sm:px-8 lg:px-12 w-full">
                  <div className="max-w-2xl">
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
                      {drama.title}
                    </h1>

                    {drama.description && (
                      <p className="text-base sm:text-lg text-gray-300 mb-6 line-clamp-2 sm:line-clamp-3">
                        {drama.description}
                      </p>
                    )}

                    <Link
                      to="/dramas/$dramaId"
                      params={{ dramaId: drama.slug }}
                      className="inline-flex items-center gap-2 bg-primary hover:bg-[#B89452] text-black font-semibold px-8 py-3 transition-colors duration-200"
                      style={{ borderRadius: "0" }}
                    >
                      <span>Play Now</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={scrollPrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center bg-black/50 hover:bg-black/70 text-white transition-colors"
        style={{ borderRadius: "0" }}
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        type="button"
        onClick={scrollNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center bg-black/50 hover:bg-black/70 text-white transition-colors"
        style={{ borderRadius: "0" }}
        aria-label="Next slide"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
        {dramas.map((drama, index) => (
          <button
            key={drama.id}
            type="button"
            onClick={() => scrollTo(index)}
            className={`w-8 h-1 transition-all duration-200 ${
              index === selectedIndex
                ? "bg-primary"
                : "bg-white/40 hover:bg-white/60"
            }`}
            style={{ borderRadius: "0" }}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
