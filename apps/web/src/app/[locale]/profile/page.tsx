import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Perfil — MEDIA Rate", description: "Seu perfil no MEDIA Rate." };
}

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("nav");
  return (
    <div className="max-w-4xl mx-auto py-16 px-4">
      <div className="bg-surface-card rounded-2xl shadow-floating p-8 border border-surface-border/30">
        <h1 className="text-2xl font-bold text-gray-100 mb-4">{t("profile")}</h1>
        <p className="text-gray-400">Seu perfil, estatísticas e taste profile serão exibidos aqui.</p>
      </div>
    </div>
  );
}
