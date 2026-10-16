/** T402 (D-378): preview borrado de feature gateada por plano, com CTA. */
export function PreviewCard({
  titulo,
  selo,
  hint,
  cta,
  onCta,
}: {
  titulo: string;
  selo: string;
  hint: string;
  cta: string;
  onCta: () => void;
}) {
  return (
    <section
      className="relative rounded-lg border border-white/[0.07] bg-dash-surface p-6 text-sm text-fg-muted"
      data-testid="gated-preview"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-white">{titulo}</h3>
        <span className="rounded-full border border-dash-indigo/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-dash-violet-light">
          {selo}
        </span>
      </div>
      <div className="pointer-events-none select-none blur-[6px]" aria-hidden="true">
        <div className="h-24 rounded-lg bg-gradient-to-br from-white/[0.06] to-transparent" />
        <div className="mt-3 h-2 w-2/3 rounded-full bg-white/[0.06]" />
      </div>
      <p className="mt-3 mb-3 text-[11px] leading-5">{hint}</p>
      <button
        type="button"
        onClick={onCta}
        className="rounded-lg bg-dash-indigo px-4 py-2 text-[11px] font-bold text-dash-deep transition hover:bg-dash-indigo-light"
      >
        {cta}
      </button>
    </section>
  );
}
