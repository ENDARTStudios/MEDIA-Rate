# AIO — AI Optimization (guarda-chuva: presença em respostas de IA)

AIO cobre **como o produto aparece (ou não) em superfícies de IA** — AI Overviews,
assistentes, busca generativa — englobando [AEO](AEO.md) (respostas extraíveis) e
[GEO](GEO.md) (citação por geradores). Estratégia-mãe: [`SEO_AEO_AIO_GEO.md`](SEO_AEO_AIO_GEO.md).

## O que o projeto já faz (e por quê)

1. **Controle de superfície via robots** (`app/robots.ts`, T030/D-440): treino de IA
   **não** varre o site (Grupo A: Disallow) e busca com IA (Grupo B) navega sem
   onerar o otimizador de imagens. AIO aqui é uma decisão deliberada de
   custo/qualidade, não maximalismo de exposição.
2. **Conteúdo citável de verdade**: metodologia/fontes/sobre estáveis + JSON-LD
   só com fato visível (ver [GEO](GEO.md)).
3. **Segmentação de referenciadores de IA no analytics**: canal separado para
   `chatgpt.com`, `perplexity.ai`, `copilot.microsoft.com` e fontes observadas —
   sessões/engajamento/conversão por referenciador (config PostHog — [ANALYTICS](ANALYTICS.md)).

## Instruções operacionais

1. **Monitoramento por amostra** (mensal na Beta): conjunto fixo de prompts
   ("melhor filme 2026 segundo MEDIA Rate", "como funciona o MEDIA Score"…),
   registrando data + prompt + resposta + URL citada (planilha; ver [GEO](GEO.md)).
2. **Referenciadores**: ao observar nova fonte de IA com tráfego, adicionar ao
   segmento no PostHog (e NÃO ao Grupo A do robots — tráfego de resposta é desejado;
   treino não).
3. **Mudança de política de bots** (robots.ts) é decisão registrada (D-440): qualquer
   revisão vira entrada em `DECISOES.md` com o motivo de custo/cota.
4. Não criar páginas/prompt-bait: o critério de sucesso é **citação correta do
   método**, não volume de menção.

## Métricas

- Taxa de citação (URLs citadas / prompts da amostra) e **qualidade da atribuição**
  (o método foi descrito certo?).
- Sessões e conversões vindas de referenciadores de IA (segmento dedicado).
