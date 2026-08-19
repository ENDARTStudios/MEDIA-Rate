"use client";

import { useLocale, useTranslations } from "next-intl";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { CATEGORY_TOKENS } from "@/lib/design-tokens";
import type { MediaType } from "@/lib/types";
import { ClapperboardIcon } from "./icons/ClapperboardIcon";
import { TvIcon } from "./icons/TvIcon";
import { ControllerIcon } from "./icons/ControllerIcon";
import { BookIcon } from "./icons/BookIcon";
import { MagazineIcon } from "./icons/MagazineIcon";

export type AnimationVariant = "clapperboard" | "tv" | "controller" | "book" | "magazine";

export interface HeroMediaIconProps {
  type: MediaType;
  animationVariant: AnimationVariant;
  href: string;
  label: string;
  className?: string;
}

const ICONS: Record<AnimationVariant, () => React.ReactNode> = {
  clapperboard: () => <ClapperboardIcon />,
  tv: () => <TvIcon />,
  controller: () => <ControllerIcon />,
  book: () => <BookIcon />,
  magazine: () => <MagazineIcon />,
};

export function HeroMediaIcon({ type, animationVariant, href, label, className }: HeroMediaIconProps) {
  const locale = useLocale();
  const t = useTranslations("catalog");
  const shouldReduce = useReducedMotion();
  const accent = CATEGORY_TOKENS[type].color;
  const Art = ICONS[animationVariant];
  const localizedHref = href.startsWith("/") ? `/${locale}${href}` : href;

  return (
    <motion.a
      href={localizedHref}
      aria-label={t("exploreCategory", { label })}
      whileHover={shouldReduce ? undefined : { y: -5 }}
      whileTap={shouldReduce ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 360, damping: 22 }}
      className={cn("hero-media-card group", className)}
      style={{ ["--hero-accent" as string]: accent }}
      data-testid={`hero-media-icon-${type}`}
    >
      <span className="hero-media-card-index" aria-hidden="true">{String(["movie", "series", "game", "book", "comic"].indexOf(type) + 1).padStart(2, "0")}</span>
      <span className="hero-media-card-art" aria-hidden="true"><Art /></span>
      <span className="hero-media-card-label">{label}</span>
      <span className="hero-media-card-arrow" aria-hidden="true">↗</span>
    </motion.a>
  );
}

export default HeroMediaIcon;
