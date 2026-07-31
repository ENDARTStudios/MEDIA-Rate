import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/navigation";
import { localeOpenGraph, localizedAlternates, localizedUrl } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Sobre — MEDIA Rate",
    description: "O MEDIA Rate reúne scores de filmes, séries e games agregando fontes públicas em um indicador transparente. Saiba como funciona.",
    alternates: {
      canonical: localizedUrl(locale, "/about"),
      languages: localizedAlternates("/about"),
    },
    openGraph: {
      title: "Sobre o MEDIA Rate",
      description: "O MEDIA Rate reúne scores de filmes, séries e games agregando fontes públicas.",
      url: localizedUrl(locale, "/about"),
      siteName: "MEDIA Rate",
      locale: localeOpenGraph(locale),
      type: "website",
    },
    robots: { index: true, follow: true },
  };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <header className="mb-16">
        <h1 className="font-heading text-4xl font-bold text-[#EDE7DC] tracking-tight">Sobre o MEDIA Rate</h1>
        <p className="mt-4 text-lg text-[#9CA3AF] leading-relaxed">
          O MEDIA Rate reúne avaliações de fontes públicas em um score unificado e transparente para ajudar você a decidir o que assistir ou jogar.
        </p>
      </header>

      <div className="space-y-16">
        <section>
          <h2 className="font-heading text-2xl font-bold text-[#EDE7DC] mb-4">O que é o MEDIA Rate</h2>
          <p className="text-[#9CA3AF] leading-relaxed">
            O MEDIA Rate é uma plataforma que agrega avaliações de fontes públicas — como TMDB, RAWG, IGDB e Steam — em um único score consolidado, o MEDIA Score™. Em vez de consultar vários sites para decidir se um filme, série ou game vale seu tempo, você encontra o contexto em um só lugar.
          </p>
        </section>

        <section className="bg-[#11111E] border border-[#1C1C2E] rounded-lg p-8 -mx-2">
          <h2 className="font-heading text-2xl font-bold text-[#EDE7DC] mb-4">O que o MEDIA Rate não é</h2>
          <p className="text-[#9CA3AF] leading-relaxed">
            O MEDIA Rate <strong className="text-[#EDE7DC]">não é uma crítica</strong> nem uma opinião editorial. O MEDIA Score™ não reflete o gosto de um autor — ele é uma <strong className="text-[#EDE7DC]">agregação transparente de avaliações públicas</strong>, com metodologia aberta e verificável. Cada score exibe suas fontes, o nível de confiança e o quanto crítica e público concordam.
          </p>
          <p className="mt-4 text-sm text-[#818CF8]">
            <Link href="/methodology" className="underline underline-offset-2 hover:brightness-110">Leia a metodologia completa →</Link>
          </p>
        </section>

        <section>
          <h2 className="font-heading text-2xl font-bold text-[#EDE7DC] mb-4">Categorias cobertas hoje</h2>
          <p className="text-[#9CA3AF] leading-relaxed">
            O foco atual são <strong className="text-[#EDE7DC]">três categorias</strong>: Filmes, Séries e Games.
          </p>
          <ul className="mt-3 space-y-2 text-[#9CA3AF]">
            <li><strong className="text-[#EDE7DC]">Filmes:</strong> scores agregados a partir do TMDB, IMDb e Rotten Tomatoes.</li>
            <li><strong className="text-[#EDE7DC]">Séries:</strong> incluindo animes — que são cobertos como gênero dentro de Séries, com dados do TMDB e TVMaze.</li>
            <li><strong className="text-[#EDE7DC]">Games:</strong> scores do IGDB, RAWG e Steam.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-2xl font-bold text-[#EDE7DC] mb-4">Como o MEDIA Score™ funciona</h2>
          <p className="text-[#9CA3AF] leading-relaxed">
            O MEDIA Score™ v2 calcula a nota como a média entre crítica e público quando ambos estão disponíveis. O consenso entre eles é um indicador separado e informativo — não entra no cálculo. A metodologia completa, incluindo normalização, detecção de outliers e o indicador de confiança, está documentada na página de metodologia.
          </p>
          <p className="mt-4 text-sm text-[#818CF8]">
            <Link href="/methodology" className="underline underline-offset-2 hover:brightness-110">Ver metodologia →</Link>
          </p>
        </section>

        <section>
          <h2 className="font-heading text-2xl font-bold text-[#EDE7DC] mb-4">Transparência e conformidade</h2>
          <p className="text-[#9CA3AF] leading-relaxed">
            Cada MEDIA Score™ exibe suas fontes e o nível de confiança. Nenhum score é ocultado — scores com baixa confiança são sinalizados, nunca suprimidos. Seguimos a LGPD: você pode acessar, corrigir, exportar ou excluir seus dados a qualquer momento.
          </p>
          <p className="mt-4 text-sm text-[#818CF8]">
            <Link href="/privacy" className="underline underline-offset-2 hover:brightness-110">Política de Privacidade →</Link>
          </p>
        </section>

        <section>
          <h2 className="font-heading text-2xl font-bold text-[#EDE7DC] mb-4">Idiomas</h2>
          <p className="text-[#9CA3AF] leading-relaxed">
            O MEDIA Rate está disponível em três idiomas: português (Brasil), inglês (EUA) e espanhol (Espanha). Use o seletor de idioma no canto superior direito para alternar a qualquer momento.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-2xl font-bold text-[#EDE7DC] mb-4">O que vem depois</h2>
          <p className="text-[#9CA3AF] leading-relaxed">
            <strong className="text-[#EDE7DC]">Livros e quadrinhos/mangás estão no roadmap</strong> e chegarão como categorias próprias em uma atualização futura. Hoje o foco são Filmes, Séries e Games — as três categorias com cobertura completa de fontes e score consolidado.
          </p>
          <p className="mt-3 text-xs text-[#6B7280]">
            Esta página também está disponível em <Link href="/en-US/about" className="text-[#818CF8] underline">inglês</Link> e <Link href="/es-ES/about" className="text-[#818CF8] underline">espanhol</Link>.
          </p>
        </section>
      </div>
    </article>
  );
}
