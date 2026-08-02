import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { PricingCards } from "../../../components/PricingCards";
import { PricingTable } from "../../../components/PricingTable";
import { PricingFAQ } from "../../../components/PricingFAQ";
import { localizedAlternates, localizedUrl } from "../../../lib/seo";
import { serializeJsonLd } from "../../../lib/json-ld";

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
    },
  };
}

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pricing");

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
            "O MEDIA Score™ consolida avaliações de fontes como IMDb, Rotten Tomatoes, TMDB, Metacritic, IGDB e OpenLibrary em uma nota única de 0 a 100, com indicador de confiança (alta/média/baixa).",
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
            "Utilizamos IMDb, Rotten Tomatoes, TMDB, Metacritic para filmes e séries; IGDB e RAWG para games.",
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

        <PricingCards />
        <PricingTable />
        <PricingFAQ />
      </div>
    </>
  );
}
