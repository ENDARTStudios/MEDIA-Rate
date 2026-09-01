"use client";

/**
 * Árvore de nota por unidade seriada (Addendum 2 §3).
 *
 * Hierarquia: unidade (Temporada/Volume/Arco/Livro/DLC) → subunidades
 * (Episódio etc.). Regras:
 * - Nota direta da fonte quando existir; null → "Ainda sem votos suficientes"
 *   (nunca 0 ou vazio silencioso).
 * - A nota da unidade é a da fonte, ou a média das subunidades COM nota
 *   (subunidades sem nota não entram no denominador) quando a fonte não
 *   fornecer.
 * - NUNCA recalcula/afeta o MEDIA Score geral da obra.
 */
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export interface SeriatedUnit {
  label: string;
  /** Nota da fonte (0–10); null = sem votos suficientes. */
  score: number | null;
  subUnits?: SeriatedUnit[];
}

export interface SeriatedScoreTreeProps {
  unitLabel: string;
  units: SeriatedUnit[];
  className?: string;
}

function scoreColor(score: number): string {
  if (score >= 8) return "#34D399";
  if (score >= 6) return "#FBBF24";
  return "#F87171";
}

/** Média das subunidades COM nota (as sem nota ficam fora do denominador). */
function mediaDasSubUnidades(subUnits: SeriatedUnit[]): number | null {
  const comNota = subUnits.map((u) => u.score).filter((s): s is number => s != null);
  if (comNota.length === 0) return null;
  return Math.round((comNota.reduce((a, b) => a + b, 0) / comNota.length) * 10) / 10;
}

function Linha({ unit, depth }: { unit: SeriatedUnit; depth: number }) {
  const t = useTranslations("metadados");
  const score =
    unit.score ??
    (unit.subUnits && unit.subUnits.length > 0 ? mediaDasSubUnidades(unit.subUnits) : null);
  const temSub = unit.subUnits && unit.subUnits.length > 0;

  return (
    <li>
      <div
        className="flex items-center justify-between gap-3 py-1.5"
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        <span className="truncate text-sm text-[#A0A0B8]">{unit.label}</span>
        {score != null ? (
          <span
            className="shrink-0 text-sm font-bold tabular-nums"
            style={{ color: scoreColor(score) }}
            data-testid="seriated-score"
          >
            {score.toFixed(1)}
          </span>
        ) : (
          <span className="shrink-0 text-xs text-[#6B6B85]">{t("noVotesYet")}</span>
        )}
      </div>
      {temSub && (
        <ul className="divide-y divide-[#1B1B2C]">
          {unit.subUnits?.map((sub, i) => (
            <Linha key={`${sub.label}-${i}`} unit={sub} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function SeriatedScoreTree({ unitLabel, units, className }: SeriatedScoreTreeProps) {
  const t = useTranslations("metadados");
  if (units.length === 0) {
    return (
      <p className={cn("text-sm text-[#6B6B85]", className)} role="status">
        {t("noUnits", { label: unitLabel })}
      </p>
    );
  }
  return (
    <div className={cn("rounded-lg border border-[#2A2A3D] bg-[#12121C] p-4", className)}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#A0A0B8]">
        {unitLabel}
      </p>
      <ul className="divide-y divide-[#1B1B2C]">
        {units.map((unit, i) => (
          <Linha key={`${unit.label}-${i}`} unit={unit} depth={0} />
        ))}
      </ul>
      <p className="mt-2 text-xs text-[#6B6B85]">{t("unitNote")}</p>
    </div>
  );
}
