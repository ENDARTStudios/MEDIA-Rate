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
export { HeroMediaIcon } from "./HeroMediaIcon";
export type { HeroMediaIconProps, AnimationVariant } from "./HeroMediaIcon";
export { HeroIconCluster } from "./HeroIconCluster";
export { MediaCarousel } from "./MediaCarousel";
export type { MediaCarouselProps } from "./MediaCarousel";
export { ScoreDial } from "./ScoreDial";
export type { ScoreDialProps } from "./ScoreDial";
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
export { WaitlistCaptureModal } from "./WaitlistCaptureModal";
export type { WaitlistCaptureModalProps } from "./WaitlistCaptureModal";
export { LockedComingSoonCard } from "./LockedComingSoonCard";
export type { LockedComingSoonCardProps } from "./LockedComingSoonCard";
export { TasteRadarChart } from "./TasteRadarChart";
export type { TasteRadarChartProps } from "./TasteRadarChart";
export { ReleaseTimeline } from "./ReleaseTimeline";
export type { ReleaseTimelineProps } from "./ReleaseTimeline";
export { AgeRatingBadge } from "./AgeRatingBadge";
export type { AgeRatingBadgeProps, AgeRating } from "./AgeRatingBadge";
export { SeriatedScoreTree } from "./SeriatedScoreTree";
export type { SeriatedScoreTreeProps, SeriatedUnit } from "./SeriatedScoreTree";
export { GenreChipRow, SHARED_GENRES } from "./GenreChipRow";
export type { GenreChipRowProps } from "./GenreChipRow";
export { GenreFilterPrompt } from "./GenreFilterPrompt";
export type { GenreFilterPromptProps } from "./GenreFilterPrompt";
export { OriginBadge } from "./OriginBadge";
export type { OriginBadgeProps } from "./OriginBadge";
export { AwardsShowcase } from "./AwardsShowcase";
export type { AwardsShowcaseProps, Award } from "./AwardsShowcase";
export { FranchiseCarousel } from "./FranchiseCarousel";
export type { FranchiseCarouselProps, FranquiaItem } from "./FranchiseCarousel";
export { FranchiseOrderToggle } from "./FranchiseOrderToggle";
export type { FranchiseOrderToggleProps } from "./FranchiseOrderToggle";
