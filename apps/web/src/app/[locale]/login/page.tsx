import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Entrar — MEDIA Rate", description: "Acesse sua conta MEDIA Rate." };
}

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("nav");

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-surface-card rounded-2xl shadow-floating p-8 border border-surface-border/30">
        <h1 className="text-2xl font-bold text-gray-100 mb-6">{t("login")}</h1>
        <p className="text-gray-400 text-sm">Página de login em construção.</p>
      </div>
    </div>
  );
}
