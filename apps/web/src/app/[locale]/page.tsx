import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { HeroSection } from "../../components/HeroSection";
import { LazyAnimatedHeading, LazyScrollReveal } from "../../components/lazy";
import { TrendingMarquee } from "../../components/TrendingMarquee";

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing");
  const tNav = await getTranslations("nav");

  return (
    <div className="flex flex-col">
      <HeroSection
        title={t("hero")}
        subtitle={t("heroSubtitle")}
        cta={t("cta")}
        ctaHref="/register"
      />

      <TrendingMarquee />

      <section className="py-16 px-4" aria-labelledby="features-title">
        <div className="max-w-6xl mx-auto">
          <LazyAnimatedHeading
            id="features-title"
            className="text-3xl font-bold text-center mb-12 text-gray-100"
          >
            {t("features")}
          </LazyAnimatedHeading>
          <LazyScrollReveal className="grid md:grid-cols-3 gap-8" stagger={0.08}>
            <article className="text-center p-6 bg-surface-card rounded-lg shadow-card">
              <div className="w-12 h-12 mx-auto bg-primary-600 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-100">{t("feature1")}</h3>
              <p className="text-sm text-gray-400">{t("feature1Desc")}</p>
            </article>
            <article className="text-center p-6 bg-surface-card rounded-lg shadow-card">
              <div className="w-12 h-12 mx-auto bg-accent/10 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-100">{t("feature2")}</h3>
              <p className="text-sm text-gray-400">{t("feature2Desc")}</p>
            </article>
            <article className="text-center p-6 bg-surface-card rounded-lg shadow-card">
              <div className="w-12 h-12 mx-auto bg-primary-600 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-100">{t("feature3")}</h3>
              <p className="text-sm text-gray-400">{t("feature3Desc")}</p>
            </article>
          </LazyScrollReveal>
        </div>
      </section>

      <section className="py-16 px-4 bg-surface-elevated">
        <div className="max-w-4xl mx-auto text-center">
          <LazyAnimatedHeading as="h2" className="text-3xl font-bold mb-6 text-gray-100">
            {t("cta")}
          </LazyAnimatedHeading>
          <Link
            href="/register"
            className="inline-block bg-accent-600 text-white font-semibold px-8 py-3 rounded-lg hover:bg-accent-700 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-400 focus:ring-offset-2 focus:ring-offset-black"
          >
            {tNav("register")}
          </Link>
        </div>
      </section>
    </div>
  );
}
