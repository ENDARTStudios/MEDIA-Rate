import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { TVDetailWrapper } from "@/components/TVDetailWrapper";
import { generateDetailMetadata } from "@/lib/detail-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  return generateDetailMetadata({ locale, id, type: "tv" });
}

export default async function TVDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <TVDetailWrapper id={id} />;
}
