"use client";

/**
 * Calendário horizontal de lançamentos (Parte 3.4).
 *
 * O modelo atual não expõe datas de estreia por item da watchlist — o
 * componente renderiza um estado vazio gracioso quando não há dados
 * (decisão documentada); o formato aceita `{ date, title }[]` para quando
 * a API passar a fornecer.
 */
export interface ReleaseTimelineProps {
  items: { date: string; title: string }[];
  className?: string;
}

export function ReleaseTimeline({ items, className }: ReleaseTimelineProps) {
  if (items.length === 0) {
    return (
      <div
        className="rounded-lg border border-dashed border-surface-border bg-surface-card/60 px-4 py-8 text-center"
        role="status"
        data-testid="release-timeline-empty"
      >
        <p className="text-sm text-fg-muted">
          Calendário de lançamentos chega quando houver datas de estreia no catálogo.
        </p>
      </div>
    );
  }

  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className={className} data-testid="release-timeline">
      <ol className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none">
        {sorted.map((item) => (
          <li
            key={`${item.date}-${item.title}`}
            className="flex-shrink-0 w-40 snap-start rounded-md border border-surface-border bg-surface-card p-3"
          >
            <p className="text-xs font-medium text-accent-indigo">{item.date}</p>
            <p className="mt-1 truncate text-sm text-fg-primary">{item.title}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
