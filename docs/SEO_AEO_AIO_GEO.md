# Estratégia integrada de SEO, AEO, AIO e GEO — MEDIA Rate

> **Propósito.** Tornar o MEDIA Rate encontrável, compreensível e citável por mecanismos de busca tradicionais e assistentes baseados em IA, sem publicar alegações não verificáveis, sem indexar superfícies privadas e sem usar métricas de vaidade como sinal de sucesso.

## Escopo e princípios

A estratégia trata as páginas públicas como ativos de entidade: cada obra, a metodologia de pontuação, a cobertura de fontes e a identidade do produto precisam ter URL estável, conteúdo visível, metadados consistentes e relações semânticas verificáveis. Não há garantia de ranking, de rich result ou de citação por um assistente; os mecanismos escolhem o que exibir. Portanto, o objetivo é melhorar elegibilidade, rastreabilidade e utilidade, não prometer posição.

| Frente | Objetivo | Resultado esperado | Métrica principal |
|---|---|---|---|
| **SEO** | Garantir descoberta, indexação e interpretação corretas das URLs públicas. | Crescimento de páginas válidas, impressões qualificadas e cliques orgânicos. | Páginas indexadas, impressões, cliques e CTR no Search Console. |
| **AEO** | Responder perguntas reais de forma clara, curta e sustentada por contexto visível. | Maior elegibilidade para respostas diretas e consultas informacionais. | Impressões/clicks de consultas de pergunta, presença em recursos de SERP e conversão assistida. |
| **AIO** | Preparar conteúdo, entidades e dados para sistemas de recuperação e síntese por IA. | O produto e o MEDIA Score passam a ser interpretáveis sem depender de texto promocional vago. | Qualidade de entidade, cobertura semântica, acessibilidade de páginas e tráfego de referenciadores de IA. |
| **GEO** | Aumentar a probabilidade de o MEDIA Rate ser citado em respostas generativas quando for relevante. | Menções atribuídas e referências a páginas de metodologia, fontes e entidades. | Citações/menções amostradas, referências de IA e crescimento de consultas de marca. |

## Implementação entregue

A primeira entrega prioriza as condições necessárias para rastreamento, internacionalização e confiança. O sitemap inclui somente rotas públicas existentes, incluindo fichas de mídia do catálogo, e não fabrica datas de atualização. As superfícies privadas recebem `X-Robots-Tag: noindex, nofollow, noarchive`; elas não foram bloqueadas no `robots.txt`, pois um rastreador bloqueado por `robots.txt` pode não ler a diretiva de `noindex`.

| Camada | Alteração implementada | Objetivo operacional | Como validar |
|---|---|---|---|
| Descoberta | `robots.ts` e `sitemap.ts` do App Router. | Expor sitemap e manter APIs fora do rastreamento. | `GET /robots.txt` e `GET /sitemap.xml` retornam 200. |
| Internacionalização | Canonical e `hreflang` para `pt-BR`, `en-US`, `es-ES` e `x-default`. | Impedir competição entre versões de idioma e declarar a variante correta. | Inspecionar `<link rel="alternate">` e URL canônica em cada locale. |
| Identidade | JSON-LD `WebSite` na home e `Organization` na página Sobre. | Conectar produto, marca e publisher a uma entidade legível por máquinas. | Validar JSON-LD no Rich Results Test e no Schema Markup Validator. |
| Páginas de confiança | Páginas públicas localizadas de **Sobre**, **Metodologia** e **Fontes e Cobertura**. | Explicar o produto e o método com conteúdo visível e verificável. | Rotas retornam 200, canonical próprio e conteúdo no idioma solicitado. |
| AEO | FAQ visível e `FAQPage` na Metodologia, além de headings orientados a perguntas. | Permitir respostas diretas sem markup oculto ou repetitivo. | Conferir que a pergunta/resposta estruturada está idêntica ao texto visível. |
| Entidades | JSON-LD de `Movie`, `TVSeries`, `VideoGame` ou `Book` por obra, com breadcrumb. | Dar contexto semântico às páginas de catálogo. | Validar schema de uma amostra de cada tipo de obra. |
| Social e compartilhamento | Open Graph, Twitter Card, URLs absolutas e locale nas rotas públicas principais. | Garantir previews consistentes e URLs canônicas em compartilhamentos. | Usar os depuradores de compartilhamento após o deploy. |
| Exclusão | Header `X-Robots-Tag` nas rotas de conta, login e áreas internas. | Evitar indexação de telas sem valor de busca. | `curl -I /pt-BR/login` deve retornar a diretiva. |

## Táticas por frente

### SEO: descoberta e qualidade técnica

A base técnica deve permanecer simples: uma URL canônica por conteúdo, links internos rastreáveis, conteúdo principal renderizado no HTML e nenhum link de sitemap para páginas privadas, parâmetros de filtro ou telas de aplicação. Páginas de catálogo filtradas não devem receber URL indexável até que tenham demanda comprovada, copy exclusiva e canonical próprio.

| Tática | Prioridade | Indicador de aceite | Métrica de acompanhamento |
|---|---:|---|---|
| Enviar `/sitemap.xml` ao Google Search Console e Bing Webmaster Tools. | Alta | Sitemap aceito, sem erros de leitura. | URLs descobertas, URLs indexadas, erros por sitemap. |
| Monitorar exclusões por canonical, `noindex`, soft 404 e redirecionamento. | Alta | Páginas públicas não aparecem em grupos de exclusão inesperados. | Relatório de indexação por semana. |
| Revisar títulos e descrições das páginas de catálogo e de mídia a partir de clusters de consulta. | Alta | Cada página de entidade possui título descritivo e descrição única. | CTR por página/consulta e posição média. |
| Implementar `generateStaticParams`/revalidação quando a origem de dados deixar de ser mockada. | Média | Obras críticas podem ser renderizadas e atualizadas de forma controlada. | TTFB, taxa de erro e recrawl após atualização. |
| Criar links internos contextuais entre catálogo, obras, metodologia e fontes. | Média | Páginas institucionais recebem links de navegação e contexto. | Profundidade de clique e páginas rastreadas. |

### AEO: conteúdo que responde

A otimização para mecanismos de resposta exige respostas que possam ser extraídas sem perder o sentido. Em vez de produzir blocos artificiais de palavras-chave, cada página deve responder uma pergunta central em um primeiro parágrafo conciso e sustentar a resposta com detalhes, escopo e ressalvas. A FAQ da Metodologia serve como modelo: pergunta literal, resposta visível e evidência contextual na mesma página.

| Tática | Prioridade | Indicador de aceite | Métrica de acompanhamento |
|---|---:|---|---|
| Criar páginas ou seções para perguntas de alta intenção, como “Como o MEDIA Score é calculado?” e “Quais fontes o MEDIA Rate usa?”. | Alta | Pergunta em `H2/H3`, resposta direta e explicação complementar. | Consultas com interrogativos, impressões e CTR. |
| Manter FAQ estruturada apenas quando a mesma resposta estiver visível. | Alta | Sem texto oculto, sem FAQ repetida em massa e sem alegações promocionais. | Validade de schema e cobertura de perguntas. |
| Criar glossário curto para termos próprios quando a pesquisa revelar ambiguidade. | Média | Definição estável, exemplos e links para método. | Consultas não marcárias e tempo de permanência. |
| Revisar snippets após dados de Search Console, não por suposição. | Média | Ajustes guiados por CTR e intenção de busca. | Evolução de CTR por cluster. |

### AIO e GEO: entidades, evidência e citação responsável

Sistemas generativos e de recuperação favorecem informações que tenham origem clara, escopo explícito e páginas estáveis. A estratégia não deve tentar manipular respostas de IA com listas de nomes de modelos, páginas invisíveis ou texto criado para parecer citação. A contribuição do MEDIA Rate deve ser explicada em termos de método, cobertura e limites do score.

| Tática | Prioridade | Indicador de aceite | Métrica de acompanhamento |
|---|---:|---|---|
| Publicar e manter páginas de **Metodologia**, **Fontes e Cobertura** e **Sobre**. | Alta | Conteúdo possui autor/organização, URL estável e data de revisão quando aplicável. | Acessos orgânicos e referências de IA a essas URLs. |
| Usar JSON-LD apenas para fatos demonstráveis no HTML. | Alta | Sem notas, contagens ou ratings que não correspondam à evidência pública. | Erros de validação e consistência em amostras. |
| Reforçar ligações entre obra, tipo de mídia, gênero, método e fontes. | Alta | Página de entidade tem breadcrumb e schema de tipo adequado. | Cobertura de páginas com dados estruturados válidos. |
| Registrar menções em respostas de IA por amostra de consultas, sempre com data, prompt e URL citada. | Média | Planilha de monitoramento sem conclusões baseadas em uma única resposta. | Taxa de citação e qualidade da atribuição por período. |
| Configurar segmentação de referenciadores de IA no analytics. | Média | Canal separado para `chatgpt.com`, `perplexity.ai`, `copilot.microsoft.com` e fontes observadas. | Sessões, engajamento e conversão por referenciador. |

## Plano de mensuração

A implementação técnica não substitui instrumentação. Antes de definir uma meta numérica, é necessário capturar uma linha de base de quatro semanas. O painel deve separar descoberta orgânica, resposta informacional e conversão de produto para evitar que crescimento de impressões de consultas irrelevantes seja interpretado como sucesso.

| Camada | Fonte de dados | Métricas | Cadência | Decisão suportada |
|---|---|---|---|---|
| Indexação | Google Search Console e Bing Webmaster Tools | URLs válidas, excluídas, sitemap, cobertura e rastreamento. | Semanal. | Corrigir páginas não indexáveis ou descobertas tardiamente. |
| Busca orgânica | Google Search Console e Bing Webmaster Tools | Impressões, cliques, CTR, posição média por página, país e consulta. | Semanal/mensal. | Escolher páginas e clusters a expandir. |
| On-site | Analytics com consentimento LGPD | Sessões orgânicas, visualização de mídia, filtros, retorno ao catálogo, início/conclusão de cadastro. | Semanal. | Avaliar utilidade e conversão do tráfego conquistado. |
| IA/referral | Analytics + logs de borda, quando disponíveis | Sessões por referenciador de IA, landing page, engajamento e conversão. | Mensal. | Distinguir referências reais de IA de tráfego direto/indeterminado. |
| Marca e citação | Monitoramento manual padronizado | Menções, URL citada, fidelidade da descrição e tipo de consulta. | Mensal. | Corrigir lacunas de entidade, fonte ou método. |
| Qualidade técnica | CI/CD e validações de schema | Build, status HTTP, canonical, hreflang, `noindex`, schema válido. | A cada release. | Impedir regressões de SEO. |

### Eventos mínimos recomendados

| Evento | Disparo | Propriedades mínimas | Objetivo |
|---|---|---|---|
| `catalog_view` | Carregamento do catálogo. | `locale`, `landing_source`, `filter_state`. | Medir descoberta do catálogo. |
| `catalog_filter_applied` | Aplicação de filtro ou ordenação. | `locale`, `filter_name`, `filter_value`, `result_count`. | Identificar demanda de navegação e futuras páginas editoriais. |
| `media_view` | Visualização de uma ficha pública. | `locale`, `media_type`, `slug`, `score_confidence`. | Avaliar interesse por entidade e qualidade de landing. |
| `methodology_view` | Visualização da metodologia. | `locale`, `landing_source`. | Medir confiança e intenção informacional. |
| `source_outbound_click` | Clique em fonte externa, caso seja adicionada. | `source_name`, `media_slug`, `locale`. | Medir verificabilidade e utilidade de fontes. |
| `sign_up_started` e `sign_up_completed` | Início e conclusão de cadastro. | `locale`, `plan`, `landing_page`, `channel`. | Relacionar descoberta a conversão, respeitando consentimento. |

## Erros comuns a evitar

| Erro | Risco | Regra adotada |
|---|---|---|
| Bloquear uma URL em `robots.txt` e esperar que o `noindex` seja lido. | A página pode permanecer conhecida sem que o robô leia a meta/header. | Usar `noindex`/`X-Robots-Tag` em superfícies privadas e não inserir essas URLs no sitemap. |
| Inventar `lastModified` diário ou schema de avaliação com contagem fictícia. | Perda de confiança e dados estruturados enganadores. | Datas só quando a fonte tiver data real; não expor `AggregateRating` sem evidência pública adequada. |
| Criar páginas programáticas finas apenas trocando nomes de obras. | Baixo valor, canibalização e possível exclusão por qualidade. | Indexar fichas que tenham sinopse, tipo, gênero, contexto e score explicado. |
| Usar FAQ markup em texto invisível ou repetido em todo o site. | Violação de diretrizes e nenhum ganho sustentável. | FAQ visível, específica e mantida apenas onde ajuda a pessoa usuária. |
| Tratar AIO/GEO como promessa de aparecer em ChatGPT, Gemini ou Copilot. | Métrica impossível de controlar e decisões ruins. | Medir referências observáveis e melhorar evidência/entidade, sem prometer citação. |
| Indexar login, conta, filtros, checkout ou admin. | Tráfego de baixa intenção, exposição de telas internas e desperdício de crawl. | `X-Robots-Tag` e ausência dessas rotas do sitemap. |
| Usar descrição ou página institucional não localizada. | Hreflang inconsistente e experiência ruim em idiomas secundários. | Conteúdo institucional e metadata localizados em `pt-BR`, `en-US` e `es-ES`. |
| Usar um domínio de preview como canônico definitivo após migração. | Sinais divididos e perda de consolidação. | Definir `NEXT_PUBLIC_SITE_URL` com o domínio de produção antes de conectar o domínio final. |

## Próximas etapas recomendadas

1. Configurar `NEXT_PUBLIC_SITE_URL` no ambiente de produção com o domínio canônico definitivo. Enquanto o produto estiver no domínio Vercel, a canonical atual é apropriada; após a migração, o valor deve ser alterado antes do próximo deploy.
2. Cadastrar o domínio em Google Search Console e Bing Webmaster Tools, enviar o sitemap e guardar uma linha de base de quatro semanas.
3. Configurar analytics compatível com LGPD e os eventos mínimos acima, condicionados ao consentimento existente.
4. Validar uma amostra de home, catálogo, três tipos de mídia, metodologia, fontes e uma rota privada no Rich Results Test, Schema Markup Validator e inspeção de URL.
5. Substituir a fonte mockada por uma fonte operacional com datas verificáveis antes de automatizar `lastModified` ou ampliar a indexação programática.
6. Criar uma fila editorial mensal baseada em consultas reais: perguntas sobre score, comparação de obras, fontes, método e tipos de mídia com maior demanda.

## Referências de implementação

As decisões técnicas seguem as orientações oficiais de descoberta, dados estruturados, sitemaps e conteúdo útil do Google e as diretrizes do Bing/Microsoft para busca com IA.

- [Google Search Central — SEO com experiências de IA](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Google Search Central — Versões localizadas e `hreflang`](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Google Search Central — Sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google Search Central — Dados estruturados](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)
- [Bing Webmaster Guidelines](https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a)
- [Microsoft Advertising — otimização para respostas de IA](https://about.ads.microsoft.com/en/blog/post/october-2025/optimizing-your-content-for-inclusion-in-ai-search-answers)
