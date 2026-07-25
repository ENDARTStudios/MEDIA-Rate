"use client";

import { TextMarquee } from "./ui/text-marquee";

interface TrendingMarqueeProps {
  filmes?: string[];
  series?: string[];
  games?: string[];
  livros?: string[];
}

const DEFAULT_TRENDING = {
  filmes: ["Duna: Parte 2", "Oppenheimer", "Pobres Criaturas", "Barbie", "The Batman", "Serial", "Anatomia de uma Queda", "Zona de Interesse"],
  series: ["The Bear", "Succession", "The Last of Us", "House of the Dragon", "Fallout", "Xógum", "Bebê Rena", "Ripley"],
  games: ["Baldur's Gate 3", "Zelda: Tears of the Kingdom", "Elden Ring", "Alan Wake 2", "Spider-Man 2", "Starfield", "Hi-Fi Rush", "Sea of Stars"],
  livros: ["Tomorrow, and Tomorrow", "Fourth Wing", "Iron Flame", "Lessons in Chemistry", "The Covenant of Water", "Holly", "Yellowface", "Happy Place"],
};

export function TrendingMarquee({ filmes, series, games, livros }: TrendingMarqueeProps) {
  const f = filmes ?? DEFAULT_TRENDING.filmes;
  const s = series ?? DEFAULT_TRENDING.series;
  const g = games ?? DEFAULT_TRENDING.games;
  const l = livros ?? DEFAULT_TRENDING.livros;

  return (
    <div className="py-6 bg-surface-elevated/30 border-y border-surface-border/20 overflow-hidden">
      <TextMarquee items={f} className="mb-3" />
      <TextMarquee items={s} className="mb-3" />
      <TextMarquee items={g} className="mb-3" />
      <TextMarquee items={l} />
    </div>
  );
}
