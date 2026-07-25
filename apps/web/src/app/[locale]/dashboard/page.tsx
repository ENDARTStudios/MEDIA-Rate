import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Dashboard — MEDIA Rate" };
}

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="max-w-5xl mx-auto py-16 px-4">
      <h1 className="text-2xl font-bold text-gray-100 mb-4">Dashboard</h1>
      <p className="text-gray-400">Estatísticas, métricas e visão geral da sua atividade no MEDIA Rate.</p>
    </div>
  );
}
