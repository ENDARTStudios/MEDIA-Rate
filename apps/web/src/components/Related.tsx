import { MediaCard } from "@/components/MediaCard";
import type { MediaItem } from "@/components/MediaCard";

export interface RelatedProps {
  items: MediaItem[];
  title?: string;
}

export function Related({ items, title = "" }: RelatedProps) {
  if (!items || items.length === 0) return null;

  return (
    <section className="py-6" data-testid="related" aria-label={title}>
      <h3 className="text-sm font-heading font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">
        {title}
      </h3>
      <div
        className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none -mx-1 px-1"
        role="list"
      >
        {items.map((item) => (
          <div key={item.id} className="flex-shrink-0 w-[150px] snap-start">
            <MediaCard media={item} />
          </div>
        ))}
      </div>
    </section>
  );
}
