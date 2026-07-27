import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import type { Metadata } from "next";
import { HeroSection } from "../../components/HeroSection";
import { MediaRail } from "../../components/MediaRail";
import { LazyAnimatedHeading } from "../../components/lazy";
import { LayeredBackground } from "../../components/ui/layered-background";
import { HomeVerticalMarquee } from "../../components/HomeVerticalMarquee";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "MEDIA Rate — Descubra o que assistir, jogar e ler",
    description: "Plataforma de descoberta de mídia com MEDIA Score™ unificado para filmes, séries, games e livros.",
    openGraph: { title: "MEDIA Rate", description: "Score unificado de entretenimento.", siteName: "MEDIA Rate", type: "website" },
  };
}

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing");
  const tNav = await getTranslations("nav");

  return (
    <LayeredBackground>
      <div className="flex">
        <div className="flex-1 min-w-0">
          <HeroSection
            title={t("hero")}
            subtitle={t("heroSubtitle")}
            cta={t("cta")}
            ctaHref="/register"
          />

          <MediaRail mediaType="FILME" />
          <MediaRail mediaType="SERIE" />
          <MediaRail mediaType="GAME" />

          <section className="py-20 px-4 border-t border-[rgba(129,140,248,0.08)]">
            <div className="max-w-2xl mx-auto text-center">
              <LazyAnimatedHeading as="h2" className="font-heading text-3xl font-bold mb-6 text-[#EDE7DC]">
                {t("cta")}
              </LazyAnimatedHeading>
              <p className="text-[#9CA3AF] mb-8 leading-relaxed">Comece agora e descubra seu próximo título favorito. Gratuito.</p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-[#818CF8] text-[#0F172A] font-semibold text-sm hover:brightness-110 transition-all"
              >
                {tNav("register")}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </section>
        </div>

        <HomeVerticalMarquee />
      </div>
    </LayeredBackground>
  );
}
