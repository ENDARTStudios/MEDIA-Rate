import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * PageShell — a casca de página do conceito (D-661).
 *
 * Existe porque `npm run audit:routes` mediu as rotas públicas fora da linguagem
 * visual da home: parte delas com o corpo no componente importado (a página só
 * orquestra) e cor solta fora de token. Reescrever cada página isoladamente
 * reinventaria o mesmo layout; esta primitiva fixa o que é comum — container,
 * respiro vertical, hierarquia de título e faixa de ações — e deixa cada página
 * apenas com o seu conteúdo.
 *
 * O progresso é numérico: rode `npm run audit:routes` antes e depois da migração
 * em vez de confiar em contagem escrita à mão (as desta docstring já envelheceram
 * uma vez).
 *
 * Uso: <PageShell title={t("title")} intro={t("intro")} actions={<.../>}>...</PageShell>
 *
 * Decisões de contrato (não negociáveis, vêm do conceito e do D-065):
 * - o h1 é do shell, não da página: uma página tem UM título principal;
 * - o shell NÃO renderiza <main>: o landmark já é do layout `[locale]/layout.tsx`
 *   (`<main id="main">`, alvo do skip-link). Um <main> aqui dentro aninharia dois
 *   landmarks e quebraria o skip-link — por isso a raiz é uma div;
 * - container e paddings vêm daqui (max-w-7xl + px-4/6/8), então nenhuma página
 *   inventa margem própria — foi o que causou o transbordo de 10px no mobile;
 * - cores só por token (surface, fg, accent), nunca hex solto;
 * - sem raio gigante em bloco (anti-padrão D-065): raio é lg ou xl, com intenção.
 */
/**
 * Container da página: a única definição de max-width + padding horizontal e
 * vertical do site. Páginas com cabeçalho próprio (título + badges de plano,
 * abas, estado) compõem `PageContainer` + `PageTitle` em vez de repetir números.
 */
export function PageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8", className)}>{children}</div>
  );
}

/** Título h1 do conceito — mesma escala em todas as páginas. */
export function PageTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h1
      className={cn(
        "font-heading text-3xl font-bold tracking-tight text-fg-primary sm:text-4xl",
        className,
      )}
    >
      {children}
    </h1>
  );
}

export function PageShell({
  title,
  intro,
  actions,
  top,
  children,
}: {
  title: ReactNode;
  intro?: ReactNode;
  actions?: ReactNode;
  /** Elemento acima do título (faixa de identidade do plano, selo, breadcrumb). */
  top?: ReactNode;
  children: ReactNode;
}) {
  return (
    <PageContainer>
      {top ? <div className="mb-6">{top}</div> : null}
      <header className="max-w-3xl">
        <PageTitle>{title}</PageTitle>
        {intro ? <p className="mt-4 text-base leading-relaxed text-fg-secondary">{intro}</p> : null}
        {actions ? <div className="mt-8 flex flex-wrap items-center gap-3">{actions}</div> : null}
      </header>
      <div className="mt-12">{children}</div>
    </PageContainer>
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
