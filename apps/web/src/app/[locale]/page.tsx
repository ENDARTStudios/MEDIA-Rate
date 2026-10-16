import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/navigation";
import type { Metadata } from "next";
import { HeroSection } from "../../components/HeroSection";
import { ContinueDecision } from "../../components/ContinueDecision";
import { HomeStats } from "../../components/HomeStats";
import { LazyAnimatedHeading } from "../../components/lazy";
import { LayeredBackground } from "../../components/ui/layered-background";
import { StructuredData } from "@/components/StructuredData";
import {
  localeOpenGraph,
  localizedAlternates,
  localizedUrl,
  OG_IMAGE_PADRAO,
  siteUrl,
} from "@/lib/seo";
import { getCatalog } from "@/lib/api";
// D-209/T191: contagem e nomes de fontes são DERIVADOS do registro — o hero
// nunca volta a exibir número hardcoded nem lista fixa de 6 nomes.
import { FONTES_ATIVAS, NUM_FONTES_ATIVAS } from "@/lib/sources";
import { HomeContentSections } from "@/components/HomeContentSections";
import { DecisionHighlights } from "@/components/DecisionHighlights";
import { BecauseYouConsumed } from "@/components/discovery/BecauseYouConsumed";
import { MediaCarousel, mapToMediaItem } from "@/components/media-rate-ui/MediaCarousel";
import { bandKey } from "@/components/media-rate-ui/score-dial-core";

// T405 (D-380): MediaCarousel agora é SERVER COMPONENT (import estático) —
// os 60 cards saem como HTML puro no SSR, sem hidratação do shell.

// T447/D-441 (era T274/60s): ISR horário — o score-job roda 1×/semana
// (D-410), logo revalidar a cada 60s eram ~10 mil renders/mês por região
// para dado semanal. Scores novos entram via gatilho on-demand
// (POST /api/revalidate, chamado pelo score-job ao concluir).
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const tm = await getTranslations({ locale, namespace: "common" });
  const th = await getTranslations({ locale, namespace: "home" });
  return {
    title: th("metaTitle"),
    description: th("metaDescription"),
    alternates: {
      canonical: localizedUrl(locale),
      languages: localizedAlternates(),
    },
    robots: { index: true, follow: true },
    openGraph: {
      title: th("metaOgTitle"),
      description: th("metaOgDescription"),
      url: localizedUrl(locale),
      locale: localeOpenGraph(locale),
      siteName: tm("appName"),
      type: "website",
      // T406: og:image de marca (o openGraph da página substitui o do layout).
      images: OG_IMAGE_PADRAO,
    },
    twitter: {
      card: "summary",
      title: th("metaOgTitle"),
      description: th("metaOgDescription"),
    },
  };
}

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing");
  const tNav = await getTranslations("nav");
  const th = await getTranslations("home");
  const tCatalog = await getTranslations("catalog");
  const tHome = await getTranslations("home");
  const tWatchlist = await getTranslations("watchlist");
  const tInteraction = await getTranslations("interaction");
  const tScoreDial = await getTranslations("scoredial");
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    "url": siteUrl,
    "name": "MEDIA Rate",
    "inLanguage": locale,
    "publisher": { "@id": `${siteUrl}/#organization` },
  };
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    "url": siteUrl,
    "name": "MEDIA Rate",
    "description": th("metaDescription"),
    "foundingDate": "2025",
  };

  // T274: os carrosséis ativos buscam no server (ISR) e hidratam o cliente —
  // o HTML SSR já sai com os títulos, sem depender de JS para o primeiro
  // paint/crawlers. Ordem/limite idênticos ao queryFn do MediaCarousel.
  const [carouselMovie, carouselSeries, carouselGame, carouselBook, carouselComic, carouselManga] =
    await Promise.all([
      getCatalog({ type: "movie", sort: "score", order: "desc", limit: 10 }),
      getCatalog({ type: "series", sort: "score", order: "desc", limit: 10 }),
      getCatalog({ type: "game", sort: "score", order: "desc", limit: 10 }),
      getCatalog({ type: "book", sort: "score", order: "desc", limit: 10 }),
      getCatalog({ type: "comic", sort: "score", order: "desc", limit: 10 }),
      getCatalog({ type: "manga", sort: "score", order: "desc", limit: 10 }),
    ]);
  const carousels = {
    movie: carouselMovie,
    series: carouselSeries,
    game: carouselGame,
    book: carouselBook,
    comic: carouselComic,
    manga: carouselManga,
  } as const;

  return (
    <LayeredBackground>
      <StructuredData data={[websiteJsonLd, orgJsonLd]} />
      <HeroSection
        title={t("hero")}
        subtitle={t("heroSubtitle")}
        cta={t("cta")}
        ctaHref="/register"
        ctaSecondary={t("ctaSecondary")}
        ctaSecondaryHref="/catalog"
        ctaHint={t("ctaHint")}
        categoriesLabel={t("categoriesLabel")}
        proofTitle={t("proofTitle")}
        proofBody={t("proofBody")}
        criticLabel={tScoreDial("critic")}
        audienceLabel={tScoreDial("audience")}
        consensusLabel={tScoreDial("consensus")}
        sourcesLabel={t("sourcesLabel", { count: NUM_FONTES_ATIVAS })}
        sourceNames={FONTES_ATIVAS.map((fonte) => fonte.nome)}
        scoreScaleLabels={tScoreDial.raw("bands")}
        searchLabel={t("heroSearch")}
        searchCta={t("heroSearchCta")}
        topItem={(() => {
          // D-646: o selo do hero mostra a obra REAL de melhor nota entre os seis tipos — as
          // mesmas chamadas que alimentam os carrosséis. Sem dado, o selo simplesmente não é montado.
          const rotulos: Record<string, string> = {
            movie: tCatalog("filme"),
            series: tCatalog("serie"),
            game: tCatalog("game"),
            book: tCatalog("livro"),
            comic: tCatalog("comic"),
            manga: tCatalog("manga"),
          };
          const melhor = (["movie", "series", "game", "book", "comic", "manga"] as const)
            .flatMap((type) =>
              (carousels[type]?.items ?? [])
                .map(mapToMediaItem)
                .filter((m) => typeof m.score === "number")
                .map((m) => ({ titulo: m.titulo, score: m.score as number, tipo: rotulos[type] })),
            )
            .sort((a, b) => b.score - a.score)[0];
          return melhor
            ? { ...melhor, faixa: tScoreDial.raw("bands")[bandKey(melhor.score)] }
            : undefined;
        })()}
        scoreShowcaseLabel={tScoreDial("showcase")}
        scoreShowcaseItems={(
          [
            ["movie", tCatalog("filme")],
            ["series", tCatalog("serie")],
            ["game", tCatalog("game")],
            ["book", tCatalog("livro")],
            ["comic", tCatalog("comic")],
            ["manga", tCatalog("manga")],
          ] as const
        ).flatMap(([type, tipo]) => {
          // D-643: o ciclo do selo usa OBRA REAL — mesmo mapeamento do carrossel (uma só
          // fonte) e descarte de item sem nota. Nada de valor de enfeite (D-583.4).
          const primeiro = (carousels[type]?.items ?? []).map(mapToMediaItem)[0];
          return primeiro && typeof primeiro.score === "number"
            ? [{ titulo: primeiro.titulo, score: primeiro.score, tipo }]
            : [];
        })}
      />

      <HomeStats />

      <ContinueDecision />

      {/* T199 (Addendum 3 §3.2): seção logada acima dos carrosséis —
          cross-mídia por definição; vazia para visitante. */}
      <BecauseYouConsumed />

      {/* 6 carrosséis na ordem dos ícones do hero (T185) — server components
          com initialData do server (ISR); cards sem hidratação (D-380). */}
      <MediaCarousel
        type="movie"
        initialData={carousels.movie}
        tCatalog={tCatalog}
        tWatchlist={tWatchlist}
        tInteraction={tInteraction}
        locale={locale}
      />
      <MediaCarousel
        type="series"
        initialData={carousels.series}
        tCatalog={tCatalog}
        tWatchlist={tWatchlist}
        tInteraction={tInteraction}
        locale={locale}
      />
      <MediaCarousel
        type="game"
        initialData={carousels.game}
        tCatalog={tCatalog}
        tWatchlist={tWatchlist}
        tInteraction={tInteraction}
        locale={locale}
      />
      <MediaCarousel
        type="book"
        initialData={carousels.book}
        tCatalog={tCatalog}
        tWatchlist={tWatchlist}
        tInteraction={tInteraction}
        locale={locale}
      />
      <MediaCarousel
        type="comic"
        initialData={carousels.comic}
        tCatalog={tCatalog}
        tWatchlist={tWatchlist}
        tInteraction={tInteraction}
        locale={locale}
      />
      <MediaCarousel
        type="manga"
        initialData={carousels.manga}
        tCatalog={tCatalog}
        tWatchlist={tWatchlist}
        tInteraction={tInteraction}
        locale={locale}
      />

      {/* D-646 — "Por decisão, não por prateleira": blocos por FAIXA, com obras reais do
          catálogo (as mesmas que alimentam os carrosséis). A seção não é montada se não houver
          item: caixa vazia e título inventado estão fora (D-583.4). */}
      <DecisionHighlights
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"
        title={tHome("decisionTitle")}
        sub={tHome("decisionSub")}
        ctaLabel={tHome("decisionCta")}
        notaTitulo={tHome("decisionNotaTitle")}
        notaTexto={tHome("decisionNotaBody")}
        stepsTitle={tHome("howTitle")}
        steps={[
          { n: "1", titulo: tHome("howStep1Title"), descricao: tHome("howStep1Body") },
          { n: "2", titulo: tHome("howStep2Title"), descricao: tHome("howStep2Body") },
          { n: "3", titulo: tHome("howStep3Title"), descricao: tHome("howStep3Body") },
        ]}
        blocks={(() => {
          const rotulos: Record<string, string> = {
            movie: tCatalog("filme"),
            series: tCatalog("serie"),
            game: tCatalog("game"),
            book: tCatalog("livro"),
            comic: tCatalog("comic"),
            manga: tCatalog("manga"),
          };
          const todos = (["movie", "series", "game", "book", "comic", "manga"] as const).flatMap(
            (type) =>
              (carousels[type]?.items ?? [])
                .map(mapToMediaItem)
                .filter((m) => typeof m.score === "number")
                .map((m) => ({
                  titulo: m.titulo,
                  score: m.score as number,
                  tipo: rotulos[type],
                })),
          );
          const bands = tScoreDial.raw("bands");
          const blocos = [
            { faixa: "9" as const, chave: "9" },
            { faixa: "8" as const, chave: "8" },
            { faixa: "7" as const, chave: "7" },
          ];
          return blocos.map((b) => ({
            faixa: b.faixa,
            faixaLabel: bands[b.faixa],
            titulo: tHome(`decisionBlock${b.chave}Title`),
            descricao: tHome(`decisionBlock${b.chave}Body`),
            itens: todos.filter((m) => bandKey(m.score) === b.faixa).slice(0, 3),
          }));
        })()}
      />

      <section className="border-t border-[rgba(129,140,248,0.08)] px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <LazyAnimatedHeading
            as="h2"
            className="mb-6 font-heading text-3xl font-bold text-[#F5F5F7]"
          >
            {t("cta")}
          </LazyAnimatedHeading>
          <p className="mb-8 leading-relaxed text-[#A0A0B8]">{th("ctaText")}</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-lg bg-[#E11D48] px-8 py-3.5 text-sm font-semibold text-white transition-[filter] hover:brightness-110"
          >
            {tNav("register")}
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
        </div>
      </section>

      <HomeContentSections locale={locale} />
    </LayeredBackground>
  );
}
