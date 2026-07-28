import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Sobre o MEDIA Rate",
    description: "Conheça a missão do MEDIA Rate: unificar a descoberta de filmes, séries e games em uma única plataforma inteligente.",
    alternates: { canonical: `https://media-rate-web.vercel.app/${locale}/about` },
    robots: { index: true, follow: true },
  };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("common");

  return (
    <article className="container max-w-4xl mx-auto py-12 px-4">
      <header className="mb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-foreground font-heading">
          Sobre o MEDIA Rate
        </h1>
        <p className="text-lg text-muted-foreground">
          Sua bússola definitiva para o mundo do entretenimento.
        </p>
      </header>

      <div className="prose prose-invert max-w-none prose-headings:font-heading prose-a:text-primary">
        <h2>Nossa Missão</h2>
        <p>
          O ecossistema de entretenimento está mais fragmentado do que nunca. Com dezenas de serviços de streaming, lojas de jogos e plataformas de leitura, descobrir o que vale o seu tempo tornou-se um trabalho árduo. A missão do <strong>MEDIA Rate</strong> é simples: organizar o caos.
        </p>
        
        <h2>O que fazemos</h2>
        <p>
          Nós agregamos informações, críticas e metadados de milhares de obras para criar o <strong>MEDIA Score™</strong>, um indicador unificado de qualidade. Além disso, oferecemos ferramentas de watchlist, rastreamento de progresso e recomendações baseadas no seu perfil de gosto único.
        </p>

        <h2>Nossa Equipe</h2>
        <p>
          Desenvolvido pela <strong>END ART Studios</strong>, o MEDIA Rate é mantido por uma equipe de entusiastas de tecnologia e cultura pop que acreditam que o seu tempo livre é valioso demais para ser desperdiçado com conteúdo ruim.
        </p>
      </div>
    </article>
  );
}
