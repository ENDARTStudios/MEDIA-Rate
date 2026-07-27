"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { MediaCard, type MediaItem } from "@/components/MediaCard";

const MOCK_ITEMS: Record<string, MediaItem[]> = {
  FILME: [
    { id: "mf1", titulo: "A Odisseia", tipo: "FILME", ano_lancamento: 2026, imagem_url: "https://image.tmdb.org/t/p/w500/muMwJAiMtReEHLKpKMWt2rMkYF7.jpg", score: 79 },
    { id: "mf2", titulo: "Homem-Aranha: Um Novo Dia", tipo: "FILME", ano_lancamento: 2026, imagem_url: "https://image.tmdb.org/t/p/w500/x0nvYzQpyJc5pdT9lMnkMuYAg0O.jpg", score: 90 },
    { id: "mf3", titulo: "Mortal Kombat 2", tipo: "FILME", ano_lancamento: 2026, imagem_url: "https://image.tmdb.org/t/p/w500/iILiJSRViTEcF23MHhGCbVm3mfW.jpg", score: 80 },
    { id: "mf4", titulo: "Devoradores de Estrelas", tipo: "FILME", ano_lancamento: 2026, imagem_url: "https://image.tmdb.org/t/p/w500/2i8uru7rlbHKaoIbC2V4FZLT7uW.jpg", score: 87 },
    { id: "mf5", titulo: "Super Mario Galaxy: O Filme", tipo: "FILME", ano_lancamento: 2026, imagem_url: "https://image.tmdb.org/t/p/w500/b3WeTp42eJSRuE4UZfyPCOJW4c.jpg", score: 83 },
    { id: "mf6", titulo: "Avatar Aang", tipo: "FILME", ano_lancamento: 2026, imagem_url: "https://image.tmdb.org/t/p/w500/h0jCyR6FTvp6ULcPokfoXvV1t3O.jpg", score: 92 },
    { id: "mf7", titulo: "Jujutsu Kaisen", tipo: "FILME", ano_lancamento: 2020, imagem_url: "https://image.tmdb.org/t/p/w500/fHpKWq9ayzSk8nSwqRuaAUemRKh.jpg", score: 86 },
    { id: "mf8", titulo: "Frieren", tipo: "FILME", ano_lancamento: 2023, imagem_url: "https://image.tmdb.org/t/p/w500/dqBW9v7NAMtH1RH1E7xuhNKCY0A.jpg", score: 88 },
  ],
  SERIE: [
    { id: "ms1", titulo: "Jujutsu Kaisen", tipo: "SERIE", ano_lancamento: 2020, imagem_url: "https://image.tmdb.org/t/p/w500/fHpKWq9ayzSk8nSwqRuaAUemRKh.jpg", score: 86 },
    { id: "ms2", titulo: "Frieren e a Jornada", tipo: "SERIE", ano_lancamento: 2023, imagem_url: "https://image.tmdb.org/t/p/w500/dqBW9v7NAMtH1RH1E7xuhNKCY0A.jpg", score: 88 },
    { id: "ms3", titulo: "Hunter x Hunter", tipo: "SERIE", ano_lancamento: 2011, imagem_url: "https://image.tmdb.org/t/p/w500/9Y5WQvqUHYsNYDw4JUz9J3Gx5RW.jpg", score: 87 },
    { id: "ms4", titulo: "Bleach", tipo: "SERIE", ano_lancamento: 2004, imagem_url: "https://image.tmdb.org/t/p/w500/2EewmxXe72ogD0VMhPO1E3Y8kQx.jpg", score: 84 },
    { id: "ms5", titulo: "One Piece", tipo: "SERIE", ano_lancamento: 1999, imagem_url: "https://image.tmdb.org/t/p/w500/cMD9Ygz1Y3bQHr2J0kMkXH3LGOt.jpg", score: 87 },
    { id: "ms6", titulo: "Mushoku Tensei", tipo: "SERIE", ano_lancamento: 2021, imagem_url: "https://image.tmdb.org/t/p/w500/sviEqFIPJW5gFtuYy8XyE0Uscid.jpg", score: 85 },
  ],
  GAME: [
    { id: "mg1", titulo: "Elden Ring", tipo: "GAME", ano_lancamento: 2022, imagem_url: null, score: 96 },
    { id: "mg2", titulo: "Baldur's Gate 3", tipo: "GAME", ano_lancamento: 2023, imagem_url: null, score: 96 },
    { id: "mg3", titulo: "Zelda: Breath of the Wild", tipo: "GAME", ano_lancamento: 2017, imagem_url: null, score: 97 },
    { id: "mg4", titulo: "Red Dead Redemption 2", tipo: "GAME", ano_lancamento: 2018, imagem_url: null, score: 97 },
    { id: "mg5", titulo: "The Witcher 3", tipo: "GAME", ano_lancamento: 2015, imagem_url: null, score: 93 },
    { id: "mg6", titulo: "God of War Ragnarok", tipo: "GAME", ano_lancamento: 2022, imagem_url: null, score: 94 },
  ],
};

const LABELS: Record<string, { color: string }> = {
  FILME: { color: "#38BDF8" },
  SERIE: { color: "#818CF8" },
  GAME: { color: "#F59E0B" },
};

const LABEL_KEYS: Record<string, string> = {
  FILME: "filmes",
  SERIE: "series",
  GAME: "games",
};

export function MediaRail({ mediaType }: { mediaType: "FILME" | "SERIE" | "GAME" }) {
  const t = useTranslations("mediarail");
  const shouldReduce = useReducedMotion();
  const railRef = useRef<HTMLDivElement>(null);
  const items = MOCK_ITEMS[mediaType] || [];
  const title = t(LABEL_KEYS[mediaType]);
  const { color } = LABELS[mediaType];

  return (
    <section className="py-10 px-4" aria-labelledby={`rail-${mediaType}`}>
      <div className="max-w-7xl mx-auto" ref={railRef}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
          <h2 id={`rail-${mediaType}`} className="font-heading text-xl font-bold text-[#EDE7DC] uppercase tracking-wider">
            {title}
          </h2>
          <div className="text-xs text-[#6B7280] font-body">
            {t("count", { count: items.length })}
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none -mx-4 px-4" role="list" aria-label={t("ariaLabel", { title })}>
          {items.map((media, i) => (
            <motion.div
              key={media.id}
              className="flex-shrink-0 w-[160px] sm:w-[180px] snap-start"
              initial={shouldReduce ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <MediaCard media={media} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
