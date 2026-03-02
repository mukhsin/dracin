import useEmblaCarousel from "embla-carousel-react";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import DramaCard from "../drama-card";

interface Drama {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  posterUrl?: string | null;
  playCount?: number | string | null;
  language?: string | null;
  status?: string | null;
}

interface ContentSectionProps {
  title: string;
  dramas: Drama[];
  viewAllLink?: string;
}

function ContentSection({ title, dramas, viewAllLink }: ContentSectionProps) {
  const [emblaRef] = useEmblaCarousel(
    {
      align: "start",
      dragFree: true,
      containScroll: "trimSnaps",
    },
    [WheelGesturesPlugin()],
  );

  return (
    <section className="py-6">
      <div className="flex items-center justify-between mb-4 ">
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        {viewAllLink && (
          <Link
            to={viewAllLink}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            See all
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      <div className="overflow-hidden " ref={emblaRef}>
        <div className="flex gap-3">
          {dramas.map((drama) => (
            <div
              key={drama.id}
              className="flex-[0_0_auto] w-40 md:w-48 hover:scale-105 transition-transform duration-300 origin-center"
            >
              <DramaCard drama={drama} referrer="/" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ContentSection;
