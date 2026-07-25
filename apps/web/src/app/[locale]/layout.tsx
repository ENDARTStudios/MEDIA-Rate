import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { routing } from "../../i18n/routing";
import { Navbar } from "../../components/Navbar";
import { MotionFooter } from "../../components/MotionFooter";
import { LgpdBanner } from "../../components/LgpdBanner";
import { PageTransition } from "../../components/PageTransition";
import "../globals.css";

export const metadata: Metadata = {
  title: "MEDIA Rate — Descubra o que assistir, jogar e ler",
  description:
    "Plataforma de descoberta de mídia com MEDIA Score™ unificado para filmes, séries, games e livros.",
};

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
    </NextIntlClientProvider>
  );
}
