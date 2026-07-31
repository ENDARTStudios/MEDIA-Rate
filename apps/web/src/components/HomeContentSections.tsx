import { Link } from "@/lib/navigation";

export function HomeContentSections() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">
      {/* H2 1 */}
      <section>
        <h2 className="font-heading text-2xl font-bold text-[#EDE7DC] mb-8">O que é o MEDIA Rate</h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#9CA3AF] mb-2">Proposta de valor da plataforma</h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">O MEDIA Rate é a primeira plataforma brasileira de score unificado para filmes, séries e games. Consolidamos avaliações de múltiplas fontes públicas em uma única nota transparente, eliminando a necessidade de consultar vários sites para decidir o que assistir ou jogar.</p>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#9CA3AF] mb-2">Diferença entre agregador de notas e resenha única</h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">Diferente de um site de críticas tradicional, onde uma única pessoa avalia subjetivamente, o MEDIA Rate agrega milhares de avaliações com peso estatístico. Cada nota reflete a média ponderada da crítica especializada e do público, com transparência total sobre as fontes utilizadas.</p>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#9CA3AF] mb-2">Categorias de mídia cobertas</h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">Filmes, séries e games são o foco atual. Animes são cobertos como gênero dentro de Séries. Livros, animes e quadrinhos como categorias próprias estão no roadmap e chegarão em atualizações futuras.</p>
          </div>
        </div>
      </section>

      {/* H2 2 */}
      <section>
        <h2 className="font-heading text-2xl font-bold text-[#EDE7DC] mb-8">Como Funciona o MEDIA Score™</h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#9CA3AF] mb-2">Metodologia de cálculo</h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">O MEDIA Score™ v2 calcula a nota global como a média simples entre a nota da crítica e a nota do público (50% cada). Quando apenas uma das fontes está disponível — como em filmes e séries, onde não há pontuação agregada de crítica — o score reflete exclusivamente a nota do público. O consenso entre crítica e audiência é exibido separadamente, como informação complementar.</p>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#9CA3AF] mb-2">Fontes de dados e normalização das notas</h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">Utilizamos TMDB, RAWG, IGDB e Steam como fontes primárias. Cada nota bruta é normalizada para a escala 0–100, aplicando limites mínimos de votos e detecção de outliers para garantir qualidade estatística. Fontes abaixo do limiar ou com desvio extremo são excluídas e documentadas com o motivo.</p>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#9CA3AF] mb-2">Fontes e Cobertura de Dados</h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">O MEDIA Rate integra fontes por tipo de mídia: TMDB (filmes e séries), TVMaze (séries), RAWG e IGDB (games), Steam (games). A cobertura varia por tipo — filmes têm a base mais ampla; jogos dependem da disponibilidade de dados abertos. Os dados são atualizados periodicamente conforme as APIs das fontes.</p>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#9CA3AF] mb-2">Nível de confiança e transparência do score</h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">Cada MEDIA Score™ exibe um indicador de confiança (Alta / Média / Baixa), calculado com base no volume de votos, número de fontes, dispersão das notas e idade dos dados. Scores com baixa confiança são sinalizados com alerta visual, nunca ocultados.</p>
          </div>
        </div>
      </section>

      {/* H2 3 */}
      <section>
        <h2 className="font-heading text-2xl font-bold text-[#EDE7DC] mb-8">Catálogo de Filmes, Séries e Games</h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#9CA3AF] mb-2">Navegação por categoria e gênero</h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">O catálogo do MEDIA Rate permite filtrar por tipo de mídia (Filmes, Séries, Games), gênero, ano de lançamento e ordenar por score, título ou data. A página de catálogo exibe cards com poster, título, ano e MEDIA Score™.</p>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#9CA3AF] mb-2">Ficha técnica de cada título</h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">Cada título possui uma página de detalhe com: poster, sinopse, elenco, gêneros, ano de lançamento, plataformas de streaming, MEDIA Score™ detalhado (Gauge + Barra de crítica vs público), fontes de avaliação e classificação indicativa por região.</p>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#9CA3AF] mb-2">Temporadas e episódios de séries</h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">Séries possuem navegação por temporadas (abas horizontais) e episódios (lista expansível). Cada episódio pode ter seu próprio score quando disponível.</p>
          </div>
        </div>
      </section>

      {/* H2 4 */}
      <section>
        <h2 className="font-heading text-2xl font-bold text-[#EDE7DC] mb-8">Busca e Descoberta de Títulos</h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#9CA3AF] mb-2">Busca rápida e autocomplete</h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">A barra de busca com atalho Ctrl+K permite encontrar qualquer título instantaneamente. Resultados incluem score, tipo e ano, com navegação direta para a página de detalhe.</p>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#9CA3AF] mb-2">Filtros, ordenação e tags</h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">No catálogo e na página Discover, você pode filtrar por tipo de mídia, ordenar por score (maior/menor), ano ou título, e buscar por palavra-chave.</p>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#9CA3AF] mb-2">Recomendações personalizadas</h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">Com base no seu perfil de gosto e histórico, o MEDIA Rate sugere títulos similares aos que você já avaliou ou adicionou à watchlist.</p>
          </div>
        </div>
      </section>

      {/* H2 5 */}
      <section>
        <h2 className="font-heading text-2xl font-bold text-[#EDE7DC] mb-8">Planos e Assinatura</h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#9CA3AF] mb-2">Comparativo dos planos Free, Plus e Premium</h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">O plano Free oferece catálogo limitado e MEDIA Score básico. O plano Plus (R$19,90/mês) desbloqueia catálogo completo, watchlist ilimitada e recomendações IA. O Premium (R$39,90/mês) adiciona perfil de gosto avançado, listas personalizadas e suporte prioritário.</p>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#9CA3AF] mb-2">Benefícios exclusivos para assinantes</h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">Assinantes Plus e Premium têm acesso ao catálogo completo, recomendações personalizadas por IA, exportação de dados e suporte prioritário.</p>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#9CA3AF] mb-2">Upgrade, downgrade e cancelamento</h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">Você pode alterar seu plano a qualquer momento. O cancelamento é imediato, sem multas ou aviso prévio.</p>
          </div>
        </div>
      </section>

      {/* H2 6 */}
      <section>
        <h2 className="font-heading text-2xl font-bold text-[#EDE7DC] mb-8">Conta, Cadastro e Personalização</h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#9CA3AF] mb-2">Como criar uma conta gratuita</h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">Clique em "Cadastre-se" no canto superior direito, preencha nome, e-mail e senha. Sua conta Free é criada instantaneamente — sem necessidade de cartão de crédito.</p>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#9CA3AF] mb-2">Favoritos, watchlist e histórico</h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">Adicione qualquer título à sua watchlist com um clique. Organize em colunas: Quero Ver, Vendo, Vi. Acompanhe seu histórico e estatísticas pessoais no Dashboard.</p>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#9CA3AF] mb-2">Privacidade e proteção de dados (LGPD)</h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">Seus dados são protegidos conforme a LGPD. Consulte nossa <Link href="/privacy" className="text-[#818CF8] underline">Política de Privacidade</Link> para detalhes sobre coleta, armazenamento e exclusão de dados.</p>
          </div>
        </div>
      </section>

      {/* H2 7 — Idiomas */}
      <section>
        <h2 className="font-heading text-2xl font-bold text-[#EDE7DC] mb-8">Idiomas e Acesso Internacional</h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#9CA3AF] mb-2">Idiomas disponíveis</h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">
              O MEDIA Rate está disponível em três idiomas:
              <Link href="/pt-BR" className="text-[#818CF8] underline mx-1">Português (Brasil)</Link>,
              <Link href="/en-US" className="text-[#818CF8] underline mx-1">Inglês (EUA)</Link> e
              <Link href="/es-ES" className="text-[#818CF8] underline mx-1">Espanhol (Espanha)</Link>.
            </p>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#9CA3AF] mb-2">Como alterar o idioma da plataforma</h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">Use o seletor de idioma no canto superior direito (ícone de globo) para alternar entre Português, Inglês e Espanhol. A troca é instantânea e preserva a página atual.</p>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#9CA3AF] mb-2">SEO multilíngue e experiência localizada</h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">Cada idioma possui URLs canônicas, metadados e conteúdo localizados, garantindo indexação correta nos buscadores e uma experiência totalmente adaptada à sua região.</p>
          </div>
        </div>
      </section>

      {/* H2 8 — FAQ */}
      <section>
        <h2 className="font-heading text-2xl font-bold text-[#EDE7DC] mb-8">Perguntas Frequentes</h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-heading text-base font-semibold text-[#9CA3AF] mb-1">O que é o MEDIA Score™ e como ele é calculado?</h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">O MEDIA Score™ consolida avaliações de fontes como IMDb, Rotten Tomatoes, TMDB, Metacritic, IGDB e OpenLibrary em uma nota única de 0 a 100, com indicador de confiança (alta/média/baixa).</p>
          </div>
          <div>
            <h3 className="font-heading text-base font-semibold text-[#9CA3AF] mb-1">Preciso de conta para usar o MEDIA Rate?</h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">Não. O catálogo, busca e MEDIA Score™ são gratuitos. Recomendações ilimitadas, perfil de gosto e assistente IA exigem plano Plus ou Premium.</p>
          </div>
          <div>
            <h3 className="font-heading text-base font-semibold text-[#9CA3AF] mb-1">Posso cancelar minha assinatura quando quiser?</h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">Sim. Todos os planos pagos podem ser cancelados a qualquer momento, sem multa ou aviso prévio.</p>
          </div>
          <div>
            <h3 className="font-heading text-base font-semibold text-[#9CA3AF] mb-1">Posso mudar de plano depois?</h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">Sim. Você pode fazer upgrade ou downgrade a qualquer momento. O valor é ajustado proporcionalmente.</p>
          </div>
          <div>
            <h3 className="font-heading text-base font-semibold text-[#9CA3AF] mb-1">O MEDIA Score é uma crítica?</h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">Não. O MEDIA Score™ é um indicador consolidado de sinais de avaliação de fontes públicas — não é uma crítica nem opinião editorial. Ele deve ser usado como ponto de partida para descoberta, não como substituto de uma análise individual.</p>
          </div>
          <div>
            <h3 className="font-heading text-base font-semibold text-[#9CA3AF] mb-1">Quais fontes de avaliação vocês usam?</h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">Utilizamos IMDb, Rotten Tomatoes e TMDB para filmes e séries; IGDB e RAWG para games.</p>
          </div>
        </div>
        <p className="text-sm text-[#6B7280] mt-4">
          Veja mais no nosso <Link href="/pricing#faq" className="text-[#818CF8] underline">FAQ completo dos planos</Link>.
        </p>
      </section>
    </div>
  );
}
