"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { scoreColor } from "@/lib/design-tokens";

const ITEMS = [
  { name: "Oppenheimer", score: 8.7 },
  { name: "The Last of Us", score: 9.2 },
  { name: "Elden Ring", score: 96 },
  { name: "Dune: Parte 2", score: 8.5 },
  { name: "Baldur's Gate 3", score: 96 },
  { name: "Succession", score: 9.1 },
  { name: "Zelda: Tears", score: 96 },
  { name: "Breaking Bad", score: 9.5 },
  { name: "Red Dead 2", score: 97 },
  { name: "The Bear", score: 8.8 },
  { name: "Barbie", score: 7.8 },
  { name: "Cyberpunk 2077", score: 85 },
  { name: "Alan Wake 2", score: 89 },
  { name: "Arcane", score: 9.1 },
  { name: "God of War Ragnarok", score: 94 },
  { name: "Better Call Saul", score: 9.0 },
  { name: "Pobres Criaturas", score: 8.1 },
  { name: "John Wick 4", score: 8.2 },
  { name: "Starfield", score: 83 },
  { name: "Homem-Aranha: Através do Aranhaverso", score: 8.7 },
  { name: "Missão Impossível", score: 7.9 },
  { name: "Anatomia de uma Queda", score: 8.3 },
  { name: "Final Fantasy VII Rebirth", score: 92 },
  { name: "Frieren", score: 9.3 },
];

export function HomeVerticalMarquee() {
  const shouldReduce = useReducedMotion();
  const [paused, setPaused] = useState(false);

  if (shouldReduce) {
    return (
      <aside className="hidden lg:block w-32 shrink-0 border-l border-[rgba(129,140,248,0.06)] py-4 pl-3" aria-hidden="true">
        {ITEMS.slice(0, 10).map((item) => (
          <div key={item.name} className="text-xs text-[#6B7280] py-0.5 truncate">
            {item.name}
          </div>
        ))}
      </aside>
    );
  }

  const doubled = [...ITEMS, ...ITEMS];

  return (
    <aside
      className="hidden lg:block w-32 shrink-0 border-l border-[rgba(129,140,248,0.06)] overflow-hidden relative"
      aria-hidden="true"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-[#09090F] to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#09090F] to-transparent z-10 pointer-events-none" />
      <motion.div
        className="py-4 pl-3 space-y-1.5"
        animate={{ y: ["0%", "-50%"] }}
        transition={{ duration: 80, ease: "linear", repeat: Infinity }}
        style={{ animationPlayState: paused ? "paused" : "running" } as React.CSSProperties}
      >
        {doubled.map((item, i) => (
          <div key={`${item.name}-${i}`} className="flex items-center gap-1.5 group">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: scoreColor(item.score, item.score > 10 ? "0-100" : "0-10") }}
            />
            <span className="text-xs text-[#6B7280] truncate group-hover:text-[#9CA3AF] transition-colors">
              {item.name}
            </span>
          </div>
        ))}
      </motion.div>
    </aside>
  );
}
