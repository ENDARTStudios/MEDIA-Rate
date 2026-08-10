"use client";

/**
 * HeroIconCluster (addendum 1, D-204) — cluster de 5 ícones 3D-em-camadas.
 *
 * - <nav aria-label="Categorias de mídia"><ul><li> para leitores de tela.
 * - Layout: desktop ≥1024 5 em linha (96-120px, gap 48); tablet 768-1023
 *   (72-88px, gap 24); mobile <768 carrossel scroll-snap (~64px).
 * - Cada ícone navega para /catalog?type=X (filtro da categoria).
 * - T243: rótulos via chaves i18n (catalog.filme/serie/game/livro/comic/
 *   manga) — nunca strings PT hardcoded (EN/ES exibiam 'Filmes/Séries').
 */
import { useTranslations } from "next-intl";
import { HeroMediaIcon, type AnimationVariant } from "./HeroMediaIcon";
import { CATEGORY_TOKENS } from "@/lib/design-tokens";
import type { MediaType } from "@/lib/types";

const ICONS: { type: MediaType; variant: AnimationVariant; href: string; labelKey: string }[] = [
  { type: "movie", variant: "clapperboard", href: "/catalog?type=movie", labelKey: "filme" },
  { type: "series", variant: "tv", href: "/catalog?type=series", labelKey: "serie" },
  { type: "game", variant: "controller", href: "/catalog?type=game", labelKey: "game" },
  { type: "book", variant: "book", href: "/catalog?type=book", labelKey: "livro" },
  { type: "comic", variant: "magazine", href: "/catalog?type=comic", labelKey: "comic" },
];

export function HeroIconCluster() {
  const t = useTranslations("catalog");
  return (
    <nav aria-label={t("catalogAria")} className="w-full" data-testid="hero-icon-cluster">
      <ul className="hero-icon-cluster-list">
        {ICONS.map((icon) => {
          const accent = CATEGORY_TOKENS[icon.type].color;
          const label = t(icon.labelKey);
          return (
            <li
              key={icon.type}
              className="hero-icon-cluster-item"
              style={{ ["--item-accent" as string]: accent }}
            >
              <HeroMediaIcon
                type={icon.type}
                animationVariant={icon.variant}
                href={icon.href}
                label={label}
              />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
