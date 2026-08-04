/**
 * Biblioteca de componentes reutilizáveis do MEDIA Rate (Parte 4 do redesign).
 *
 * Todos os componentes são isolados, tipados e escala-aware (nunca assumem
 * 0–10 ou 0–100 fixo) — recebem dados via props, sem estado global.
 *
 * ScoreDial e MediaCard re-exportam as implementações existentes
 * (single source of truth) para que a biblioteca tenha a superfície
 * especificada sem duplicar lógica.
 */
export { ScoreDial } from "@/components/ui/score-dial";
export type { MediaCard as MediaCardType } from "@/components/MediaCard";
export { MediaCard } from "@/components/MediaCard";
export type { MediaItem } from "@/components/MediaCard";
export { CriticsVsAudienceBar } from "./CriticsVsAudienceBar";
export type { CriticsVsAudienceBarProps } from "./CriticsVsAudienceBar";
export { CategoryChip, MEDIA_ACCENTS } from "./CategoryChip";
export type { CategoryChipProps } from "./CategoryChip";
export { ConfidenceBadge } from "./ConfidenceBadge";
export type { ConfidenceBadgeProps } from "./ConfidenceBadge";
export { SourceMiniCard } from "./SourceMiniCard";
export type { SourceMiniCardProps } from "./SourceMiniCard";
export { EmptyStateComingSoon } from "./EmptyStateComingSoon";
export type { EmptyStateComingSoonProps } from "./EmptyStateComingSoon";
