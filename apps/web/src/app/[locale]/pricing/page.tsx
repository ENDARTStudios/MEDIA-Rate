import { getTranslations, setRequestLocale } from "next-intl/server";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { PricingCards } from "../../../components/PricingCards";
import { PricingTable } from "../../../components/PricingTable";
import { PricingFAQ } from "../../../components/PricingFAQ";
import { MediaUnlockGrid } from "../../../components/pricing/MediaUnlockGrid";
import { localizedAlternates, localizedUrl, OG_IMAGE_PADRAO } from "../../../lib/seo";
import { serializeJsonLd } from "../../../lib/json-ld";
import { currencyForRegion, symbolForCurrency } from "../../../lib/currency-for-region";
import { annualAvailable } from "../../../lib/billing-config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: localizedUrl(locale, "/pricing"),
      languages: localizedAlternates("/pricing"),
    },
    robots: { index: true, follow: true },
    openGraph: {
      title: t("metaOgTitle"),
      description: t("metaOgDescription"),
      siteName: "MEDIA Rate",
      type: "website",
      images: OG_IMAGE_PADRAO,
    },
  };
}

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pricing");

  // T418 (D-389): moeda por locale+região — geo via header da Vercel
  // (x-vercel-ip-country); es-ES sem sinal de Europa cai em BRL (protege LatAm).
  const h = await headers();
  const country = h.get("x-vercel-ip-country");
  const currencySymbol = symbolForCurrency(currencyForRegion(locale, country));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "O que é o MEDIA Score™ e como é calculado?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text":
            "O MEDIA Score™ consolida avaliações de fontes como IMDb, Rotten Tomatoes, TMDB, Metacritic, TVMaze, IGDB, OpenCritic e Steam em uma nota única por mídia — jogos de 0 a 100, demais mídias de 0 a 10 — com indicador de confiança (alta/média/baixa).",
        },
      },
      {
        "@type": "Question",
        "name": "Preciso de conta para usar?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text":
            "Não. O catálogo, busca e MEDIA Score™ são gratuitos. Recomendações ilimitadas, perfil de gosto e assistente IA exigem plano Plus ou Premium.",
        },
      },
      {
        "@type": "Question",
        "name": "Posso cancelar quando quiser?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text":
            "Sim. Todos os planos pagos podem ser cancelados a qualquer momento, sem multa ou aviso prévio.",
        },
      },
      {
        "@type": "Question",
        "name": "Posso mudar de plano depois?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text":
            "Sim. Você pode fazer upgrade ou downgrade a qualquer momento. O valor é ajustado proporcionalmente.",
        },
      },
      {
        "@type": "Question",
        "name": "Quais fontes de avaliação vocês usam?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text":
            "Utilizamos IMDb, Rotten Tomatoes, TMDB, Metacritic, TVMaze, Letterboxd e Trakt para filmes e séries; IGDB, OpenCritic, Steam e SteamSpy para games.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-heading font-bold text-[#EDE7DC] mb-4">{t("headline")}</h1>
          <p className="text-lg text-[#9CA3AF] max-w-2xl mx-auto">{t("subheadline")}</p>
        </div>

        <PricingCards currencySymbol={currencySymbol} annualAvailable={annualAvailable()} />
        <p className="text-xs text-[#80809B] text-center max-w-2xl mx-auto px-4 mt-6 leading-relaxed">
          {t("currencyNote")}
        </p>
        <PricingTable />
        <MediaUnlockGrid />
        <PricingFAQ />
      </div>
    </>
  );
}
