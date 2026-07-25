import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { ProtectedPage } from "../../../components/ProtectedPage";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Dashboard — MEDIA Rate" };
}

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <ProtectedPage>
      <div className="max-w-5xl mx-auto py-16 px-4">
        <h1 className="text-2xl font-display font-bold text-gray-100 mb-4">Dashboard</h1>
        <p className="text-gray-400">Estatísticas e visão geral da sua atividade.</p>
      </div>
    </ProtectedPage>
  );
}
