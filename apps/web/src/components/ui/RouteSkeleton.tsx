/**
 * RouteSkeleton (D-582.5 / T211) — estado de carregamento padrão das rotas.
 *
 * Motivo: o app tinha **0 `loading.tsx`** em ~45 rotas, então em toda navegação o
 * usuário ficava com a tela anterior congelada até o RSC responder (todas as rotas
 * são dinâmicas). Este componente é a base do `loading.tsx` do segmento `[locale]`.
 *
 * Regras: server component (zero JS no cliente), sem `animate-pulse` do Tailwind
 * (o gate global de `prefers-reduced-motion` já zera animações CSS, mas usar
 * `animate-pulse` criaria movimento decorativo sem função) e sem conteúdo textual
 * — o leitor de tela recebe só o `role="status"` com rótulo.
 */
export function RouteSkeleton({
  label,
  variant = "cards",
}: {
  label: string;
  variant?: "cards" | "article";
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {/* Cabeçalho: título + linha de apoio */}
      <div className="h-8 w-64 rounded-lg bg-[#1B1B2C]" aria-hidden="true" />
      <div className="mt-3 h-4 w-96 max-w-full rounded bg-[#12121C]" aria-hidden="true" />

      {variant === "cards" ? (
        <div
          className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
          aria-hidden="true"
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-[2/3] w-full rounded-lg border border-[#2A2A3D] bg-[#12121C]" />
              <div className="h-3 w-4/5 rounded bg-[#1B1B2C]" />
              <div className="h-3 w-2/5 rounded bg-[#12121C]" />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]" aria-hidden="true">
          <div className="space-y-3">
            <div className="aspect-[16/6] w-full rounded-lg border border-[#2A2A3D] bg-[#12121C]" />
            <div className="h-3 w-full rounded bg-[#1B1B2C]" />
            <div className="h-3 w-11/12 rounded bg-[#12121C]" />
            <div className="h-3 w-3/4 rounded bg-[#12121C]" />
          </div>
          <div className="space-y-3">
            <div className="h-24 w-full rounded-lg border border-[#2A2A3D] bg-[#12121C]" />
            <div className="h-3 w-2/3 rounded bg-[#1B1B2C]" />
            <div className="h-3 w-1/2 rounded bg-[#12121C]" />
          </div>
        </div>
      )}
    </div>
  );
}
