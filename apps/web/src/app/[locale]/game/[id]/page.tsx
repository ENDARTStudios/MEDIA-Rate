import { setRequestLocale } from "next-intl/server";
import { GameDetailWrapper } from "@/components/GameDetailWrapper";

export default async function GameDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <GameDetailWrapper id={id} />;
}
