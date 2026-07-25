import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { ProtectedPage } from "../../../components/ProtectedPage";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Configurações — MEDIA Rate" };
}

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <ProtectedPage>
      <div className="max-w-3xl mx-auto py-16 px-4">
        <h1 className="text-2xl font-display font-bold text-gray-100 mb-4">Configurações</h1>
        <p className="text-gray-400">Preferências de conta, notificações e privacidade.</p>
      </div>
    </ProtectedPage>
  );
}
