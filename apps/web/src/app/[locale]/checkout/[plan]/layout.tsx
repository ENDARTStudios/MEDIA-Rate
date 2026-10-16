import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { OG_IMAGE_PADRAO, localizedAlternates, localizedUrl } from "@/lib/seo";

interface Props {
  params: Promise<{ locale: string; plan: string }>;
}

/**
 * T211: title/description eram hardcoded em pt-BR para os 3 locales, sem OG.
 * Agora usa o namespace `checkout` (title + metaDescription) e o OG padrão,
 * como as demais rotas públicas.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, plan } = await params;
  const t = await getTranslations({ locale, namespace: "checkout" });
  const raw = plan.toLowerCase();
  const planName = raw === "plus" ? t("plus") : raw === "premium" ? t("premium") : plan;
  const title = `${t("title")} — ${planName}`;

  return {
    title,
    description: t("metaDescription"),
    alternates: {
      canonical: localizedUrl(locale, `/checkout/${plan}`),
      languages: localizedAlternates(`/checkout/${plan}`),
    },
    openGraph: {
      title,
      description: t("metaDescription"),
      url: localizedUrl(locale, `/checkout/${plan}`),
      images: OG_IMAGE_PADRAO,
    },
    // T211: rota transacional não deve ser indexada.
    robots: { index: false, follow: false },
  };
}

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
