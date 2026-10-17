import type { ReactNode } from "react";

/**
 * PageShell — a casca de página do conceito (D-661).
 *
 * Existe porque o levantamento (npm run audit:routes) mostrou 19 das 38 rotas
 * públicas ainda sem a linguagem visual da home: 14 sem <h1>, 204 hex cru fora
 * de token. Reescrever cada página isoladamente reinventaria o mesmo layout 19
 * vezes; esta primitiva fixa o que é comum — container, respiro vertical,
 * hierarquia de título e faixa de ações — e deixa cada página apenas com o seu
 * conteúdo.
 *
 * Uso: <PageShell title={t("title")} intro={t("intro")} actions={<.../>}>...</PageShell>
 *
 * Decisões de contrato (não negociáveis, vêm do conceito e do D-065):
 * - o h1 é do shell, não da página: uma página tem UM título principal;
 * - container e paddings vêm daqui (max-w-7xl + px-4/6/8), então nenhuma página
 *   inventa margem própria — foi o que causou o transbordo de 10px no mobile;
 * - cores só por token (surface, fg, accent), nunca hex solto;
 * - sem rounded-2xl (anti-padrão D-065): raio é lg ou xl, com intenção.
 */
export function PageShell({
  title,
  intro,
  actions,
  children,
}: {
  title: ReactNode;
  intro?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="max-w-3xl">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-fg-primary sm:text-4xl">
          {title}
        </h1>
        {intro ? <p className="mt-4 text-base leading-relaxed text-fg-secondary">{intro}</p> : null}
        {actions ? <div className="mt-8 flex flex-wrap items-center gap-3">{actions}</div> : null}
      </header>
      <div className="mt-12">{children}</div>
    </main>
  );
}

/**
 * SectionBlock — seção interna de uma página, com título h2 do conceito e
 * espaçamento consistente. Evita que cada página invente `text-2xl mb-8`.
 */
export function SectionBlock({
  title,
  children,
  id,
}: {
  title: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="mt-16 first:mt-0">
      <h2 className="font-heading text-2xl font-bold text-fg-primary">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}
