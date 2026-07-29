"use client";

interface BarProps {
  criticsScore: number | null | undefined;
  audienceScore: number | null;
  consensus?: number | null;
  maxScore?: number;
}

export function Bar({ criticsScore, audienceScore, consensus, maxScore = 100 }: BarProps) {
  const isDivergent = consensus !== null && consensus !== undefined && consensus < 3 && criticsScore != null;

  if (audienceScore == null && criticsScore == null) {
    return <p className="text-sm text-[#6B7280]">Ainda sem avaliações suficientes</p>;
  }

  if (criticsScore == null) {
    // Modo uma barra (só audiência) — filme/série, sem alarde
    const pct = Math.round((audienceScore! / maxScore) * 100);
    return (
      <div className="space-y-1" data-testid="bar-single">
        <div className="flex justify-between text-xs">
          <span className="text-[#9CA3AF]">Audiência</span>
          <span className="text-[#F59E0B] tabular-nums font-medium">{audienceScore}</span>
        </div>
        <div className="h-2 rounded-full bg-[#1C1C2E] overflow-hidden">
          <div className="h-full rounded-full bg-[#F59E0B]" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  if (audienceScore == null) {
    return <p className="text-sm text-[#6B7280]">Dados de audiência insuficientes</p>;
  }

  // Modo dual: críticos + audiência
  const criticPct = Math.round((criticsScore / maxScore) * 100);
  const audiencePct = Math.round((audienceScore / maxScore) * 100);

  return (
    <div className="space-y-3" data-testid="bar-dual">
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-[#9CA3AF]">Críticos</span>
          <span className="text-[#38BDF8] tabular-nums font-medium">{criticsScore}</span>
        </div>
        <div className={`h-2 rounded-full bg-[#1C1C2E] overflow-hidden ${isDivergent ? "border-2 border-dashed border-[#EF4444]/60 rounded-full" : ""}`}>
          <div className="h-full rounded-full bg-[#38BDF8]" style={{ width: `${criticPct}%` }} />
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-[#9CA3AF]">Audiência</span>
          <span className="text-[#F59E0B] tabular-nums font-medium">{audienceScore}</span>
        </div>
        <div className={`h-2 rounded-full bg-[#1C1C2E] overflow-hidden ${isDivergent ? "border-2 border-dashed border-[#EF4444]/60 rounded-full" : ""}`}>
          <div className="h-full rounded-full bg-[#F59E0B]" style={{ width: `${audiencePct}%` }} />
        </div>
      </div>

      {isDivergent && (
        <p className="text-xs text-[#EF4444]">Alta divergência crítica/audiência</p>
      )}
    </div>
  );
}
