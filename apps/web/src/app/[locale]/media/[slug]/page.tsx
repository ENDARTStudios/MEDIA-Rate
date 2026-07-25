import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

interface Props { params: Promise<{ locale: string; slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${slug.replace(/-/g, " ")} — MEDIA Rate`, description: "Detalhes da mídia no MEDIA Rate." };
}

export default async function MediaDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  return (
    <div className="min-h-[calc(100vh-8rem)] max-w-5xl mx-auto py-16 px-4">
      <div className="bg-surface-card rounded-2xl shadow-floating p-8 border border-surface-border/30">
        <h1 className="text-2xl font-bold text-gray-100 mb-4">Mídia: {slug}</h1>
        <p className="text-gray-400">Página de detalhes em construção. Backdrop, poster, MEDIA Score™, sinopse e recomendações serão exibidos aqui.</p>
      </div>
    </div>
  );
}
