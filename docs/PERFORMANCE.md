# PERFORMANCE — Orçamentos e estado

## Orçamentos (alvo do projeto)

| Superfície | Alvo | Estado medido |
|---|---|---|
| API discover (p95) | < 200ms | **14ms** local (T027) |
| API search (p95) | < 200ms | **22ms** local (T027) |
| API geral | `responseTime` por request no log (pino) | monitorável via `/metrics` histograma |
| Web LCP/TTFB | Lighthouse mobile "good" | relatórios em `docs/lighthouse-reports/` (baseline Vercel × canário S1) |
| Bundle | sem regressão por PR | prova em `docs/T405-U3-BUNDLE-PROVA.md` |

## O que sustenta esses números (não quebre)

**API**
- Índices **trgm GIN** na busca + tsvector com `translate()` IMMUTABLE (D-224).
- Cache Redis 30-60s (`midias:*` por URL-hash; discover anônimo 30s — **nunca**
  cacheia flag `na_watchlist` entre usuários, T210).
- Cursor pagination (offset codificado; sem `COUNT(*)` extra por página quando
  evitável — envelope `/interacoes` calcula `total` uma vez por request).

**Web/imagens (Fase 10, D-439)**
- Upload gera **variantes sharp** (backfill do acervo remoto feito).
- Tokens `deviceSizes/imageSizes` fixos (srcset 11→8); `unoptimized`/`quality`
  padronizados; ladders remotas nativas + `<img>` estático com bypass quando
  cabe (T036).
- Cota de Image Transformations mitigada por **robots por bot** (T030/D-440) —
  crawlers não consomem otimizador.

**Carga**: metodologia e resultados em `docs/LOAD_TESTING.md`.

## Regras

1. Endpoint novo lista no `rate-limit.config.ts` (proteção de custo, não só SEO).
2. Query nova em tabela de usuário: conferir índice (FK + colunas de filtro/sort).
3. N+1: `include` do Prisma ou agrupamento — revisar em review quando surgir loop
   com await.
4. Mudança em imagem/CDN: atualizar `docs/pr-fase-10-image-optimization.md`
   e o runbook de uso (T033).
5. Regressão suspeita: reproduzir com `curl -w '%{time_total}'` + ver
   `responseTime` nos logs antes de otimizar às cegas.
