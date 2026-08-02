import type { Metadata } from "next";
import { localizedAlternates, localizedUrl } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Checkout — MEDIA Rate",
    alternates: {
      canonical: localizedUrl(locale, "/checkout"),
      languages: localizedAlternates("/checkout"),
    },
    robots: { index: false, follow: false },
  };
}

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
