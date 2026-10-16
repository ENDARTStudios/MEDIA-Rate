import { CATEGORY_TOKENS } from "@/lib/design-tokens";
/** Barras horizontais compactas (histograma de notas, todos os planos). */
export function HistogramBars({ histograma }: { histograma: { faixa: string; total: number }[] }) {
  const entradas = histograma.filter((h) => h.total > 0);
  if (entradas.length === 0) {
    return <p className="text-[11px] text-fg-muted">—</p>;
  }
  const max = Math.max(1, ...entradas.map((h) => h.total));
  return (
    <ul role="list" className="space-y-2.5">
      {entradas.map((h) => (
        <li key={h.faixa} className="flex items-center gap-3">
          <span className="w-10 shrink-0 text-[10px] text-fg-muted">{h.faixa}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full"
              // Acento do histograma EMPRESTA a cor canônica de séries do
              // token (D-526: nenhum hex de mídia duplicado fora dos tokens).
              style={{
                width: `${Math.max(2, (h.total / max) * 100)}%`,
                background: CATEGORY_TOKENS.series.color,
              }}
            />
          </div>
          <span className="w-6 shrink-0 text-right text-[10px] font-bold text-white">
            {h.total}
          </span>
        </li>
      ))}
    </ul>
  );
}
