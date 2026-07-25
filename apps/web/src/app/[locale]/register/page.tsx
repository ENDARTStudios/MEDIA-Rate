import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Cadastrar — MEDIA Rate", description: "Crie sua conta gratuita no MEDIA Rate." };
}

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("nav");

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-surface-card rounded-2xl shadow-floating p-8 border border-surface-border/30">
        <h1 className="text-2xl font-bold text-gray-100 mb-6">{t("register")}</h1>
        <p className="text-gray-400 text-sm">Página de cadastro em construção.</p>
      </div>
    </div>
  );
}
