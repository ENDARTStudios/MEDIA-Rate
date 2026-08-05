"use client";

/**
 * Seções de carrossel para categorias futuras (addendum §6).
 *
 * Taxonomia alinhada ao menu: HQs e Mangás formam UMA categoria
 * (?type=comic, "HQs & Mangás") — igual ao cluster do Hero e à navegação.
 * Livro é a outra categoria em roadmap. Ambas usam o LockedComingSoonCard
 * (blur + cadeado + modal de waitlist) em vez de desaparecer.
 */
import { useTranslations } from "next-intl";
import { LockedComingSoonCard } from "@/components/media-rate-ui/LockedComingSoonCard";
import type { MediaType } from "@/lib/types";

const SECTIONS: { type: MediaType; labelKey: "railsBooks" | "railsComics"; countKey: "comingSoon" }[] = [
  { type: "book", labelKey: "railsBooks", countKey: "comingSoon" },
  { type: "comic", labelKey: "railsComics", countKey: "comingSoon" },
];

export function ComingSoonRails() {
  const t = useTranslations("landing");
  return (
    <>
      {SECTIONS.map((section) => (
        <section key={section.type} className="py-10 px-4" aria-labelledby={`rail-${section.type}`}>
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-5">
              <h2
                id={`rail-${section.type}`}
                className="font-heading text-xl font-bold text-[#F5F5F7] uppercase tracking-wider"
              >
                {t(section.labelKey)}
              </h2>
              <span className="text-xs text-[#6B6B85]">{t(section.countKey)}</span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none -mx-4 px-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex-shrink-0 w-[160px] sm:w-[180px] snap-start">
                  <LockedComingSoonCard type={section.type} variante={i} />
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </>
  );
}
