"use client";

/**
 * Seções de carrossel para categorias futuras (addendum §6):
 * Livro, HQ e Mangá usam o LockedComingSoonCard (blur + cadeado + modal
 * de waitlist) em vez de desaparecer — continuidade visual da página e
 * captura de lead.
 */
import { useTranslations } from "next-intl";
import { LockedComingSoonCard } from "@/components/media-rate-ui/LockedComingSoonCard";
import type { MediaType } from "@/lib/types";

const SECTIONS: { type: MediaType; label: string; count: string }[] = [
  { type: "book", label: "Livros", count: "Em breve" },
  { type: "comic", label: "HQs", count: "Em breve" },
  { type: "anime", label: "Mangás", count: "Em breve" },
];

export function ComingSoonRails() {
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
                {section.label}
              </h2>
              <span className="text-xs text-[#6B6B85]">{section.count}</span>
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
