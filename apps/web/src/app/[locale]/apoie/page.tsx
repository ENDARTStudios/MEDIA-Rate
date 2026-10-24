import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  ShieldCheck,
  FileSearch,
  EyeOff,
  HeartHandshake,
  Landmark,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import { PageShell, SectionBlock } from "@/components/ui/page-shell";
import { SupportCta } from "@/components/support/SupportCta";
import { PATROCINIOS, type Patrocinio } from "@/lib/sponsorships";

/**
 * UAT-46 — registro público da API (Admin alimenta pela Gestão de Usuários).
 * Revalidado a cada 5 min; qualquer falha cai na lista estática (vazia hoje).
 */
async function buscarPatrocinios(): Promise<Patrocinio[]> {
  const base = process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:4000";
  try {
    const res = await fetch(`${base}/api/v1/patrocinios`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return PATROCINIOS;
    const dados = (await res.json()) as Patrocinio[];
    return Array.isArray(dados) ? dados : PATROCINIOS;
  } catch {
    return PATROCINIOS;
  }
}
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
 * Desenho (revisado após captura em 1440): os três públicos eram seções empilhadas de
 * texto e pareciam um documento, não três portas. Agora são **três cartões lado a lado**
 * com ícone próprio, cada um com a sua âncora (`#apoiador`, `#parceiro`,
 * `#patrocinador`) — a página usa a largura e a escolha fica visível na primeira dobra
 * depois do hero.
 *
 * Regras que a página respeita (e que o `conceito-rotas` cobra):
 * - PageShell + SectionBlock, tokens só, sem hex, `rounded-xl` como raio máximo;
 * - ícones são Lucide (nunca emoji, nunca SVG ad-hoc);
 * - nenhum número de marketing digitado (D-583.4) — as provas vivem em /methodology
 *   e /sources, que são linkados;
 * - nenhum logo, depoimento ou contagem de apoiadores: nada disso existe ainda, e
 *   inventar prova é o que o `home-truthfulness` barra;
 * - CTA de contato é `mailto:` com assunto próprio por público — sem formulário que
 *   prometa prazo que não depende de nós.
 */

/**
 * Um endereço por público — o mesmo e-mail institucional com alias de assunto, para a
 * caixa de entrada já chegar triada e o contador de cada programa ser lido separado.
 *
 * `apoiador` continua no alias geral (`+contato`), que é o mesmo do rodapé e do
 * /feedback: apoio pontual de pessoa física não tem fila própria, e um alias inventado
 * aqui seria endereço que ninguém lê.
 */
const CONTATOS = {
  apoiador: "endart.studios+contato@gmail.com",
  parceiro: "endart.studios+parcerias@gmail.com",
  patrocinador: "endart.studios+patrocinio@gmail.com",
} as const;

const mailto = (para: string, assunto: string) =>
  `mailto:${para}?subject=${encodeURIComponent(assunto)}`;

/** Classes de CTA repetidas: botão primário (ação) e secundário (conversa). */
const CTA_PRIMARIO =
  "inline-flex items-center justify-center rounded-lg bg-accent-indigo px-5 py-3 text-sm font-semibold text-accent-indigo-foreground transition-[filter] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-indigo";
const CTA_SECUNDARIO =
  "inline-flex items-center justify-center rounded-lg border border-surface-border px-5 py-3 text-sm font-semibold text-fg-primary transition-colors hover:border-accent-indigo/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-indigo";

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

/** Um cartão de motivo: ícone Lucide, título curto e uma frase. */
function CartaoMotivo({
  Icone,
  titulo,
  texto,
}: {
  Icone: LucideIcon;
  titulo: string;
  texto: string;
}) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-5">
      <Icone className="h-5 w-5 text-accent-indigo" aria-hidden="true" />
      <p className="mt-3 font-heading text-sm font-semibold text-fg-primary">{titulo}</p>
      <p className="mt-1 text-sm leading-relaxed text-fg-secondary">{texto}</p>
    </div>
  );
}

/** Um cartão de público: o "portal" de cada tipo de apoio. */
function CartaoPublico({
  id,
  Icone,
  titulo,
  quem,
  como,
  extra,
  children,
}: {
  id: string;
  Icone: LucideIcon;
  titulo: string;
  quem: string;
  como: string;
  extra: string;
  children: React.ReactNode;
}) {
  return (
    <article
      id={id}
      className="flex scroll-mt-24 flex-col rounded-xl border border-surface-border bg-surface-card p-6 transition-colors hover:border-accent-indigo/40"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent-indigo/10">
        <Icone className="h-5 w-5 text-accent-indigo" aria-hidden="true" />
      </span>
      <h3 className="mt-4 font-heading text-xl font-bold text-fg-primary">{titulo}</h3>
      <p className="mt-2 text-sm font-medium leading-relaxed text-fg-primary">{quem}</p>
      <p className="mt-2 text-sm leading-relaxed text-fg-secondary">{como}</p>
      <p className="mt-3 border-t border-surface-border pt-3 text-xs leading-relaxed text-fg-muted">
        {extra}
      </p>
      <div className="mt-auto flex flex-wrap gap-2 pt-5">{children}</div>
    </article>
  );
}

export default async function ApoiePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "support" });

  // UAT-46: o registro público vem da API (o Admin o alimenta pela Gestão de
  // Usuários). Sem API/em build, a fonte é a lista estática — o estado vazio é
  // o mesmo fato honesto de antes.
  const patrocinios = await buscarPatrocinios();

  return (
    <PageShell
      title={t("title")}
      intro={t("intro")}
      actions={
        <>
          <Link href="/pricing" className={CTA_PRIMARIO}>
            {t("apoiadorCta")}
          </Link>
          <SupportCta
            href={mailto(CONTATOS.parceiro, t("contactParceiro"))}
            audience="parceiro"
            className={CTA_SECUNDARIO}
          >
            {t("parceiroCta")}
          </SupportCta>
        </>
      }
    >
      <SectionBlock title={t("whyTitle")} id="por-que">
        <div className="grid gap-4 md:grid-cols-3">
          <CartaoMotivo Icone={ShieldCheck} titulo={t("whyTitleNota")} texto={t("why1")} />
          <CartaoMotivo Icone={FileSearch} titulo={t("whyTitleMetodologia")} texto={t("why2")} />
          <CartaoMotivo Icone={EyeOff} titulo={t("whyTitleSemAnuncio")} texto={t("why3")} />
        </div>
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

      <SectionBlock title={t("formasTitle")} id="formas">
        <div className="grid gap-5 lg:grid-cols-3">
          <CartaoPublico
            id="apoiador"
            Icone={HeartHandshake}
            titulo={t("apoiadorTitle")}
            quem={t("apoiadorWho")}
            como={t("apoiadorHow")}
            extra={`${t("apoiadorExtra")} ${t("recognition")}`}
          >
            <Link href="/pricing" className={CTA_PRIMARIO}>
              {t("apoiadorCta")}
            </Link>
            <SupportCta
              href={mailto(CONTATOS.apoiador, t("contactApoiador"))}
              audience="apoiador"
              className={CTA_SECUNDARIO}
            >
              {t("apoiadorCtaSecondary")}
            </SupportCta>
          </CartaoPublico>

          <CartaoPublico
            id="parceiro"
            Icone={Landmark}
            titulo={t("parceiroTitle")}
            quem={t("parceiroWho")}
            como={t("parceiroHow")}
            extra={`${t("parceiroExtra")} ${t("humanNote")}`}
          >
            <SupportCta
              href={mailto(CONTATOS.parceiro, t("contactParceiro"))}
              audience="parceiro"
              className={CTA_PRIMARIO}
            >
              {t("parceiroCta")}
            </SupportCta>
          </CartaoPublico>

          <CartaoPublico
            id="patrocinador"
            Icone={Megaphone}
            titulo={t("patrocinadorTitle")}
            quem={t("patrocinadorWho")}
            como={t("patrocinadorHow")}
            extra={t("patrocinadorExtra")}
          >
            <SupportCta
              href={mailto(CONTATOS.patrocinador, t("contactPatrocinador"))}
              audience="patrocinador"
              className={CTA_PRIMARIO}
            >
              {t("patrocinadorCta")}
            </SupportCta>
          </CartaoPublico>
        </div>
      </SectionBlock>

      {/* A regra é o ativo da página: faixa larga, tipo maior, sem competir com CTA. */}
      <SectionBlock title={t("independenceTitle")} id="regra">
        <div className="scroll-mt-24 rounded-xl border border-accent-indigo/30 bg-accent-indigo/5 p-8">
          <p className="max-w-[52ch] font-heading text-lg font-semibold leading-relaxed text-fg-primary sm:text-xl">
            {t("independenceBody")}
          </p>
          <p className="mt-4 max-w-[65ch] text-xs leading-relaxed text-fg-muted">
            {t("concentrationNote")}
          </p>
        </div>
      </SectionBlock>

      {/*
        Registro público: a regra acima só é verificável com isto. Lista vazia é o estado
        real de hoje — e "nenhum patrocínio ativo" é fato, não "em breve".
      */}
      <SectionBlock title={t("registryTitle")} id="registro">
        {patrocinios.length === 0 ? (
          <div className="scroll-mt-24 rounded-xl border border-dashed border-surface-border bg-surface-card p-6">
            <p className="max-w-[65ch] text-sm leading-relaxed text-fg-secondary">
              {t("registryEmpty")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-surface-border bg-surface-card">
            <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  <th
                    scope="col"
                    className="px-4 py-3 font-heading text-xs uppercase tracking-widest text-fg-muted"
                  >
                    {t("registrySponsor")}
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 font-heading text-xs uppercase tracking-widest text-fg-muted"
                  >
                    {t("registrySection")}
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 font-heading text-xs uppercase tracking-widest text-fg-muted"
                  >
                    {t("registrySince")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...patrocinios]
                  .sort((a, b) => b.desde.localeCompare(a.desde))
                  .map((p) => (
                    <tr
                      key={`${p.patrocinador}-${p.desde}`}
                      className="border-b border-surface-border/60 last:border-0"
                    >
                      <th scope="row" className="px-4 py-3 font-medium text-fg-primary">
                        {p.patrocinador}
                      </th>
                      <td className="px-4 py-3 text-fg-secondary">
                        {p.secao}
                        <span className="mt-1 block text-xs text-fg-muted">{p.rotulo}</span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-fg-secondary">{p.desde}</td>
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
