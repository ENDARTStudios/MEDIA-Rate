import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import type { Metadata } from "next";
import { HeroSection } from "../../components/HeroSection";
import { FeaturedRail } from "../../components/FeaturedRail";
import { LazyAnimatedHeading, LazyScrollReveal } from "../../components/lazy";
import { LayeredBackground } from "../../components/ui/layered-background";

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
      <div className="flex flex-col">
        <HeroSection
          title={t("hero")}
          subtitle={t("heroSubtitle")}
          cta={t("cta")}
          ctaHref="/register"
        />

        <FeaturedRail />

        <section className="py-20 px-4" aria-labelledby="features-title">
          <div className="max-w-6xl mx-auto">
            <LazyAnimatedHeading
              id="features-title"
              className="font-heading text-3xl font-bold text-center mb-14 text-[#EDE7DC]"
            >
              {t("features")}
            </LazyAnimatedHeading>
            <LazyScrollReveal className="grid md:grid-cols-3 gap-6" stagger={0.08}>
              <article className="text-center p-8 bg-[#11111E] border border-[rgba(129,140,248,0.08)] rounded-md">
                <div className="w-14 h-14 mx-auto bg-[#818CF8]/10 rounded-md flex items-center justify-center mb-5">
                  <svg className="w-7 h-7 text-[#818CF8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="font-heading text-lg font-semibold mb-3 text-[#EDE7DC]">{t("feature1")}</h3>
                <p className="text-sm text-[#9CA3AF] leading-relaxed">{t("feature1Desc")}</p>
              </article>
              <article className="text-center p-8 bg-[#11111E] border border-[rgba(129,140,248,0.08)] rounded-md">
                <div className="w-14 h-14 mx-auto bg-[#38BDF8]/10 rounded-md flex items-center justify-center mb-5">
                  <svg className="w-7 h-7 text-[#38BDF8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <h3 className="font-heading text-lg font-semibold mb-3 text-[#EDE7DC]">{t("feature2")}</h3>
                <p className="text-sm text-[#9CA3AF] leading-relaxed">{t("feature2Desc")}</p>
              </article>
              <article className="text-center p-8 bg-[#11111E] border border-[rgba(129,140,248,0.08)] rounded-md">
                <div className="w-14 h-14 mx-auto bg-[#F59E0B]/10 rounded-md flex items-center justify-center mb-5">
                  <svg className="w-7 h-7 text-[#F59E0B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h3 className="font-heading text-lg font-semibold mb-3 text-[#EDE7DC]">{t("feature3")}</h3>
                <p className="text-sm text-[#9CA3AF] leading-relaxed">{t("feature3Desc")}</p>
              </article>
            </LazyScrollReveal>
          </div>
        </section>

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
    </LayeredBackground>
  );
}
