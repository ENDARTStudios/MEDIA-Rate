import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { routing } from "../../i18n/routing";
import { localeOpenGraph } from "../../lib/seo";
import { AuthHeader } from "../../components/AuthHeader";
import { MotionFooter } from "../../components/MotionFooter";
import { LgpdBanner } from "../../components/LgpdBanner";
import { ConsentBanner } from "../../components/ConsentBanner";
import { DiagPanelLoader } from "../../components/DiagPanelLoader";
import { PageTransition } from "../../components/PageTransition";
import { QueryProvider } from "../../providers/query-provider";
import { PostHogProvider } from "../../components/PostHogProvider";
import { Toaster } from "sonner";
import "../globals.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mediarate.app";
  const th = await getTranslations({ locale, namespace: "home" });

  // Constroi alternates dinamicamente com base no roteamento
  const alternates: Record<string, string> = {};
  routing.locales.forEach((l) => {
    alternates[l] = `${baseUrl}/${l}`;
  });
  alternates["x-default"] = `${baseUrl}`;

  return {
    title: {
      template: "%s | MEDIA Rate",
      default: th("metaTitle"),
    },
    description: th("metaDescription"),
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: alternates,
    },
    openGraph: {
      siteName: "MEDIA Rate",
      // T273: og:locale exige underscore (pt_BR/en_US/es_ES), nunca hífen.
      locale: localeOpenGraph(locale),
      type: "website",
      // T406: fallback de og:image para TODAS as páginas sem imagem própria
      // (auditoria T403 achou og:image ausente em 11 páginas). URL absoluta
      // (Next.js não resolve og:image relativa sem metadataBase).
      images: [
        {
          url: `${baseUrl}/og-image.png`,
          width: 1200,
          height: 630,
          alt: "MEDIA Rate",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const t = await getTranslations("common");

  return (
    <QueryProvider>
      <NextIntlClientProvider>
        <PostHogProvider>
          <a href="#main" className="skip-link">
            {t("skipToContent")}
          </a>
          <AuthHeader />
          <main id="main" className="flex-1 min-h-[calc(100vh-4rem)]">
            <PageTransition>{children}</PageTransition>
          </main>
          <MotionFooter locale={locale} />
          <ConsentBanner />
          <Toaster theme="dark" position="top-right" />
          {/* DiagPanel: dynamic ssr:false + ErrorBoundary → nunca crasha a pagina */}
          <DiagPanelLoader />
        </PostHogProvider>
      </NextIntlClientProvider>
    </QueryProvider>
  );
}
