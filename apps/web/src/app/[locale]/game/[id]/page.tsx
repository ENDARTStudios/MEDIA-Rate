import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { GameDetailWrapper } from "@/components/GameDetailWrapper";
import { generateDetailMetadata } from "@/lib/detail-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  return generateDetailMetadata({ locale, id, type: "game" });
}

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <GameDetailWrapper id={id} />;
}
