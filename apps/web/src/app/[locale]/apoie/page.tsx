import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageShell, SectionBlock } from "@/components/ui/page-shell";
import { SupportCta } from "@/components/support/SupportCta";
import { PATROCINIOS } from "@/lib/sponsorships";
import { Link } from "@/lib/navigation";
import { localizedAlternates, localizedUrl } from "@/lib/seo";

/**
 * /apoie — apoiadores, parceiros e patrocinadores.
 *
 * Três públicos, três caminhos, uma regra: **a nota não está à venda**. A página
 * existe porque sustentar um catálogo independente é uma conversa diferente para
 * cada tipo de interessado — e porque a resposta honesta para "como eu ajudo?" não
 * pode ser um botão genérico de doação que não existe.
 *
 * Regras que a página respeita (e que o `conceito-rotas` cobra):
 * - PageShell + SectionBlock, tokens só, sem hex, `rounded-xl` como raio máximo;
 * - nenhum número de marketing digitado (D-583.4) — as provas vivem em /methodology
 *   e /sources, que são linkados;
 * - nenhum logo, depoimento ou contagem de apoiadores: nada disso existe ainda, e
 *   inventar prova é o que o `home-truthfulness` barra;
 * - CTA de contato é `mailto:` com assunto próprio por público — sem formulário que
 *   prometa prazo que não depende de nós.
 */

const CONTATO = "endart.studios+contato@gmail.com";

const mailto = (assunto: string) => `mailto:${CONTATO}?subject=${encodeURIComponent(assunto)}`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "support" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: localizedUrl(locale, "/apoie"),
      languages: localizedAlternates("/apoie"),
    },
    robots: { index: true, follow: true },
  };
}

/** Lista de marcadores: um ponto de acento, sem ícone inventado. */
function Marcadores({ itens }: { itens: string[] }) {
  return (
    <ul role="list" className="mt-4 space-y-3">
      {itens.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-relaxed text-fg-secondary">
          <span
            aria-hidden="true"
            className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent-indigo"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function ApoiePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "support" });

  return (
    <PageShell
      title={t("title")}
      intro={t("intro")}
      actions={
        <>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center rounded-lg bg-accent-indigo px-6 py-2.5 text-sm font-semibold text-accent-indigo-foreground transition-[filter] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-indigo"
          >
            {t("apoiadorCta")}
          </Link>
          <SupportCta
            href={mailto(t("contactParceiro"))}
            audience="parceiro"
            className="inline-flex items-center justify-center rounded-lg border border-surface-border px-6 py-2.5 text-sm font-semibold text-fg-primary transition-colors hover:border-accent-indigo/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-indigo"
          >
            {t("parceiroCta")}
          </SupportCta>
        </>
      }
    >
      <SectionBlock title={t("whyTitle")} id="por-que">
        <Marcadores itens={[t("why1"), t("why2"), t("why3")]} />
        <p className="mt-4 max-w-[65ch] text-xs text-fg-muted">
          <Link href="/methodology" className="underline underline-offset-4 hover:text-fg-primary">
            MEDIA Score™
          </Link>
          {" · "}
          <Link href="/sources" className="underline underline-offset-4 hover:text-fg-primary">
            {t("sourcesLabel")}
          </Link>
        </p>
      </SectionBlock>

      <SectionBlock title={t("apoiadorTitle")} id="apoiador">
        <p className="max-w-[65ch] text-base leading-relaxed text-fg-primary">{t("apoiadorWho")}</p>
        <p className="mt-3 max-w-[65ch] text-sm leading-relaxed text-fg-secondary">
          {t("apoiadorHow")}
        </p>
        <Marcadores itens={[t("apoiadorExtra"), t("recognition")]} />
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center rounded-lg bg-accent-indigo px-6 py-2.5 text-sm font-semibold text-accent-indigo-foreground transition-[filter] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-indigo"
          >
            {t("apoiadorCta")}
          </Link>
          <SupportCta
            href={mailto(t("contactApoiador"))}
            audience="apoiador"
            className="inline-flex items-center justify-center rounded-lg border border-surface-border px-6 py-2.5 text-sm font-semibold text-fg-primary transition-colors hover:border-accent-indigo/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-indigo"
          >
            {t("apoiadorCtaSecondary")}
          </SupportCta>
        </div>
      </SectionBlock>

      <SectionBlock title={t("parceiroTitle")} id="parceiro">
        <p className="max-w-[65ch] text-base leading-relaxed text-fg-primary">{t("parceiroWho")}</p>
        <p className="mt-3 max-w-[65ch] text-sm leading-relaxed text-fg-secondary">
          {t("parceiroHow")}
        </p>
        <Marcadores itens={[t("parceiroExtra"), t("humanNote")]} />
        <div className="mt-6">
          <SupportCta
            href={mailto(t("contactParceiro"))}
            audience="parceiro"
            className="inline-flex items-center justify-center rounded-lg bg-surface-elevated px-6 py-2.5 text-sm font-semibold text-fg-primary border border-surface-border transition-colors hover:border-accent-indigo/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-indigo"
          >
            {t("parceiroCta")}
          </SupportCta>
        </div>
      </SectionBlock>

      <SectionBlock title={t("patrocinadorTitle")} id="patrocinador">
        <p className="max-w-[65ch] text-base leading-relaxed text-fg-primary">
          {t("patrocinadorWho")}
        </p>
        <p className="mt-3 max-w-[65ch] text-sm leading-relaxed text-fg-secondary">
          {t("patrocinadorHow")}
        </p>
        <Marcadores itens={[t("patrocinadorExtra")]} />
        <div className="mt-6">
          <SupportCta
            href={mailto(t("contactPatrocinador"))}
            audience="patrocinador"
            className="inline-flex items-center justify-center rounded-lg bg-surface-elevated px-6 py-2.5 text-sm font-semibold text-fg-primary border border-surface-border transition-colors hover:border-accent-indigo/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-indigo"
          >
            {t("patrocinadorCta")}
          </SupportCta>
        </div>
      </SectionBlock>

      <SectionBlock title={t("independenceTitle")} id="regra">
        <p className="max-w-[65ch] rounded-xl border border-accent-indigo/20 bg-surface-card p-6 text-sm leading-relaxed text-fg-secondary">
          {t("independenceBody")}
        </p>
        <p className="mt-4 max-w-[65ch] text-xs leading-relaxed text-fg-muted">
          {t("concentrationNote")}
        </p>
      </SectionBlock>

      {/*
        Registro público: a regra acima só é verificável com isto. Lista vazia é o estado
        real de hoje — e "nenhum patrocínio ativo" é fato, não "em breve".
      */}
      <SectionBlock title={t("registryTitle")} id="registro">
        {PATROCINIOS.length === 0 ? (
          <p className="max-w-[65ch] text-sm leading-relaxed text-fg-secondary">
            {t("registryEmpty")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  <th
                    scope="col"
                    className="py-2 pr-4 font-heading text-xs uppercase tracking-widest text-fg-muted"
                  >
                    {t("registrySponsor")}
                  </th>
                  <th
                    scope="col"
                    className="py-2 pr-4 font-heading text-xs uppercase tracking-widest text-fg-muted"
                  >
                    {t("registrySection")}
                  </th>
                  <th
                    scope="col"
                    className="py-2 pr-4 font-heading text-xs uppercase tracking-widest text-fg-muted"
                  >
                    {t("registrySince")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...PATROCINIOS]
                  .sort((a, b) => b.desde.localeCompare(a.desde))
                  .map((p) => (
                    <tr
                      key={`${p.patrocinador}-${p.desde}`}
                      className="border-b border-surface-border/60"
                    >
                      <th scope="row" className="py-3 pr-4 font-medium text-fg-primary">
                        {p.patrocinador}
                      </th>
                      <td className="py-3 pr-4 text-fg-secondary">
                        {p.secao}
                        <span className="mt-1 block text-xs text-fg-muted">{p.rotulo}</span>
                      </td>
                      <td className="py-3 pr-4 tabular-nums text-fg-secondary">{p.desde}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionBlock>
    </PageShell>
  );
}
