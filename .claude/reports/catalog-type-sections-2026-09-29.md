# BETA-GAP-11 / T128 — Seções por tipo no catálogo (descoberta + decisão)

**Data:** 2026-09-28 · **Branch:** `feat/t128-beta-gap-11-catalog-type-sections` (de `origin/main` `f8f76c52`)
**Regra:** só dados reais; sem curadoria/destaque/IA inventados; web-only.

## 1. Descoberta (read-only)

| Área | Evidência |
|---|---|
| Filtro por tipo (já existia) | `CatalogTypeBar.tsx` — chips por tipo com **contagem real** (`getCatalog({type, limit:1}).total`) e `?type=` na URL. |
| Grid principal | `CatalogPageClient` → `CatalogContent` (grid filtrado) + `CatalogFiltersClient` (sidebar). |
| **Ausência** | Não havia **seções/rows por tipo** no catálogo (só a barra de chips + grid filtrado). Os carrosséis por tipo existem apenas na **home** (`MediaCarousel`). |
| API (não alterada) | `GET /api/v1/midias?tipo&limit` (enum API `FILME/SERIE/...`), retorna `data[]` + `total` + slug canônico. |
| Slug | Backend já retorna `slug` canônico (correções BETA-GAP-07/12); o card usa esse slug. |

## 2. Entrega

**Novo:** `apps/web/src/components/CatalogTypeSections.tsx` + `apps/web/src/lib/catalog-item.ts`
(mapper `mapToMediaItem` extraído do `CatalogPageClient` — fonte única grid×seções).

- Exibe **rows por tipo** na ordem determinística dos ícones (`movie, series, game,
  book, comic, manga` — T185), cada uma com **heading** acessível (`aria-labelledby`)
  + link **"Ver todos"** → `/catalog?type=<tipo>` (preserva locale via `@/lib/navigation`).
- Só tipos com **itens reais** (contagem > 0); **seção vazia é omitida** (nunca
  header sem itens). Limite explícito de 8 itens por row.
- **Some na visão filtrada** (`?type=`) para não duplicar o grid principal.
- Cards usam o **slug canônico** retornado pela API (não `slugify`).
- Estados honestos: loading (`loadingCatalog`) enquanto busca; erro/empty →
  sem seção; sem cards falsos. Sem contagem por faceta inventada.
- i18n: rótulos de tipo reutilizam `catalog.{filme,serie,game,livro,comic,manga}`;
  novo `catalog.seeAll` em pt-BR/en-US/es-ES.

## 3. Testes

- `apps/web/test/catalog-type-sections.spec.tsx` (4): só tipos com itens; tipo
  vazio omitido; **"Ver todos" href** = `/catalog?type=movie`; some com `?type=`;
  `mapToMediaItem` preserva **slug canônico** (`duna-livro`).
- `apps/web/e2e/catalog-type-sections.spec.ts` (novo, contract mock): desktop —
  seção real visível + fixture consumido (`Filme Fixture`) + "Ver todos" navega e
  as seções somem no modo filtrado; mobile 390x844 sem overflow; 3 locales sem
  chave i18n crua. `sections_mode=contract_mock`.
- **Vermelho evidenciado:** sem o componente não há `catalog-type-sections`
  (E2E) nem link "Ver todos" (unit).
- Suíte web **443/443**; `tsc` web 0; eslint/prettier 0.

## 4. Lacunas honestas

- O `tipo` do backend usa enum (`FILME/…`); a UI usa slugs (`movie/…`) — mapeamento
  já existente (`TIPO_TO_API`), reutilizado.
- Sem dados no ambiente E2E web-only → E2E usa **contract mock** (shape real);
  a cobertura de dados reais persistidos é garantida pelos testes de API do
  `/midias` e pelo smoke de produção.

## 5. PR / merge / smoke (preenchido após merge)

- Commit: `(a preencher)` · PR: `(a preencher)` · merge: `(a preencher)`
- Required: `(a preencher)` · `123ce28e`: `(a preencher)` · Smoke 7/7: `(a preencher)`
