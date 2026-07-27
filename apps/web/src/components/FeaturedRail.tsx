"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { MediaCard, type MediaItem } from "@/components/MediaCard";
import { gsap } from "@/lib/gsap-config";
import { neonGlow } from "@/lib/motion";

const FEATURED_MEDIA: MediaItem[] = [
  { id: "f1", titulo: "A Odisseia", tipo: "FILME", ano_lancamento: 2026, imagem_url: "https://image.tmdb.org/t/p/w500/muMwJAiMtReEHLKpKMWt2rMkYF7.jpg", score: 79 },
  { id: "f2", titulo: "Elden Ring", tipo: "GAME", ano_lancamento: 2022, imagem_url: null, score: 96 },
  { id: "f3", titulo: "Homem-Aranha: Um Novo Dia", tipo: "FILME", ano_lancamento: 2026, imagem_url: "https://image.tmdb.org/t/p/w500/x0nvYzQpyJc5pdT9lMnkMuYAg0O.jpg", score: 90 },
  { id: "f4", titulo: "The Legend of Zelda: Breath of the Wild", tipo: "GAME", ano_lancamento: 2017, imagem_url: null, score: 97 },
  { id: "f5", titulo: "Mortal Kombat 2", tipo: "FILME", ano_lancamento: 2026, imagem_url: "https://image.tmdb.org/t/p/w500/iILiJSRViTEcF23MHhGCbVm3mfW.jpg", score: 80 },
  { id: "f6", titulo: "Baldur's Gate 3", tipo: "GAME", ano_lancamento: 2023, imagem_url: null, score: 96 },
  { id: "f7", titulo: "Super Mario Galaxy: O Filme", tipo: "FILME", ano_lancamento: 2026, imagem_url: "https://image.tmdb.org/t/p/w500/b3WeTp42eJSRuE4UZfyPCOJW4c.jpg", score: 83 },
  { id: "f8", titulo: "Frieren", tipo: "SERIE", ano_lancamento: 2023, imagem_url: "https://image.tmdb.org/t/p/w500/dqBW9v7NAMtH1RH1E7xuhNKCY0A.jpg", score: 88 },
];

export function FeaturedRail() {
  const t = useTranslations("featured");
  const shouldReduce = useReducedMotion();
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shouldReduce || !railRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        railRef.current,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: railRef.current,
            start: "top 90%",
            toggleActions: "play none none none",
          },
        },
      );
    }, railRef);

    return () => ctx.revert();
  }, [shouldReduce]);

  return (
    <section className="py-12 px-4 relative" aria-labelledby="featured-title">
      <div className="max-w-7xl mx-auto" ref={railRef}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-5 rounded-full bg-[#818CF8]" style={shouldReduce ? undefined : neonGlow().boxShadow ? { boxShadow: neonGlow().boxShadow } : undefined} aria-hidden="true" />
          <h2 id="featured-title" className="font-heading text-xl font-bold text-[#EDE7DC] uppercase tracking-wider">
            {t("title")}
          </h2>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none -mx-4 px-4" role="list" aria-label={t("ariaLabel")}>
          {FEATURED_MEDIA.map((media, i) => (
            <motion.div
              key={media.id}
              className="flex-shrink-0 w-[180px] sm:w-[200px] snap-start"
              initial={shouldReduce ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
            >
              <MediaCard media={media} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
