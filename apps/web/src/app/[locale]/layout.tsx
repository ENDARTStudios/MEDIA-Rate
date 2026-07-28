import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { routing } from "../../i18n/routing";
import { Navbar } from "../../components/Navbar";
import { MotionFooter } from "../../components/MotionFooter";
import { LgpdBanner } from "../../components/LgpdBanner";
import { DiagPanelLoader } from "../../components/DiagPanelLoader";
import { PageTransition } from "../../components/PageTransition";
import { QueryProvider } from "../../providers/query-provider";
import { Toaster } from "sonner";
import "../globals.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://media-rate-web.vercel.app';
  
  // Constroi alternates dinamicamente com base no roteamento
  const alternates: Record<string, string> = {};
  routing.locales.forEach((l) => {
    alternates[l] = `${baseUrl}/${l}`;
  });
  alternates['x-default'] = `${baseUrl}`;

  return {
    title: {
      template: '%s | MEDIA Rate',
      default: 'MEDIA Rate — Descubra o que assistir, jogar e ler',
    },
    description: "Plataforma de descoberta de mídia com MEDIA Score™ unificado para filmes, séries, games e livros.",
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: alternates,
    },
    openGraph: {
      siteName: 'MEDIA Rate',
      locale: locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
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
      <a href="#main" className="skip-link">
        {t("skipToContent")}
      </a>
      <Navbar />
      <main id="main" className="flex-1 min-h-[calc(100vh-4rem)]">
        <PageTransition>{children}</PageTransition>
      </main>
      <MotionFooter />
      <LgpdBanner />
      <Toaster theme="dark" position="top-right" />
      {/* DiagPanel: dynamic ssr:false + ErrorBoundary → nunca crasha a pagina */}
      <DiagPanelLoader />
    </NextIntlClientProvider>
    </QueryProvider>
  );
}
