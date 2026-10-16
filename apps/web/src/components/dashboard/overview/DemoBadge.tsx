/**
 * F17 (honestidade de produto): superfícies alimentadas pelo dataset de
 * demonstração do protótipo EXIBEM rótulo visível — nunca passam por dado
 * real do usuário ou da comunidade.
 */
export function DemoBadge({ label }: { label: string }) {
  return (
    <span
      data-testid="demo-badge"
      className="rounded-full border border-dash-amber/25 bg-dash-amber/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-dash-amber"
    >
      {label}
    </span>
  );
}
