import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/navigation";
import type { Metadata } from "next";
import { HeroSection } from "../../components/HeroSection";
import { MediaCarousel } from "../../components/media-rate-ui/MediaCarousel";
import { ContinueDecision } from "../../components/ContinueDecision";
import { HomeStats } from "../../components/HomeStats";
import { LazyAnimatedHeading } from "../../components/lazy";
import { LayeredBackground } from "../../components/ui/layered-background";
import { HomeVerticalMarquee } from "../../components/HomeVerticalMarquee";
import { StructuredData } from "@/components/StructuredData";
import { localeOpenGraph, localizedAlternates, localizedUrl, siteUrl } from "@/lib/seo";
import { HomeContentSections } from "@/components/HomeContentSections";
import { BecauseYouConsumed } from "@/components/discovery/BecauseYouConsumed";

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

  return (
    <LayeredBackground>
      <StructuredData data={[websiteJsonLd, orgJsonLd]} />
      <div className="flex">
        <div className="flex-1 min-w-0">
          <HeroSection
            title={t("hero")}
            subtitle={t("heroSubtitle")}
            cta={t("cta")}
            ctaHref="/register"
          />

          <HomeStats />

          <ContinueDecision />

          {/* T199 (Addendum 3 §3.2): seção logada acima dos carrosséis —
              cross-mídia por definição; vazia para visitante. */}
          <BecauseYouConsumed />

          {/* 6 carrosséis na ordem dos ícones do hero (T185): ativos com
              MediaCard; Livro/HQ/Mangá em roadmap com cards bloqueados +
              waitlist capture. */}
          <MediaCarousel type="movie" />
          <MediaCarousel type="series" />
          <MediaCarousel type="game" />
          <MediaCarousel type="book" />
          <MediaCarousel type="comic" />
          <MediaCarousel type="manga" />

          <section className="py-20 px-4 border-t border-[rgba(129,140,248,0.08)]">
            <div className="max-w-2xl mx-auto text-center">
              <LazyAnimatedHeading
                as="h2"
                className="font-heading text-3xl font-bold mb-6 text-[#EDE7DC]"
              >
                {t("cta")}
              </LazyAnimatedHeading>
              <p className="text-[#9CA3AF] mb-8 leading-relaxed">{th("ctaText")}</p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-[#818CF8] text-[#0F172A] font-semibold text-sm hover:brightness-110 transition-all"
              >
                {tNav("register")}
                <svg
                  className="w-4 h-4"
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
        </div>

        <HomeVerticalMarquee />
      </div>
    </LayeredBackground>
  );
}
