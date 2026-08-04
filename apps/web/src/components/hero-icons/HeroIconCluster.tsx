"use client";

/**
 * HeroIconCluster (addendum §3/§5) — os 5 ícones 3D do hero.
 *
 * - <nav aria-label="Categorias de mídia"><ul><li> para leitores de tela.
 * - Leiaute: linha desktop (96-120px, gap 48), tablet (72-88px, gap 24),
 *   mobile (carrossel horizontal scroll-snap, ~64px).
 * - Cada ícone navega para /catalog?type=X (filtro da categoria).
 */
import { HeroMediaIcon } from "./HeroMediaIcon";
import type { AnimationVariant } from "./icon-art";
import type { MediaType } from "@/lib/types";

const ICONS: {
  type: MediaType;
  variant: AnimationVariant;
  href: string;
  label: string;
}[] = [
  { type: "movie", variant: "clapperboard", href: "/catalog?type=movie", label: "Filmes" },
  { type: "series", variant: "tv", href: "/catalog?type=series", label: "Séries" },
  { type: "game", variant: "controller", href: "/catalog?type=game", label: "Games" },
  { type: "book", variant: "book", href: "/catalog?type=book", label: "Livros" },
  {
    type: "comic",
    variant: "magazine",
    href: "/catalog?type=comic",
    label: "HQs & Mangás",
  },
];

export function HeroIconCluster() {
  return (
    <nav aria-label="Categorias de mídia" className="w-full">
      <ul className="flex items-center justify-start gap-6 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none sm:justify-center lg:gap-12">
        {ICONS.map((icon) => (
          <li key={icon.type} className="flex-shrink-0 snap-start w-20 sm:w-24 lg:w-[120px]">
            <HeroMediaIcon
              type={icon.type}
              variant={icon.variant}
              href={icon.href}
              label={`Explorar ${icon.label}`}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}
