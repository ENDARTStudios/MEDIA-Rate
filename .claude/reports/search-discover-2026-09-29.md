# BETA-GAP-12 / T126 — Busca e descoberta conservadoras (descoberta + decisão)

**Data:** 2026-09-28 · **Branch:** `feat/t126-beta-gap-12-search-discover` (de `origin/main` `82e77b58`)
**Regra:** dados reais persistidos; sem IA/provider/scraping; input validado; sem invenção.

## 1. Descoberta (read-only) — o recurso JÁ EXISTE e é sólido

| Área | Evidência |
|---|---|
| Endpoints | `apps/api/src/modules/discover/discover.controller.ts:52-95` — `GET /api/v1/search`, `/discover`, `/catalog`, `/trending`. |
| Validação | Zod (`search-query.dto.ts` + schemas inline): `q` trim/max 200, `tipo` enum, `genero`, `cursor` UUID, `limit` ≤50. |
| Algoritmo | `discover.service.ts`: `q≥3` → `to_tsquery` com prefixo (`m.titulo_tsv`/`m.sinopse_tsv`); `q<3` → pg_trgm (`%`/`similarity`); `q` vazio → catálogo por score. Ordenação determinística (rank DESC, id ASC). |
| Segurança | 100% `Prisma.sql` parametrizado; tokens de tsquery sanitizados (`montarTsqueryPrefixo`); `deleted_at IS NULL`. |
| Paginação | keyset por cursor (UUID) — `proximo_cursor`/`total_estimado`. |
| Rate limit | `discoverRateLimit()` (30/min) **aplicado** em `main.ts:246-252` para `/discover` e `/search`. |
| Cache | 30s anônimo no `/discover` (nunca compartilha `na_watchlist` de usuário). |
| Testes | `discover-service.spec.ts` (24): acentos `acao≡ação`, sanitização de operadores tsquery, cursor, watchlist parametrizada, `na_watchlist` por usuário, trending, saída sanitizada. |
| Web | Busca via `SearchCommand` (Ctrl+K) e `getCatalog` (usa `/api/v1/search`); **não há rota `/search` de página** — busca integrada ao catálogo (alinhado à diretriz do packet). |

## 2. Achado corrigido (link errado → BROKEN_LINK)

`discover()` montava o `slug` do resultado com `slugify(titulo)` — **não** o slug
canônico persistido. O web linka `/media/{slug}` (ex.: `SearchCommand` usa
`item.slug`); em títulos **desambiguados por tipo** (ex.: livro "Duna" →
canônico `duna-livro`, `slugify` = `duna`) o link podia dar **404/mídia errada**
(mesma classe do BETA-GAP-07).

**Correção mínima:** `discover.service.ts` passa a selecionar `m.slug` e retornar
`slug: r.slug?.trim() || slugify(titulo)` (fallback retrocompatível). `/search`
(legado) delega ao `discover` e herda o fix. Sem schema, sem migration, sem
contrato novo (mesmo campo, valor correto).

## 3. Decisão técnica

- Solução menos destrutiva: **estender o endpoint existente** (não criar rota).
- **Busca básica/full-text já é full-text** (tsvector + pg_trgm) — não é
  `PARTIAL_SEARCH_BASIC_MVP`; o índice já existe (migrações `*_search_vector`).
- Sem IA, sem personalização inventada, sem provider externo → **DONE**.

## 4. Testes

- API `discover-service.spec.ts` → **27/27** (3 novos T126):
  - `discover` retorna o **slug canônico** (`duna-livro`, não `duna`);
  - `/search` legado propaga o slug canônico;
  - fallback `slugify` quando o servidor não tem slug (compat).
- Regressão: `discover-controller.spec` + `discover.e2e.spec` + `discovery.service.spec` → **50/50**.
- **Vermelho evidenciado:** antes do fix o serviço usava `slugify(titulo)`; o teste do slug canônico falharia.
- `tsc -p apps/api` = 0; eslint/prettier = 0.
- E2E de UI de busca já existe (`apps/web/e2e/search.spec.ts`); mudança é backend-only (web é pass-through do `slug`).

## 5. PR / merge / smoke (preenchido após merge)

- Commit: `(a preencher)` · PR: `(a preencher)` · merge: `(a preencher)`
- Required: `(a preencher)` · `123ce28e`: `(a preencher)` · Smoke 7/7: `(a preencher)`
