import type { Metadata } from "next";

interface Props {
  params: Promise<{ locale: string; plan: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, plan } = await params;
  const planName =
    plan === "plus" || plan === "PLUS"
      ? "Plus"
      : plan === "premium" || plan === "PREMIUM"
        ? "Premium"
        : plan;
  return {
    title: `Checkout ${planName} — MEDIA Rate`,
    description: `Assine o plano ${planName} do MEDIA Rate.`,
    alternates: { canonical: `https://mediarate.app/${locale}/checkout/${plan}` },
  };
}

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
