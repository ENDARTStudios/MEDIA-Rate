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
import { getCatalog, getMediaBySlug } from "@/lib/api";
import { normalizeDisplayScore } from "@/lib/score-utils";
import { titleForLocale } from "@/lib/i18n-content";
import { HomeContentSections } from "@/components/HomeContentSections";
import { BecauseYouConsumed } from "@/components/discovery/BecauseYouConsumed";
import { MediaCarousel } from "@/components/media-rate-ui/MediaCarousel";
import type { ShowcaseItem } from "@/components/landing/ScoreShowcase";
import type { MediaType } from "@/lib/types";

// T405 (D-380): MediaCarousel agora é SERVER COMPONENT (import estático) —
// os 60 cards saem como HTML puro no SSR, sem hidratação do shell.

// T274: ISR curto (≤ 60s, alinhado ao cache Redis da API) — os carrosséis
// revalidam no servidor sem chamada nova por request.
export const revalidate = 60;

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

// T394: showcase da Hero cobre os 6 tipos (só game usa 0-100).
const SHOWCASE_ORDER: {
  api: "movie" | "series" | "game" | "book" | "comic" | "manga";
  key: "filme" | "serie" | "game" | "livro" | "comic" | "manga";
  scale: "0-10" | "0-100";
}[] = [
  { api: "movie", key: "filme", scale: "0-10" },
  { api: "series", key: "serie", scale: "0-10" },
  { api: "game", key: "game", scale: "0-100" },
  { api: "book", key: "livro", scale: "0-10" },
  { api: "comic", key: "comic", scale: "0-10" },
  { api: "manga", key: "manga", scale: "0-10" },
];

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing");
  const tNav = await getTranslations("nav");
  const th = await getTranslations("home");
  const tCatalog = await getTranslations("catalog");
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

  // T358: showcase da Hero — top-1 de cada categoria + detalhe (crítica/público/
  // fontes). Busca no server (ISR) para LCP seguro com a 1ª imagem priority.
  const tops = await Promise.all(
    SHOWCASE_ORDER.map((s) => getCatalog({ type: s.api, sort: "score", order: "desc", limit: 1 })),
  );
  const details = await Promise.all(
    tops.map((c) => (c.items[0]?.slug ? getMediaBySlug(c.items[0].slug) : Promise.resolve(null))),
  );
  const showcaseItems: ShowcaseItem[] = [];
  details.forEach((d, i) => {
    if (!d?.score) return;
    const order = SHOWCASE_ORDER[i];
    showcaseItems.push({
      title: titleForLocale(d, locale),
      posterUrl: d.posterUrl,
      type: d.type as MediaType,
      score: normalizeDisplayScore(d.score.consolidated, order.api),
      scale: order.scale,
      critics: d.score.criticsScore ?? null,
      audience: d.score.audienceScore ?? null,
      sources: (d.score.sources ?? []).map((s) => s.source),
      typeLabel: tCatalog(order.key),
    });
  });

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
        ctaTrust={t("ctaTrust")}
        showcaseItems={showcaseItems}
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
        locale={locale}
      />
      <MediaCarousel
        type="series"
        initialData={carousels.series}
        tCatalog={tCatalog}
        locale={locale}
      />
      <MediaCarousel type="game" initialData={carousels.game} tCatalog={tCatalog} locale={locale} />
      <MediaCarousel type="book" initialData={carousels.book} tCatalog={tCatalog} locale={locale} />
      <MediaCarousel
        type="comic"
        initialData={carousels.comic}
        tCatalog={tCatalog}
        locale={locale}
      />
      <MediaCarousel
        type="manga"
        initialData={carousels.manga}
        tCatalog={tCatalog}
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

      <HomeContentSections />
    </LayeredBackground>
  );
}
