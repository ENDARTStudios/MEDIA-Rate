# SEO — Busca orgânica (estado e instruções)

Aprofundamento: [`SEO_AEO_AIO_GEO.md`](SEO_AEO_AIO_GEO.md) (estratégia integrada).
Frentes de IA: [AEO](AEO.md) · [GEO](GEO.md) · [AIO](AIO.md).

## O que já está implementado (verificável no código)

- **`app/robots.ts`** (T030/D-440): bots por grupo — **A (treino de IA: GPTBot,
  CCBot, ClaudeBot, Google-Extended, Bytespider…): Disallow total**; **B (busca com
  IA: PerplexityBot, Amazonbot, YouBot, cohere-ai): navegam, mas sem
  `/_next/image`/`/_vercel/image` nem API**; buscadores clássicos sem bloqueio de
  imagem; regra genérica allow `/` · disallow `/api/`.
- **`app/sitemap.ts`**: rotas públicas (home, `/catalog`, `/pricing`, `/about`,
  `/methodology`, `/sources`, `/faq`, `/privacy`, `/terms`) + slugs de mídia via
  `listMediaSlugs()`, com `localizedAlternates` (hreflang por locale).
- **Previews não indexáveis**: `noindex` via `VERCEL_ENV` em previews da Vercel
  (T030) — produção indexável.
- **Metadados por obra**: `lib/detail-metadata.ts` + `lib/seo.ts`.

## Regras executáveis

1. **Uma URL canônica por conteúdo**; páginas de app (dashboard/biblioteca/watchlist)
   NÃO entram em sitemap nem recebem URL indexável.
2. Filtros de catálogo com query (`?tipo=`) **não geram URL indexável** até terem
   demanda comprovada + copy exclusiva + canonical próprio.
3. Título e descrição **únicos por página de obra** (cluster de consulta, não
   templated genérico).
4. Mudou rota pública? Atualize `sitemap.ts` **no mesmo PR**.
5. Nunca bloquear imagem para Googlebot/Bingbot (cota de Image Transformations é
   mitigada pelos grupos A/B, não por bloquear busca clássica).

## Mensuração

- Enviar/monitorar `/sitemap.xml` no **Google Search Console + Bing Webmaster Tools**
  (aceite sem erros; URLs descobertas vs indexadas).
- Exclusões (canonical/noindex/soft 404): revisão semanal enquanto Beta.
- CTR/posição por página de obra — guiar rewrites de título por DADO, não suposição.
