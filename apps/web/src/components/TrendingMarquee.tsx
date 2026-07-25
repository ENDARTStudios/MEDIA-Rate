"use client";

import { TextMarquee } from "./ui/text-marquee";

const TRENDING = {
  filmes: ["Duna: Parte 2", "Oppenheimer", "Pobres Criaturas", "Barbie", "The Batman", "Serial", "Anatomia de uma Queda", "Zona de Interesse"],
  series: ["The Bear", "Succession", "The Last of Us", "House of the Dragon", "Fallout", "Xógum", "Bebê Rena", "Ripley"],
  games: ["Baldur's Gate 3", "Zelda: Tears of the Kingdom", "Elden Ring", "Alan Wake 2", "Spider-Man 2", "Starfield", "Hi-Fi Rush", "Sea of Stars"],
  livros: ["Tomorrow, and Tomorrow", "Fourth Wing", "Iron Flame", "Lessons in Chemistry", "The Covenant of Water", "Holly", "Yellowface", "Happy Place"],
};

export function TrendingMarquee() {
  return (
    <div className="py-6 bg-surface-elevated/30 border-y border-surface-border/20 overflow-hidden">
      <TextMarquee items={TRENDING.filmes} className="mb-3" />
      <TextMarquee items={TRENDING.series} className="mb-3" />
      <TextMarquee items={TRENDING.games} />
    </div>
  );
}
