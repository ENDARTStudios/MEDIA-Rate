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
import { HomeContentSections } from "@/components/HomeContentSections";
import { BecauseYouConsumed } from "@/components/discovery/BecauseYouConsumed";
import { MediaCarousel } from "@/components/media-rate-ui/MediaCarousel";

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
  const tWatchlist = await getTranslations("watchlist");
  const tInteraction = await getTranslations("interaction");
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
        eyebrow={t("heroEyebrow")}
        title={t("hero")}
        subtitle={t("heroSubtitle")}
        cta={t("cta")}
        ctaHref="/register"
        ctaSecondary={t("ctaSecondary")}
        ctaSecondaryHref="/catalog"
        sourcesLabel={t("sourcesLabel")}
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

      <section className="border-t border-[rgba(129,140,248,0.08)] px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <LazyAnimatedHeading
            as="h2"
            className="mb-6 font-heading text-3xl font-bold text-[#EDE7DC]"
          >
            {t("cta")}
          </LazyAnimatedHeading>
          <p className="mb-8 leading-relaxed text-[#9CA3AF]">{th("ctaText")}</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-lg bg-[#E11D48] px-8 py-3.5 text-sm font-semibold text-white transition-all hover:brightness-110"
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
