import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Como o MEDIA Score é calculado",
    description: "Entenda a metodologia por trás do MEDIA Score: fontes avaliadas, pesos, atualizações e como garantimos a precisão da nota.",
    alternates: { canonical: `https://media-rate-web.vercel.app/${locale}/methodology` },
    robots: { index: true, follow: true },
  };
}

export default async function MethodologyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("common");

  return (
    <article className="container max-w-4xl mx-auto py-12 px-4">
      <header className="mb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-foreground font-heading">
          Como o MEDIA Score é calculado
        </h1>
        <p className="text-lg text-muted-foreground">
          Transparência, precisão e contexto para a sua descoberta de mídia.
        </p>
      </header>

      <div className="prose prose-invert max-w-none prose-headings:font-heading prose-a:text-primary">
        <h2>O que é o MEDIA Score?</h2>
        <p>
          O <strong>MEDIA Score</strong> é uma nota consolidada de 0 a 100 que reflete a recepção crítica e do público sobre filmes, séries, jogos e livros. Ele não substitui a sua opinião, mas oferece um ponto de partida confiável para decidir o que assistir ou jogar.
        </p>

        <h2>Nossos Critérios e Fontes</h2>
        <p>
          Para calcular o score, agregamos dados de diversas fontes públicas e plataformas de crítica especializadas. O cálculo considera:
        </p>
        <ul>
          <li><strong>Crítica Especializada:</strong> Avaliações de veículos reconhecidos e jornalistas verificados (peso: 60%).</li>
          <li><strong>Recepção do Público:</strong> Notas de usuários em plataformas abertas, filtradas para evitar review bombing (peso: 40%).</li>
          <li><strong>Recência:</strong> Obras clássicas têm suas notas estabilizadas, enquanto lançamentos recentes podem sofrer variações conforme novas críticas são publicadas.</li>
        </ul>

        <h2>Perguntas Frequentes (FAQ)</h2>
        <div className="space-y-6 mt-6">
          <div>
            <h3 className="text-xl font-semibold">O MEDIA Score é atualizado com que frequência?</h3>
            <p>Para lançamentos (menos de 30 dias), o score é atualizado diariamente. Para obras mais antigas, a atualização ocorre semanalmente ou quando há uma mudança significativa nas fontes de dados.</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold">Vocês incluem avaliações de usuários da plataforma?</h3>
            <p>Sim. Embora o score principal seja uma agregação de mercado, assinantes do plano Premium podem ver um score ajustado ao seu perfil de gosto pessoal (IA).</p>
          </div>
        </div>
      </div>
    </article>
  );
}
