import useEmblaCarousel from "embla-carousel-react";
import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import DramaCard from "../drama-card";

interface Drama {
  id: string;
  title: string;
  slug: string;
  description?: string;
  posterUrl?: string;
  playCount?: string;
  language?: string;
  status?: string;
}

interface ContentSectionProps {
  title: string;
  dramas: Drama[];
  viewAllLink?: string;
}

function ContentSection({ title, dramas, viewAllLink }: ContentSectionProps) {
  const [emblaRef] = useEmblaCarousel({
    align: "start",
    dragFree: true,
    containScroll: "trimSnaps",
  });

  return (
    <section className="py-6">
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        {viewAllLink && (
          <Link
            to={viewAllLink}
            className="inline-flex items-center gap-1 text-sm font-medium text-amber-500 hover:text-amber-400 transition-colors"
          >
            See all
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      <div className="overflow-hidden px-2" ref={emblaRef}>
        <div className="flex py-4">
          {dramas.map((drama) => (
            <div
              key={drama.id}
              className="flex-[0_0_auto] w-44 md:w-52 px-2 hover:scale-105 transition-transform duration-300 origin-center"
            >
              <DramaCard drama={drama} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ContentSection;
