import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { setRequestLocale, getMessages, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { routing } from "../../i18n/routing";
import { localeOpenGraph } from "../../lib/seo";

import { MotionFooter } from "../../components/MotionFooter";
import { ConsentBanner } from "../../components/ConsentBanner";
import { DiagPanelLoader } from "../../components/DiagPanelLoader";
import { PageTransition } from "../../components/PageTransition";
import { LimpezaServiceWorker } from "../../components/LimpezaServiceWorker";
import { AuthHeader } from "../../components/AuthHeader";
import { QueryProvider } from "../../providers/query-provider";
import { MotionProvider } from "../../providers/motion-provider";
import { AuthHydrator } from "../../providers/auth-hydrator";
import { ConexaoAviso } from "../../providers/conexao-aviso";
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
  // D-585 (T211): o idioma era descoberto pelo request (headers/cookies) tanto no
  // `getTranslations()` quanto no `NextIntlClientProvider` sem props. Passar
  // `locale`/`messages` explicitamente remove essas leituras (mesmo padrão de
  // `app/not-found.tsx`) — é **pré-requisito** para pré-render/ISR, mas sozinho
  // NÃO basta: a bissecção mostrou que o segmento continua `ƒ` (ver D-585).
  const t = await getTranslations({ locale, namespace: "common" });
  const messages = await getMessages({ locale });

  return (
    <QueryProvider>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <PostHogProvider>
          {/* T208/D-580: gate global de movimento (reducedMotion="user"). */}
          <MotionProvider>
            {/* D-619 (P0): descobre a sessão UMA vez por página, em qualquer rota. Sem isto,
                só o `ProtectedPage` hidratava o store — e um F5 em /dashboard, /historico,
                /listas, /listas/[slug] ou /user/data mostrava interface de deslogado com
                sessão válida (inclusive no header e no checkout). */}
            <AuthHydrator />
            {/* D-629: aviso global de conexão (uma implementação conclui as 7 sessões que pediam estado offline). */}
            <ConexaoAviso />
            {/* D-525: desregistra SW estranho da origem (o app não tem SW próprio). */}
            <LimpezaServiceWorker />
            <a href="#main" className="skip-link">
              {t("skipToContent")}
            </a>
            <AuthHeader />
            <main id="main" className="flex-1 min-h-[calc(100dvh-4rem)]">
              <PageTransition>{children}</PageTransition>
            </main>
            <MotionFooter locale={locale} />
            <ConsentBanner />
            <Toaster theme="dark" position="top-right" />
            {/*
             * DiagPanel: dynamic ssr:false + ErrorBoundary → nunca crasha a pagina.
             * D-585: `DiagPanel` usa `useSearchParams()`; sem limite de Suspense o
             * Next aborta a pré-renderização da rota (CSR bailout). O limite é
             * correto independentemente do ISR.
             */}
            <Suspense fallback={null}>
              <DiagPanelLoader />
            </Suspense>
          </MotionProvider>
        </PostHogProvider>
      </NextIntlClientProvider>
    </QueryProvider>
  );
}
