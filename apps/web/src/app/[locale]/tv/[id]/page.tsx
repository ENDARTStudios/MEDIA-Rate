import { setRequestLocale } from "next-intl/server";
import { TVDetailWrapper } from "@/components/TVDetailWrapper";

export default async function TVDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <TVDetailWrapper id={id} />;
}
