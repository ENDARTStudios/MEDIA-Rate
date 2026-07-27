"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "motion/react";

const MARQUEE_ITEMS = [
  "Oppenheimer", "The Last of Us", "Elden Ring", "Dune: Parte 2", "Baldur's Gate 3",
  "Succession", "Zelda: Tears", "Breaking Bad", "Red Dead 2", "Frieren", "Bleach",
  "One Piece", "The Bear", "Starfield", "Alan Wake 2", "Jujutsu Kaisen", "Cyberpunk 2077",
  "Hunter x Hunter", "The Witcher 3", "Fallout", "Mushoku Tensei", "Sea of Stars",
  "Oppenheimer", "The Last of Us", "Elden Ring", "Dune: Parte 2", "Baldur's Gate 3",
  "Succession", "Zelda: Tears", "Breaking Bad", "Red Dead 2", "Frieren", "Bleach",
  "One Piece", "The Bear", "Starfield", "Alan Wake 2", "Jujutsu Kaisen", "Cyberpunk 2077",
];

export function HomeVerticalMarquee() {
  const shouldReduce = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  if (shouldReduce) {
    return (
      <aside className="hidden lg:flex flex-col items-center justify-center w-16 shrink-0 border-l border-[rgba(129,140,248,0.06)] py-8" aria-hidden="true">
        <div className="font-heading text-xs text-[#6B7280] tracking-widest uppercase" style={{ writingMode: "vertical-rl" }}>
          {MARQUEE_ITEMS.slice(0, 15).join("  ·  ")}
        </div>
      </aside>
    );
  }

  return (
    <aside
      ref={containerRef}
      className="hidden lg:flex flex-col items-center justify-center w-16 shrink-0 border-l border-[rgba(129,140,248,0.06)] overflow-hidden relative"
      aria-hidden="true"
    >
      <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-[#09090F] to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#09090F] to-transparent z-10 pointer-events-none" />

      <motion.div
        className="font-heading text-xs text-[#6B7280] tracking-widest whitespace-nowrap"
        style={{ writingMode: "vertical-rl" }}
        animate={{ y: ["0%", "-50%"] }}
        transition={{ duration: 60, ease: "linear", repeat: Infinity }}
      >
        {MARQUEE_ITEMS.join("  ·  ")}
      </motion.div>
    </aside>
  );
}
