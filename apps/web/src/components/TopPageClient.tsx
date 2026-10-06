"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import {
  normalizeDisplayScore,
  escalaPorTipo,
  maxDaEscala,
  formatarScoreLocale,
} from "@/lib/score-utils";
import type { MediaType } from "@/lib/types";
import type { TopPorTipoPayload, TopMidia } from "@/lib/api";

/**
 * T162 (Onda A — Rankings): hub /top por tipo — banner do Nº 1, TOP 10
 * numerado, lançamentos do ano corrente, "por onde começar" (franquias com
 * ordem) e categorias (gêneros). Score SEMPRE pelo pipeline score-utils
 * (T147 — mangá nunca /100; truncamento, sem arredondamento).
 */

const TIPOS_UI: { slug: MediaType; labelKey: string }[] = [
  { slug: "movie", labelKey: "filme" },
  { slug: "series", labelKey: "serie" },
  { slug: "game", labelKey: "game" },
  { slug: "book", labelKey: "livro" },
  { slug: "manga", labelKey: "manga" },
  { slug: "comic", labelKey: "comic" },
];

/** Cadeia canônica D-369 condensada: pt→titulo; en→titulo_en→original→titulo; es→es→en→original→titulo. */
function tituloExibicao(item: TopMidia, locale: string): string {
  const lang = locale.split("-")[0];
  if (lang === "en") return item.titulo_en || item.titulo_original || item.titulo;
  if (lang === "es") return item.titulo_es || item.titulo_en || item.titulo_original || item.titulo;
  return item.titulo;
}

/** Valor já na escala nativa, formatado pelo locale — ex.: "8,7/10" ou "87/100". */
function scoreExibido(item: TopMidia, locale: string): string | null {
  if (item.score == null) return null;
  const escala = escalaPorTipo(item.tipo);
  const valor = formatarScoreLocale(normalizeDisplayScore(item.score, item.tipo), locale);
  return `${valor}/${maxDaEscala(escala)}`;
}

function numFontes(item: TopMidia): number {
  return item.num_fontes ?? 0;
}

/** Card leve de pôster (grid de lançamentos) — sem o peso do MediaCard (watchlist/animejs). */
function TopCard({ item, locale }: { item: TopMidia; locale: string }) {
  return (
    <Link
      href={`/media/${item.slug ?? item.id}`}
      className="group block bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden"
      data-testid="top-card"
    >
      {item.imagem_url && (
        <img
          src={item.imagem_url}
          alt=""
          className="w-full aspect-[2/3] object-cover"
          loading="lazy"
        />
      )}
      <div className="p-3">
        <p className="font-semibold text-sm leading-snug group-hover:underline line-clamp-2">
          {tituloExibicao(item, locale)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center justify-between">
          <span>{item.ano_lancamento ?? ""}</span>
          {scoreExibido(item, locale) && (
            <span className="font-bold text-gray-900 dark:text-gray-100">
              {scoreExibido(item, locale)}
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}

export function TopPageClient({
  tipo,
  payload,
}: {
  tipo: MediaType;
  payload: TopPorTipoPayload | null;
}) {
  const t = useTranslations("top");
  const tCat = useTranslations("catalog");
  const locale = useLocale();

  const hero = payload?.top?.[0] ?? null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{t("subtitle")}</p>
      </header>

      {/* Abas por tipo — links canônicos /top?type=… (mesmos slugs do catálogo). */}
      <nav aria-label={t("title")} className="flex flex-wrap gap-2 mb-8" data-testid="top-tabs">
        {TIPOS_UI.map(({ slug, labelKey }) => (
          <Link
            key={slug}
            href={`/top?type=${slug}`}
            aria-current={slug === tipo ? "page" : undefined}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              slug === tipo
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            {tCat(labelKey)}
          </Link>
        ))}
      </nav>

      {!payload ? (
        <p className="py-16 text-center text-gray-500" data-testid="top-erro">
          {t("erro")}
        </p>
      ) : payload.top.length === 0 ? (
        <p className="py-16 text-center text-gray-500" data-testid="top-vazio">
          {t("empty")}
        </p>
      ) : (
        <div className="space-y-12">
          {/* Banner do Nº 1 */}
          {hero && (
            <section
              aria-label={t("heroBadge")}
              data-testid="top-hero"
              className="relative rounded-2xl overflow-hidden"
              style={{
                backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.25) 100%)${
                  hero.backdrop_url || hero.imagem_url
                    ? `, url("${hero.backdrop_url || hero.imagem_url}")`
                    : ""
                }`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                minHeight: "340px",
              }}
            >
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 text-white">
                <span className="inline-block px-3 py-1 rounded-full bg-amber-400 text-amber-950 text-xs font-bold uppercase tracking-wide mb-3">
                  {t("heroBadge")}
                </span>
                <h2 className="text-2xl sm:text-4xl font-bold leading-tight">
                  <Link href={`/media/${hero.slug ?? hero.id}`} className="hover:underline">
                    {tituloExibicao(hero, locale)}
                  </Link>
                </h2>
                <p className="mt-2 text-sm text-gray-200 flex flex-wrap items-center gap-3">
                  {hero.ano_lancamento && <span>{hero.ano_lancamento}</span>}
                  {scoreExibido(hero, locale) && (
                    <span className="font-semibold" data-testid="top-hero-score">
                      {scoreExibido(hero, locale)}
                    </span>
                  )}
                  {numFontes(hero) > 0 && <span>{t("fontes", { count: numFontes(hero) })}</span>}
                </p>
              </div>
            </section>
          )}

          {/* TOP 10 numerado */}
          <section aria-labelledby="top10-title" data-testid="top-lista">
            <h2 id="top10-title" className="text-xl font-semibold mb-4">
              {t("top10")}
            </h2>
            <ol className="space-y-3">
              {payload.top.map((item, i) => (
                <li
                  key={item.id}
                  className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-3"
                >
                  <span
                    className="w-8 text-2xl font-bold text-gray-400 dark:text-gray-500 text-center shrink-0"
                    aria-label={`${i + 1}`}
                  >
                    {i + 1}
                  </span>
                  {item.imagem_url && (
                    <img
                      src={item.imagem_url}
                      alt=""
                      className="w-12 h-18 object-cover rounded-md shrink-0"
                      loading="lazy"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/media/${item.slug ?? item.id}`}
                      className="font-semibold hover:underline"
                    >
                      {tituloExibicao(item, locale)}
                    </Link>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {item.ano_lancamento ?? ""}
                      {numFontes(item) > 0 ? ` · ${t("fontes", { count: numFontes(item) })}` : ""}
                    </p>
                  </div>
                  {scoreExibido(item, locale) && (
                    <span className="text-lg font-bold shrink-0">{scoreExibido(item, locale)}</span>
                  )}
                </li>
              ))}
            </ol>
          </section>

          {/* Lançamentos do ano corrente */}
          {payload.lancamentos_ano.length > 0 && (
            <section aria-labelledby="top-lancamentos-title" data-testid="top-lancamentos">
              <h2 id="top-lancamentos-title" className="text-xl font-semibold mb-4">
                {t("lancamentos", { ano: payload.ano })}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {payload.lancamentos_ano.map((item) => (
                  <TopCard key={item.id} item={item} locale={locale} />
                ))}
              </div>
            </section>
          )}

          {/* Por onde começar cada universo */}
          {payload.franquias.length > 0 && (
            <section aria-labelledby="top-franquias-title" data-testid="top-franquias">
              <h2 id="top-franquias-title" className="text-xl font-semibold mb-1">
                {t("porOndeComecar")}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {t("porOndeComecarHint")}
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {payload.franquias.map((franquia) => (
                  <div
                    key={franquia.id}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5"
                  >
                    <h3 className="font-bold text-lg mb-3">{franquia.nome}</h3>
                    <ol className="space-y-2">
                      {franquia.itens.map((item, i) => (
                        <li key={item.id} className="flex items-baseline gap-3 text-sm">
                          <span className="font-bold text-gray-400 dark:text-gray-500 w-5 text-right shrink-0">
                            {i + 1}.
                          </span>
                          <span className="min-w-0 flex-1">
                            <Link
                              href={`/media/${item.slug ?? item.id}`}
                              className="hover:underline"
                            >
                              {tituloExibicao(item, locale)}
                            </Link>
                            {item.ordens?.cronologica != null &&
                              item.ordens.cronologica !== item.ordens.lancamento && (
                                <span className="text-xs text-gray-400 ml-2">
                                  {t("ordemCronologica", { n: item.ordens.cronologica })}
                                </span>
                              )}
                          </span>
                          {item.ano_lancamento && (
                            <span className="text-xs text-gray-400 shrink-0">
                              {item.ano_lancamento}
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Categorias (gêneros com contagem por tipo) */}
          {payload.generos.length > 0 && (
            <section aria-labelledby="top-categorias-title" data-testid="top-categorias">
              <h2 id="top-categorias-title" className="text-xl font-semibold mb-4">
                {t("categorias")}
              </h2>
              <div className="flex flex-wrap gap-2">
                {payload.generos.map((g) => (
                  <Link
                    key={g.id}
                    href={`/catalog?type=${tipo}&genero=${g.slug}`}
                    className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-sm hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    {g.nome} <span className="text-gray-400">({g.total_midias})</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
